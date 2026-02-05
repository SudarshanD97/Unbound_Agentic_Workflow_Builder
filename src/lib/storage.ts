import { Workflow, WorkflowExecution, AppSettings } from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const storage = {
  async getWorkflows(): Promise<Workflow[]> {
    return request<Workflow[]>('/workflows');
  },

  async saveWorkflows(workflows: Workflow[]): Promise<void> {
    await request('/workflows', {
      method: 'PUT',
      body: JSON.stringify({ workflows }),
    });
  },

  async getExecutions(): Promise<WorkflowExecution[]> {
    return request<WorkflowExecution[]>('/executions?limit=50');
  },

  async addExecution(execution: WorkflowExecution, workflowName?: string): Promise<void> {
    await request('/executions', {
      method: 'POST',
      body: JSON.stringify({ ...execution, workflowName }),
    });
  },

  async getSettings(): Promise<AppSettings> {
    return request<AppSettings>('/settings');
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    return request<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async importWorkflows(workflows: Workflow[]): Promise<{ imported: number; workflows: number }> {
    return request<{ imported: number; workflows: number }>('/workflows/import', {
      method: 'POST',
      body: JSON.stringify(workflows),
    });
  },

  async getStatus(): Promise<{ stored: boolean; workflows: number; executions: number }> {
    return request('/status');
  },
};
