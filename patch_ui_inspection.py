import re

with open("src/lib/workflows/uiInspection.workflow.ts", "r") as f:
    content = f.read()

# Make it chain to codeFix automatically
if "import { runCodeFixWorkflow }" not in content:
    content = "import { runCodeFixWorkflow } from './codeFix.workflow';\n" + content

# Instead of finishing the run, start code fix
replace_completion = """    await completeStep(4, "Inspection finished and recorded.");

    await runService.createAgentEvent({
      taskId,
      source: "system",
      type: "STATUS_CHANGED",
      title: "Inspection Complete",
      description: "Proceeding to Code Fix generation.",
      metadata: "{}",
      timestamp: Date.now()
    });

    // Start code fix workflow seamlessly
    runCodeFixWorkflow(taskId);"""

content = re.sub(r'await completeStep\(4, "Inspection finished and recorded."\);\s*await runService\.createAgentEvent\(\{[\s\S]*?\}\);', replace_completion, content)

with open("src/lib/workflows/uiInspection.workflow.ts", "w") as f:
    f.write(content)
