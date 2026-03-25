import { codeAgentAdapter } from "../adapters/codeAgent.adapter";
import { gitlabDuoAdapter } from "../adapters/gitlabDuo.adapter";
import { gitlabRepositoryAdapter } from "../adapters/gitlabRepository.adapter";
import { db } from "../db";
import { taskService, patchProposalService } from "../services";
import { runService } from "../services/run.service";
import { countDiffStats } from "../utils/diff";
import { NormalizedFixRecommendation } from "../../types";

export const runExecuteCodeFixWorkflow = async (taskId: string, proposalId: string) => {
    const task = await taskService.getTaskById(taskId);
    const run = await taskService.getActiveAgentRun(taskId);

    if (!task || !run) {
        return;
    }

    // Set the task codeFixStatus back to running
    await taskService.updateTask(taskId, { codeFixStatus: "running" });
    await taskService.appendAgentMessage({
        taskId,
        sender: "system",
        content: "Plan approved. Starting code patch generation.",
        kind: "thinking",
        timestamp: Date.now(),
    });

    const proposal = await patchProposalService.getPatchProposalById(proposalId);
    if (!proposal || proposal.status !== "draft") {
        throw new Error("Invalid proposal or not in draft state.");
    }

    const workflowSteps = [
        {
            key: "prepare_patch",
            label: "Prepare Patch",
            detail: "Generating updated file contents based on approved plan...",
        },
        {
            key: "ready_for_review",
            label: "Ready for Review",
            detail: "Patch proposal generated and ready for review.",
        },
    ];

    const startIndex = run.completedSteps || 0;
    const stepRecords = await Promise.all(
        workflowSteps.map((step, index) =>
            runService.createRunStep({
                runId: run.id,
                taskId,
                order: startIndex + index + 1,
                key: step.key,
                label: step.label,
                status: "pending",
                detail: step.detail,
                phase: "code_fix",
            }),
        ),
    );

    const completeStep = async (index: number, detail: string) => {
        await runService.updateRunStepStatus(stepRecords[index], "completed", detail);
        await runService.updateAgentRunProgress(
            run.id,
            startIndex + index + 1,
            workflowSteps[index + 1]?.detail || "Waiting for review.",
        );
    };

    try {
        await gitlabDuoAdapter.invokeAgent(
            taskId,
            "prepare_patch_proposal",
            "code_fixer",
        );
        await runService.updateRunStepStatus(
            stepRecords[0],
            "running",
            "Fetching candidate file contents from GitLab...",
        );

        const fileResults = await Promise.all(
            proposal.suspectedFiles.map((filePath) =>
                gitlabRepositoryAdapter.getFileContent(
                    filePath,
                    task.gitlabProjectId,
                    task.branch || task.defaultBranch
                ),
            ),
        );

        const files = fileResults
            .filter((result): result is typeof result & { data: NonNullable<typeof result.data> } =>
                result.success && !!result.data,
            )
            .map((result) => result.data);

        if (files.length === 0) {
            throw new Error("Unable to load the selected repository files for patch generation.");
        }

        const recommendation: NormalizedFixRecommendation = {
            taskId,
            issueType: "approved_plan",
            suspectedComponent: "unknown",
            suspectedFiles: proposal.suspectedFiles,
            explanation: proposal.explanation,
            recommendedFix: proposal.recommendedStrategy,
            evidence: [],
            tags: [],
            securityAuditFaults: proposal.securityAuditFaults,
            complianceChecks: proposal.complianceChecks,
            confidence: proposal.confidence,
            sourceArtifactIds: [],
        };

        // Generate the code patch
        const { proposal: generatedProposal, files: patchFiles } = await codeAgentAdapter.proposePatch({
            taskId,
            recommendation,
            files,
        });

        // Update existing proposal by generating the patch files and changing status
        await patchProposalService.updatePatchProposalStatus(proposalId, "ready_for_review");

        // Use the new proposal's title and summary over the original draft ones, as the AI has expanded on it
        await db.patchProposals.update(proposalId, {
            title: generatedProposal.title,
            summary: generatedProposal.summary
        });

        for (const file of patchFiles) {
            await patchProposalService.createPatchFile({ ...file, proposalId });
        }

        const combinedDiff = patchFiles.map((file) => file.patch).join("\n\n");
        const diffStats = patchFiles.reduce(
            (totals, file) => {
                const stats = countDiffStats(file.patch);
                totals.additions += stats.additions;
                totals.deletions += stats.deletions;
                return totals;
            },
            { additions: 0, deletions: 0 },
        );

        await taskService.updateTaskArtifact(taskId, "diff", combinedDiff);
        await taskService.updateTaskDiffStats(
            taskId,
            diffStats.additions,
            diffStats.deletions,
        );
        await completeStep(0, "Patch proposal generated.");

        await runService.updateRunStepStatus(
            stepRecords[1],
            "running",
            "Waiting for human approval of the final code diff.",
        );
        await taskService.updateTask(taskId, { codeFixStatus: "ready_for_review" });
        await taskService.appendAgentMessage({
            taskId,
            sender: "devpilot",
            content: "Code modifications are complete. Patch is ready for review.",
            kind: "success",
            timestamp: Date.now(),
        });
        await completeStep(1, "Ready for review.");
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await taskService.updateTask(taskId, { codeFixStatus: "failed" });
        await taskService.appendAgentMessage({
            taskId,
            sender: "system",
            content: `Code execution workflow failed: ${message}`,
            kind: "warning",
            timestamp: Date.now(),
        });
    }
};
