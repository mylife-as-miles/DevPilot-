import { taskService } from '../services';

const orchestratedTasks = new Set<string>();

export const startMockOrchestrator = async (taskId: string) => {
  if (orchestratedTasks.has(taskId)) return;
  orchestratedTasks.add(taskId);

  const run = await taskService.getActiveAgentRun(taskId);
  if (!run || run.status !== 'running') return;

  const steps = [
    { delay: 1500, message: "Analyzing authentication requirements...", step: "Analyzing..." },
    { delay: 3000, message: "Reviewing project workflow memory on Authentication standard...", step: "Checking memory..." },
    { delay: 2500, message: "Refactoring requireAuth middleware to use async verifyToken pattern...", step: "Writing code..." },
    { delay: 2000, message: "Patch ready for review. Waiting for approval.", step: "Waiting for review..." }
  ];

  let cumulativeDelay = 0;

  steps.forEach(({ delay, message, step }, index) => {
    cumulativeDelay += delay;
    setTimeout(async () => {
      // Check if task is still running before appending (user might have approved early)
      const currentRun = await taskService.getActiveAgentRun(taskId);
      if (currentRun && currentRun.status === 'running') {
        await taskService.updateAgentRunStep(currentRun.id, step);
        await taskService.appendAgentMessage({
          taskId,
          sender: "devpilot",
          content: message,
          kind: index === steps.length - 1 ? "success" : "info",
          timestamp: Date.now()
        });
      }
    }, cumulativeDelay);
  });
};
