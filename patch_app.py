import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Replace the orchestrator import
content = content.replace('import { startMockOrchestrator } from "./lib/orchestrator";',
                          'import { startMockOrchestrator } from "./lib/orchestrator";\nimport { runUiInspectionWorkflow } from "./lib/workflows/uiInspection.workflow";\nimport { config } from "./lib/config/env";')

# Add the UI Tab state
content = re.sub(r'const \[codeTab, setCodeTab\] = useState<\'diff\' \| \'log\' \| \'terminal\' \| string>\(\'log\'\);',
                 "const [codeTab, setCodeTab] = useState<'diff' | 'log' | 'terminal' | 'vision_analysis' | string>('log');", content)

# Update the useEffect to use the workflow if conditions are met
old_effect = """  useEffect(() => {
    if (task && task.status === 'running') {
      startMockOrchestrator(taskId);
    }
  }, [task?.status, taskId]);"""

new_effect = """  useEffect(() => {
    if (task && task.status === 'running') {
      if (config.liveMode && task.inspectionStatus === 'idle') {
        runUiInspectionWorkflow(taskId);
      } else {
        startMockOrchestrator(taskId);
      }
    }
  }, [task?.status, taskId, task?.inspectionStatus]);"""

content = content.replace(old_effect, new_effect)

# Inject Vision Analysis Tab UI element
# Find right panel tab section
tab_section_regex = r'(<button onClick=\{.*?setCodeTab\(\'terminal\'\).*?className=\{.*?\}[\s\S]*?Terminal[\s\S]*?<\/button>)'
vision_tab = """\\1
            <button onClick={() => setCodeTab('vision_analysis')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${codeTab === 'vision_analysis' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-border-dark'}`}>Vision</button>"""
content = re.sub(tab_section_regex, vision_tab, content)

# Render the vision artifact properly with line breaks if it exists
render_artifact_regex = r'(\{currentArtifact\?\.\w+ \?\? \'No content available\.\'\})'
new_render = "{currentArtifact?.content || (codeTab === 'vision_analysis' ? 'No vision analysis generated yet.' : 'No content available.')}"
content = re.sub(render_artifact_regex, new_render, content)

with open("src/App.tsx", "w") as f:
    f.write(content)
