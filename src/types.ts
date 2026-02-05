export type ModelType = 'kimi-k2p5' | 'kimi-k2-instruct-0905' | 'auto';

export interface WorkflowStep {
  id: string;
  name: string;
  model: ModelType;
  prompt: string;
  completionCriteria: {
    type: 'contains' | 'regex' | 'json' | 'llm_eval';
    value: string;
  };
  retries: number;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  createdAt: number;
}

export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'retrying';
  promptSent?: string;
  output: string;
  error?: string;
  attempt: number;
  tokenUsage?: { promptTokens: number; completionTokens: number };
  cost?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  results: StepResult[];
  startedAt: number;
  completedAt?: number;
  totalCost?: number;
}

export interface AppSettings {
  totalBudget: number;
  retryBudget: number;
  modelCosts: Record<string, number>; // cost per 1k tokens per model
  notificationEmail: string;
}
