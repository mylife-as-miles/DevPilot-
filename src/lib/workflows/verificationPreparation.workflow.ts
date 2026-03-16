import { taskService, patchProposalService } from '../services';
import { runService } from '../services/run.service';
import { gitlabRepositoryAdapter } from '../adapters/gitlabRepository.adapter';
import { runPostFixVerificationWorkflow } from './postFixVerification.workflow';
import { gitlabDuoAdapter } from '../adapters/gitlabDuo.adapter';

export const runVerificationPreparationWorkflow = async (taskId: string, proposalId: string) => {
  const task = await taskService.getTaskById(taskId);
  const run = await taskService.getActiveAgentRun(taskId);
  if (!task || !run) return;

  // 1. Mark workflow started
  await taskService.updateTask(taskId, { codeFixStatus: 'applied' });
  // Update GitLab Duo flow state
  await gitlabDuoAdapter.invokeAgent(taskId, 'handoff_to_gitlab', 'system');

  await taskService.appendAgentMessage({
    taskId,
    sender: 'system',
    content: `Approval received. Preparing GitLab handoff...`,
    kind: 'thinking',
    timestamp: Date.now()
  });

  // Handoff to GitLab using Implementation 8 granular methods
  try {
    const branchName = `fix/agent-${taskId.slice(0, 4)}-${Date.now().toString().slice(-4)}`;

    // Step A: Create Branch
    const branchResult = await gitlabRepositoryAdapter.createBranch(branchName);
    if (!branchResult.success) throw new Error("Failed to create branch");

    // Step B: Get Patch Files
    const patchFiles = await patchProposalService.getPatchFilesForProposal(proposalId);
    const gitlabFiles = patchFiles.map(f => ({
      filePath: f.filePath,
      content: f.patch,
      action: f.changeType as any
    }));

    // Step C: Apply Patch
    const commitResult = await gitlabRepositoryAdapter.applyPatch(branchName, gitlabFiles, `Fix for ${taskId} approved by user.`);
    if (!commitResult.success) throw new Error("Failed to apply patch");

    // Step D: Create MR
    const mrResult = await gitlabRepositoryAdapter.createMergeRequest(
      branchName,
      `[DevPilot] Fix for ${task.title}`,
      `Approved patches for task ${taskId}`
    );

    if (mrResult.success && mrResult.data) {
      await taskService.updateTask(taskId, { status: 'merged' });
      await runService.updateAgentRunProgress(run.id, run.totalSteps, "Completed", "completed");

      await taskService.updateTaskArtifact(taskId, 'log', mrResult.logs.join('\n'));
      await runService.createAgentEvent({
        taskId,
        source: "orchestrator",
        type: "ARTIFACT_UPDATED",
        title: "GitLab Hand-Off Complete",
        description: `Created branch and MR successfully.`,
        metadata: JSON.stringify({ mrIid: mrResult.data.mergeRequestIid }),
        timestamp: Date.now()
      });

      // Mark patch proposal as applied
      await patchProposalService.updatePatchProposalStatus(proposalId, 'applied');

      // Create a verification plan
      const plan = {
        id: crypto.randomUUID(),
        taskId,
        proposalId,
        targetUrl: task.targetUrl || 'http://localhost:3000/dashboard/matches',
        expectedOutcome: 'Visual clipping on the element should be resolved, showing a horizontal scroll container.',
        checks: [
          'Check DOM element wrapper for overflow-x-auto',
          'Verify UI does not overflow the main viewport boundaries'
        ],
        createdAt: Date.now()
      };

      await patchProposalService.createVerificationPlan(plan);
      await runService.createAgentEvent({
        taskId,
        source: "system",
        type: "STATUS_CHANGED",
        title: "Verification Plan Created",
        description: "Ready for post-fix UI reinspection. MR URL: " + mrResult.data.webUrl,
        metadata: JSON.stringify({ planId: plan.id }),
        timestamp: Date.now()
      });

      await taskService.appendAgentMessage({
        taskId,
        sender: 'devpilot',
        content: `GitLab handoff completed successfully. Branch: \`${branchName}\`. System is ready for verification.`,
        kind: 'success',
        timestamp: Date.now()
      });

      // Automatically trigger post-fix verification
      runPostFixVerificationWorkflow(taskId);
    } else {
      throw new Error(mrResult.error || "Failed to create Merge Request");
    }

  } catch (err: any) {
    // Failure path
    await taskService.updateTask(taskId, { codeFixStatus: 'failed' });
    await patchProposalService.updatePatchProposalStatus(proposalId, 'failed');
    await taskService.appendAgentMessage({
      taskId,
      sender: 'system',
      content: `GitLab handoff failed: ${err.message}`,
      kind: 'warning',
      timestamp: Date.now()
    });
  }
};
