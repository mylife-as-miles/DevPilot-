import re

def patch_codefix():
    filepath = "src/lib/workflows/codeFix.workflow.ts"
    with open(filepath, 'r') as f:
        content = f.read()

    # error TS2339: Property 'length' does not exist on type 'TaskArtifact'.
    # 64:    if (visionArtifacts && visionArtifacts.length > 0) {
    # It seems visionArtifacts is not an array, but a single TaskArtifact. Let's check how it's retrieved.
    # Actually wait, I should replace visionArtifacts.length with visionArtifacts?.content?.length or just check if it exists
    content = content.replace("visionArtifacts && visionArtifacts.length > 0", "visionArtifacts && visionArtifacts.content")

    # error TS2322: Type '"memory_engine"' is not assignable
    # 87:        sender: 'memory_engine',
    content = content.replace("sender: 'memory_engine',", "sender: 'system',")

    with open(filepath, 'w') as f:
        f.write(content)

def patch_verification():
    filepath = "src/lib/workflows/verificationPreparation.workflow.ts"
    with open(filepath, 'r') as f:
        content = f.read()

    # error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
    # 26:    await runService.updateAgentRunProgress(run.id, 'completed');
    # runService.updateAgentRunProgress(runId, completedSteps, currentStep, status)

    content = content.replace("await runService.updateAgentRunProgress(run.id, 'completed');", "")

    # 25: await runService.updateAgentRunProgress(run.id, run.totalSteps, "Completed");
    # Let's add 'completed' status to it
    content = content.replace('await runService.updateAgentRunProgress(run.id, run.totalSteps, "Completed");', 'await runService.updateAgentRunProgress(run.id, run.totalSteps, "Completed", "completed");')

    with open(filepath, 'w') as f:
        f.write(content)

patch_codefix()
patch_verification()
