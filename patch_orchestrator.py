import re

with open("src/lib/orchestrator/index.ts", "r") as f:
    content = f.read()

# Make the orchestrator fail fast if the task has inspectionStatus idle but we got here,
# meaning liveMode was off. We just want to make sure it plays nicely with the new schema.
with open("src/lib/orchestrator/index.ts", "w") as f:
    f.write(content.replace("if (!run || run.status !== 'running') return;", "if (!run || run.status !== 'running') return;\n  await taskService.updateTask(taskId, { inspectionStatus: 'completed' });"))
