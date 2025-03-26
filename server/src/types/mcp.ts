export interface MCPRequest {
  input: string;
  context?: Record<string, any>;
  maxSteps?: number;
  format?: string;
}

export interface MCPStepResult {
  step: number;
  reasoning: string;
  output: string;
  intermediate?: any;
}

export interface MCPResponse {
  results: MCPStepResult[];
  finalOutput: string;
  metadata: {
    totalSteps: number;
    executionTimeMs: number;
    completedAt: string;
  };
}

export interface MCPConfig {
  model: string;
  apiKey: string;
  defaultMaxSteps: number;
  temperature: number;
}
