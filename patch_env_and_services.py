import os
import re

def update_env_ts():
    filepath = "src/lib/config/env.ts"
    if not os.path.exists(filepath):
        print(f"{filepath} not found")
        return

    new_content = """export const getEnvVar = (key: string, defaultValue: string = ''): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  // @ts-ignore - Vite compatibility
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key] as string;
  }
  return defaultValue;
};

export const config = {
  liveMode: getEnvVar('VITE_LIVE_MODE', 'false') === 'true',
  liveGitlabMode: getEnvVar('VITE_LIVE_GITLAB_MODE', 'false') === 'true',
  targetAppBaseUrl: getEnvVar('VITE_TARGET_APP_BASE_URL', 'http://localhost:3000'),

  // Gemini
  geminiApiKey: getEnvVar('VITE_GEMINI_API_KEY'),

  // Browserbase
  browserbaseApiKey: getEnvVar('VITE_BROWSERBASE_API_KEY'),
  browserbaseProjectId: getEnvVar('VITE_BROWSERBASE_PROJECT_ID'),

  // GitLab
  gitlabUrl: getEnvVar('VITE_GITLAB_URL', 'https://gitlab.com'),
  gitlabToken: getEnvVar('VITE_GITLAB_TOKEN'),
  gitlabProjectId: getEnvVar('VITE_GITLAB_PROJECT_ID'),
};
"""
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"Updated {filepath}")


def update_workflow_agent_sender():
    filepath = "src/lib/workflows/codeFix.workflow.ts"
    with open(filepath, 'r') as f:
        content = f.read()

    # Fix sender: "memory_engine" -> "system"
    content = content.replace('sender: "memory_engine"', 'sender: "system"')
    # Fix type error: length does not exist on TaskArtifact
    content = content.replace('visionAnalysis?.length', 'visionAnalysis?.content?.length')

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Fixed types in {filepath}")

def update_workflow_run_service():
    filepath = "src/lib/workflows/verificationPreparation.workflow.ts"
    with open(filepath, 'r') as f:
        content = f.read()

    # runService.updateAgentRunProgress(runId, 6, "completed") expects (runId: string, completedSteps: number, currentStep?: string, status?: AgentRun['status'])
    # Replace runService.updateAgentRunProgress(runId, 'completed') -> runService.updateAgentRunProgress(runId, 6, 'Verification completed.', 'completed')

    # Let's fix it safely:
    content = content.replace("await runService.updateAgentRunProgress(runId, 'completed');", "await runService.updateAgentRunProgress(runId, 6, 'Completed', 'completed');")

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Fixed runService in {filepath}")

update_env_ts()
update_workflow_agent_sender()
update_workflow_run_service()
