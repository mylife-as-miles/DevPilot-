export interface Task {
  id: string;
  title: string;
  repo: string;
  branch: string;
  status: "running" | "merged" | "closed";
  category: "tasks" | "code_reviews" | "archive";
  createdAt: number;
  updatedAt: number;
  plusCount: number;
  minusCount: number;
}

export interface AgentMessage {
  id: string;
  taskId: string;
  sender: "devpilot" | "ui_agent" | "code_agent" | "system";
  content: string;
  kind: "info" | "warning" | "success" | "thinking";
  timestamp: number;
}

export interface TaskArtifact {
  id: string;
  taskId: string;
  type: "diff" | "log" | "terminal";
  content: string;
  timestamp: number;
}

export interface Memory {
  id: string;
  scope: "bug_fix" | "ui_pattern" | "code_pattern" | "workflow";
  title: string;
  content: string;
  tags: string[];
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export interface AgentRun {
  id: string;
  taskId: string;
  status: "queued" | "running" | "completed" | "failed";
  currentStep: string;
  startedAt: number;
  updatedAt: number;
}
