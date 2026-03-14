import { DuoAgentRole, DuoFlowStepKey } from '../../types';
import { gitlabDuoService } from '../services/gitlabDuo.service';
import { runService } from '../services/run.service';
import { config } from '../config/env';

export interface AgentInvocationResult {
  success: boolean;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * gitlabDuoAdapter maps DevPilot's orchestration logic to the real GitLab Duo concepts
 * using custom flows and custom agents.
 */
export const gitlabDuoAdapter = {

  /**
   * Starts or resumes a custom GitLab Duo Flow run.
   */
  async initializeFlowRun(taskId: string, flowDefinitionId: string): Promise<string> {
    const isLive = config.liveDuoExecution;
    const flowRunId = isLive ? `real_flow_${crypto.randomUUID().slice(0, 8)}` : `mock_run_${crypto.randomUUID().slice(0, 8)}`;

    return await gitlabDuoService.createOrUpdateFlowRun({
      taskId,
      flowRunId,
      flowDefinitionId,
      status: 'running',
    });
  },

  /**
   * Transitions a flow run into a new step handled by a specific GitLab Duo Agent.
   */
  async invokeAgent(
    taskId: string,
    stepKey: DuoFlowStepKey,
    agentRole: DuoAgentRole,
    contextPayload: Record<string, any> = {}
  ): Promise<AgentInvocationResult> {
    const isLive = config.liveDuoExecution;
    const flowRun = await gitlabDuoService.getFlowRunByTaskId(taskId);
    if (!flowRun) {
        return { success: false, message: 'Flow run not found.' };
    }

    if (isLive) {
      // Future live execution path
      // e.g. await fetch(config.gitlabDuoApiUrl + '/agents/invoke', { ... })
      console.log(`[LIVE DUO MODE] Invoking ${agentRole} for step ${stepKey}`);
    }

    // Persist local state for the agent handoff
    await gitlabDuoService.updateFlowStep(taskId, stepKey, 'running');
    const invocationId = await gitlabDuoService.createAgentInvocation(
        flowRun.id,
        taskId,
        agentRole,
        stepKey,
        contextPayload
    );

    await runService.createAgentEvent({
      taskId,
      source: "orchestrator",
      type: "STEP_STARTED",
      title: `Invoking ${agentRole}`,
      description: `GitLab Duo Flow transitioning to ${stepKey} step.`,
      metadata: JSON.stringify({ role: agentRole, step: stepKey, payloadSize: JSON.stringify(contextPayload).length }),
      timestamp: Date.now()
    });

    // Auto-complete the invocation record for synchronous local/mock steps
    // (In a truly async live mode, this would be completed via a webhook or polling)
    await gitlabDuoService.completeAgentInvocation(invocationId, true);

    return { success: true, message: `Agent ${agentRole} successfully assigned.` };
  },

  /**
   * Reaches an approval checkpoint in the Custom Flow where human intervention is required.
   */
  async requireApprovalCheckpoint(taskId: string, description: string): Promise<void> {
    const isLive = config.liveDuoExecution;
    if (isLive) {
       console.log(`[LIVE DUO MODE] Approval checkpoint reached: ${description}`);
       // Future real checkpoint API call
    }
    await gitlabDuoService.updateFlowStep(taskId, "wait_for_approval", 'paused');
    await runService.createAgentEvent({
      taskId,
      source: "orchestrator",
      type: "STATUS_CHANGED",
      title: `Approval Checkpoint Reached`,
      description,
      metadata: "{}",
      timestamp: Date.now()
    });
  },

  /**
   * Completes a custom flow run.
   */
  async completeFlowRun(taskId: string, success: boolean): Promise<void> {
    const existing = await gitlabDuoService.getFlowRunByTaskId(taskId);
    if (existing) {
      const status = success ? 'completed' : 'failed';
      await gitlabDuoService.createOrUpdateFlowRun({
        taskId,
        flowRunId: existing.flowRunId,
        flowDefinitionId: existing.flowDefinitionId,
        status
      });
      if (config.liveDuoExecution) {
          console.log(`[LIVE DUO MODE] Flow ${existing.flowRunId} completed with status: ${status}`);
      }
    }
  }

};
