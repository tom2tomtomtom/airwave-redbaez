/**
 * Request for sequential thinking MCP process
 */
export interface MCPRequest {
  /** The main input prompt or question for the sequential thinking process */
  input: string;
  /** Optional contextual information to provide to the model */
  context?: Record<string, any>;
  /** Maximum number of reasoning steps to perform (default: 5) */
  maxSteps?: number;
  /** Optional output format specification */
  format?: string;
}

/**
 * Result of a single reasoning step in the sequential thinking process
 */
export interface MCPStepResult {
  /** Step number in the sequence */
  step: number;
  /** Detailed reasoning process for this step */
  reasoning: string;
  /** The conclusion or output from this step */
  output: string;
  /** Optional intermediate data or calculations */
  intermediate?: any;
}

/**
 * Response from the sequential thinking MCP process
 */
export interface MCPResponse {
  /** Array of all reasoning steps performed */
  results: MCPStepResult[];
  /** The final output/conclusion from the last step */
  finalOutput: string;
  /** Additional metadata about the process */
  metadata: {
    /** Total number of steps performed */
    totalSteps: number;
    /** Total execution time in milliseconds */
    executionTimeMs: number;
    /** ISO timestamp of when the process completed */
    completedAt: string;
  };
}
