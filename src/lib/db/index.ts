import Dexie, { Table } from 'dexie';
import { Task, AgentMessage, TaskArtifact, Memory, AgentRun } from '../../types';

export class DevPilotDB extends Dexie {
  tasks!: Table<Task>;
  agentMessages!: Table<AgentMessage>;
  taskArtifacts!: Table<TaskArtifact>;
  memories!: Table<Memory>;
  agentRuns!: Table<AgentRun>;

  constructor() {
    super('DevPilotDB');
    this.version(1).stores({
      tasks: 'id, category, status, createdAt',
      agentMessages: 'id, taskId, timestamp',
      taskArtifacts: 'id, [taskId+type]',
      memories: 'id, scope, createdAt',
      agentRuns: 'id, taskId, status'
    });
  }
}

export const db = new DevPilotDB();
