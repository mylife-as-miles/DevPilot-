import re

with open("src/types/index.ts", "r") as f:
    content = f.read()

task_match = re.search(r'(export interface Task \{.*?inspectionStatus\?: "idle" \| "queued" \| "running" \| "completed" \| "failed";)(\n\})', content, re.DOTALL)
if task_match:
    new_task = task_match.group(1) + """
  codeFixStatus?: "idle" | "running" | "ready_for_review" | "approved" | "applied" | "failed";
  repoName?: string;
  repoPath?: string;
  defaultBranch?: string;
  candidateFiles?: string[];
  componentHints?: string[];
  relatedRoute?: string;""" + task_match.group(2)
    content = content.replace(task_match.group(0), new_task)

new_models = """

export interface PatchProposal {
  id: string;
  taskId: string;
  source: "mock_code_agent" | "gitlab_adapter" | "hybrid";
  status: "draft" | "ready_for_review" | "approved" | "applied" | "failed";
  title: string;
  summary: string;
  suspectedFiles: string[];
  recommendedStrategy: string;
  explanation: string;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export interface PatchFile {
  id: string;
  proposalId: string;
  taskId: string;
  filePath: string;
  changeType: "update" | "create" | "delete";
  patch: string;
  explanation: string;
  createdAt: number;
}

export interface VerificationPlan {
  id: string;
  taskId: string;
  proposalId: string;
  targetUrl: string;
  expectedOutcome: string;
  checks: string[];
  createdAt: number;
}

export interface NormalizedFixRecommendation {
  taskId: string;
  issueType: string;
  suspectedComponent: string;
  suspectedFiles: string[];
  explanation: string;
  recommendedFix: string;
  evidence: string[];
  tags: string[];
  confidence: number;
  sourceArtifactIds: string[];
}
"""

content = content + new_models

with open("src/types/index.ts", "w") as f:
    f.write(content)
