/**
 * Generator plugin type definitions
 * Provides types for generation plugins across the application
 */

/**
 * Base options interface for all generation processes
 */
export interface GenerationOptions {
  client_id?: string;
  user_id?: string;
  [key: string]: any;
}

/**
 * Base result interface for all generation processes
 */
export interface GenerationResult {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  [key: string]: any;
}

/**
 * Configuration field types for generator UIs
 */
export type ConfigFieldType = 
  | 'text' 
  | 'number' 
  | 'textarea' 
  | 'select' 
  | 'checkbox' 
  | 'radio'
  | 'slider'
  | 'color'
  | 'date'
  | 'file'
  | 'image';

/**
 * Select option for dropdown fields
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Conditional display rules for configuration fields
 */
export interface ConditionalDisplay {
  field: string;
  values: any[];
  operator?: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
}

/**
 * Configuration field definition for generator UIs
 */
export interface ConfigField {
  name: string;
  label: string;
  type: ConfigFieldType;
  defaultValue?: any;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: SelectOption[];
  conditionalDisplay?: ConditionalDisplay;
  multiple?: boolean;
  accept?: string;
}

/**
 * Generator plugin interface
 * 
 * Generic interface for all generator plugins that can be registered
 * in the application.
 * 
 * @template Options - The options type for this generator
 * @template Result - The result type for this generator
 */
export interface GeneratorPlugin<Options extends GenerationOptions, Result extends GenerationResult> {
  // Unique identifier for this generator
  id: string;
  
  // Display name for UI
  name: string;
  
  // Description for UI
  description: string;
  
  // Type of generator (e.g., 'image', 'video', 'text')
  type: string;
  
  // Material UI icon name
  icon: string;
  
  // Array of input types this generator can accept
  supportedInputs: string[];
  
  // Array of output types this generator can produce
  supportedOutputs: string[];
  
  // Configuration fields for the UI
  configFields: ConfigField[];
  
  // Default generation options
  defaultOptions: Options;
  
  // Generate function that performs the generation
  generate: (options: Options) => Promise<Result>;
  
  // Optional function to check the status of an in-progress generation
  checkStatus?: (jobId: string) => Promise<Result>;
  
  // Get the URL to the generation page
  getPageUrl: () => string;
}
