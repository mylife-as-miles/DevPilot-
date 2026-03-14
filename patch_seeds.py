import re

with open("src/lib/seeds/index.ts", "r") as f:
    content = f.read()

# Fix the active task to include the codeFixStatus and candidates
task_match = re.search(r'(\{\s*id: TASK_ID_ACTIVE,.*?inspectionStatus: \'idle\',\n  \})', content, re.DOTALL)
if task_match:
    new_active_task = task_match.group(1).replace("inspectionStatus: 'idle',", "inspectionStatus: 'idle',\n    codeFixStatus: 'idle',\n    repoName: 'project-x',\n    relatedRoute: '/dashboard/matches',\n    candidateFiles: ['src/components/home/MomentsGrid.tsx', 'src/components/home/TopMatchesCard.tsx'],")
    content = content.replace(task_match.group(1), new_active_task)

with open("src/lib/seeds/index.ts", "w") as f:
    f.write(content)
