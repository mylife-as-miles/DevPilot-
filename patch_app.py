import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Add new imports
if "runVerificationPreparationWorkflow" not in content:
    content = content.replace("import { runUiInspectionWorkflow } from \"./lib/workflows/uiInspection.workflow\";", "import { runUiInspectionWorkflow } from \"./lib/workflows/uiInspection.workflow\";\nimport { runVerificationPreparationWorkflow } from \"./lib/workflows/verificationPreparation.workflow\";\nimport { patchProposalService } from \"./lib/services/patchProposal.service\";")

# Fetch patch proposals
if "const latestProposal = useLiveQuery" not in content:
    content = content.replace("const runSteps = useLiveQuery(() => run ? runService.getRunStepsByRunId(run.id) : [], [run?.id]);", "const runSteps = useLiveQuery(() => run ? runService.getRunStepsByRunId(run.id) : [], [run?.id]);\n  const latestProposal = useLiveQuery(() => patchProposalService.getLatestProposalForTask(taskId), [taskId]);\n  const patchFiles = useLiveQuery(() => latestProposal ? patchProposalService.getPatchFilesForProposal(latestProposal.id) : [], [latestProposal?.id]);")

# Update handleApprove
old_handle = """  const handleApprove = async () => {
    await taskService.appendAgentMessage({
      taskId,
      sender: 'system',
      content: 'Changes approved and merged.',
      kind: 'success',
      timestamp: Date.now()
    });

    await runService.createAgentEvent({
      taskId,
      source: "ui_agent",
      type: "STATUS_CHANGED",
      title: "Task Approved",
      description: "User approved the generated patch.",
      metadata: JSON.stringify({ action: "approve" }),
      timestamp: Date.now()
    });

    await taskService.updateTaskStatus(taskId, 'merged');"""

new_handle = """  const handleApprove = async () => {
    if (config.liveMode && latestProposal && latestProposal.status === 'ready_for_review') {
      runVerificationPreparationWorkflow(taskId, latestProposal.id);
    } else {
      await taskService.appendAgentMessage({
        taskId,
        sender: 'system',
        content: 'Changes approved and merged.',
        kind: 'success',
        timestamp: Date.now()
      });

      await runService.createAgentEvent({
        taskId,
        source: "ui_agent",
        type: "STATUS_CHANGED",
        title: "Task Approved",
        description: "User approved the generated patch.",
        metadata: JSON.stringify({ action: "approve" }),
        timestamp: Date.now()
      });

      await taskService.updateTaskStatus(taskId, 'merged');
    }"""

content = content.replace(old_handle, new_handle)

# Update diff UI renderer
diff_old = """                    codeTab === 'diff' ? (
                      <div>
                        {currentArtifact.content.split('\\n').map((line, i) => {"""
diff_new = """                    codeTab === 'diff' ? (
                      <div>
                        {(patchFiles && patchFiles.length > 0 ? patchFiles.map(f => f.patch).join('\\n\\n') : currentArtifact.content).split('\\n').map((line, i) => {"""

content = content.replace(diff_old, diff_new)

with open("src/App.tsx", "w") as f:
    f.write(content)
