import re

with open("src/lib/seeds/index.ts", "r") as f:
    content = f.read()

# Fix the active task to include the inspection fields
task_match = re.search(r'(\{\s*id: TASK_ID_ACTIVE,.*?minusCount: 31,\n  \})', content, re.DOTALL)
if task_match:
    new_active_task = task_match.group(1).replace("minusCount: 31,", "minusCount: 31,\n    targetUrl: 'http://localhost:3000/dashboard/matches',\n    viewportPreset: 'desktop',\n    inspectionStatus: 'idle',")
    content = content.replace(task_match.group(1), new_active_task)

with open("src/lib/seeds/index.ts", "w") as f:
    f.write(content)
