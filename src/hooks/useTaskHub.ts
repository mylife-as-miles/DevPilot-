import { useState, useEffect, useCallback } from "react";
import { sandboxAdapter } from "../lib/adapters/sandbox.adapter";
import { gitlabRepositoryAdapter } from "../lib/adapters/gitlabRepository.adapter";
import { gitlabDuoAdapter } from "../lib/adapters/gitlabDuo.adapter";
import { config } from "../lib/config/env";
import { initializeDb } from "../lib/seeds";
import {
    taskService,
    runService,
} from "../lib/services";
import { devpilotFlow } from "../lib/gitlab-duo/flows/devpilot.flow";
import {
    GitLabBranchSummary,
    GitLabProjectSummary,
    Task,
} from "../types";

export interface UserConfig {
    targetAppBaseUrl: string;
    gitlabDefaultBranch: string;
}

export interface IntegrationState {
    loading: boolean;
    ready: boolean;
    issues: string[];
    project?: GitLabProjectSummary;
    branches: GitLabBranchSummary[];
    availableProjects: GitLabProjectSummary[];
}

const CONFIG_STORAGE_KEY = "devpilot_user_config";

export const useTaskHub = () => {
    const [integrationState, setIntegrationState] = useState<IntegrationState>({
        loading: true,
        ready: false,
        issues: [],
        branches: [],
        availableProjects: [],
    });
    const [selectedProjectId, setSelectedProjectId] = useState<string | number>(config.gitlabProjectId || "");
    const [selectedBranch, setSelectedBranch] = useState("");
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [dashboardError, setDashboardError] = useState<string | null>(null);

    const [userConfig, setUserConfig] = useState<UserConfig>(() => {
        const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse user config", e);
            }
        }
        return {
            targetAppBaseUrl: config.targetAppBaseUrl || "",
            gitlabDefaultBranch: config.gitlabDefaultBranch || "main",
        };
    });

    useEffect(() => {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(userConfig));
    }, [userConfig]);

    const loadIntegrationState = useCallback(async () => {
        setIntegrationState((current) => ({ ...current, loading: true, issues: [] }));
        await initializeDb();

        const issues: string[] = [];
        let project: GitLabProjectSummary | undefined;
        let branches: GitLabBranchSummary[] = [];

        if (!config.isGitLabConfigured) {
            issues.push("GitLab token is not configured. Set VITE_LIVE_REPOSITORY_MODE=true and VITE_GITLAB_TOKEN.");
        }

        if (!config.isGeminiConfigured) {
            issues.push("Gemini is not configured. Set VITE_LIVE_MODE=true and VITE_GEMINI_API_KEY.");
        }

        if (!config.isSandboxConfigured) {
            issues.push("Sandbox URL is not configured. Set VITE_SANDBOX_URL.");
        }

        if (config.isSandboxConfigured) {
            try {
                const sandboxHealthy = await sandboxAdapter.checkHealth();
                if (!sandboxHealthy) {
                    issues.push(`Sandbox health check failed at ${config.sandboxUrl}. Start devpilot-sandbox before running tasks.`);
                }
            } catch (error) {
                issues.push(`Sandbox is unreachable at ${config.sandboxUrl}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        if (!userConfig.targetAppBaseUrl) {
            issues.push("Target application URL is not configured. Set it in Settings.");
        }

        let availableProjects: GitLabProjectSummary[] = [];

        if (config.isGitLabConfigured) {
            const projectsResult = await gitlabRepositoryAdapter.listProjects();
            if (projectsResult.success && projectsResult.data) {
                availableProjects = projectsResult.data;
                const currentId = selectedProjectId || config.gitlabProjectId || availableProjects[0]?.id;

                if (currentId) {
                    const [projectResult, branchResult] = await Promise.all([
                        gitlabRepositoryAdapter.getProject(String(currentId)),
                        gitlabRepositoryAdapter.listBranches(String(currentId)),
                    ]);

                    if (projectResult.success && projectResult.data) {
                        project = projectResult.data;
                        if (!selectedProjectId) setSelectedProjectId(project.id);
                    }
                    if (branchResult.success && branchResult.data) {
                        branches = branchResult.data;
                    }
                }
            } else {
                issues.push(projectsResult.error || "Failed to load GitLab projects.");
            }
        }

        if (config.isGitLabConfigured && !project) {
            issues.push("No GitLab project selected. Please choose a project from the dropdown.");
        }

        setIntegrationState({
            loading: false,
            ready: issues.length === 0 && !!project && branches.length > 0 && !!userConfig.targetAppBaseUrl,
            issues,
            project,
            branches,
            availableProjects,
        });
    }, [selectedProjectId, userConfig.targetAppBaseUrl]);

    const handleProjectChange = async (projectId: string | number) => {
        setSelectedProjectId(projectId);
        setIntegrationState(prev => ({ ...prev, loading: true }));

        const [projectResult, branchResult] = await Promise.all([
            gitlabRepositoryAdapter.getProject(String(projectId)),
            gitlabRepositoryAdapter.listBranches(String(projectId)),
        ]);

        setIntegrationState(prev => {
            const newIssues = prev.issues.filter(i => !i.includes("project"));
            const ready = newIssues.length === 0 && !!projectResult.data && !!branchResult.data;

            return {
                ...prev,
                loading: false,
                ready,
                issues: newIssues,
                project: projectResult.data || prev.project,
                branches: branchResult.data || [],
            };
        });
    };

    useEffect(() => {
        void loadIntegrationState();
    }, [loadIntegrationState]);

    useEffect(() => {
        if (!integrationState.project) {
            setSelectedBranch("");
            return;
        }

        setSelectedBranch((currentBranch) => {
            if (currentBranch && integrationState.branches.some((branch) => branch.name === currentBranch)) {
                return currentBranch;
            }
            return (
                integrationState.branches.find((branch) => branch.isDefault)?.name ||
                integrationState.project?.defaultBranch ||
                integrationState.branches[0]?.name ||
                ""
            );
        });
    }, [integrationState.branches, integrationState.project]);

    const createTask = async (prompt: string) => {
        if (!integrationState.ready || !integrationState.project || !selectedBranch) return null;

        setDashboardError(null);
        setIsCreatingTask(true);

        const now = Date.now();
        const taskId = crypto.randomUUID();

        try {
            await taskService.createTask({
                id: taskId,
                title: prompt.slice(0, 50) + (prompt.length > 50 ? "..." : ""),
                prompt: prompt.trim(),
                repo: integrationState.project.pathWithNamespace,
                repoName: integrationState.project.name,
                repoPath: integrationState.project.pathWithNamespace,
                branch: selectedBranch,
                baseBranch: selectedBranch,
                targetBranch: userConfig.gitlabDefaultBranch,
                defaultBranch: integrationState.project.defaultBranch,
                gitlabProjectId: String(integrationState.project.id),
                gitlabProjectWebUrl: integrationState.project.webUrl,
                status: "running",
                category: "tasks",
                createdAt: now,
                updatedAt: now,
                plusCount: 0,
                minusCount: 0,
                targetUrl: userConfig.targetAppBaseUrl,
                viewportPreset: "desktop",
                inspectionStatus: "idle",
                codeFixStatus: "idle",
            });

            await runService.createAgentRun({
                id: crypto.randomUUID(),
                taskId,
                status: "running",
                currentStep: "Waiting to start UI inspection...",
                startedAt: now,
                updatedAt: now,
                progress: 0,
                totalSteps: 19,
                completedSteps: 0,
                mode: "live",
                phase: "inspection",
            });

            await gitlabDuoAdapter.initializeFlowRun(taskId, devpilotFlow.id);
            await taskService.appendAgentMessage({
                taskId,
                sender: "system",
                content: `Created live task for ${integrationState.project.pathWithNamespace}@${selectedBranch}. Target URL: ${userConfig.targetAppBaseUrl}`,
                kind: "info",
                timestamp: now,
            });

            return taskId;
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : String(error));
            return null;
        } finally {
            setIsCreatingTask(false);
        }
    };

    return {
        integrationState,
        selectedBranch,
        setSelectedBranch,
        isCreatingTask,
        dashboardError,
        userConfig,
        setUserConfig,
        createTask,
        handleProjectChange,
        refreshIntegration: loadIntegrationState,
    };
};
