import re

with open("src/types/index.ts", "r") as f:
    content = f.read()

task_match = re.search(r'(export interface Task \{.*?minusCount: number;)(\n\})', content, re.DOTALL)
if task_match:
    new_task = task_match.group(1) + """
  targetUrl?: string;
  viewportPreset?: "desktop" | "tablet" | "mobile";
  viewportWidth?: number;
  viewportHeight?: number;
  lastInspectionAt?: number;
  inspectionStatus?: "idle" | "queued" | "running" | "completed" | "failed";""" + task_match.group(2)
    content = content.replace(task_match.group(0), new_task)

artifact_match = re.search(r'(type: "diff" \| "log" \| "terminal")', content)
if artifact_match:
    content = content.replace(artifact_match.group(0), 'type: "diff" | "log" | "terminal" | "vision_analysis" | "screenshot"')

with open("src/types/index.ts", "w") as f:
    f.write(content)
