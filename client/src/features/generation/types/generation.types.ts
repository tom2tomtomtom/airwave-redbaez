import React from 'react';

// --- Base Request/Result Types ---

export interface BaseGenerationRequest {
  clientId: string; // All generators need client context
  // Add other common options if needed, e.g., quality, style hints
}

export interface BaseGenerationResult {
  status: 'success' | 'error' | 'pending';
  assetId?: string; // ID of the created asset, if applicable
  previewUrl?: string; // URL for preview, if applicable
  data?: unknown; // For specific result data beyond asset/preview
  error?: string; // Error message if status is 'error'
}

// --- Generator Plugin Interface ---

/**
 * Represents a specific generation capability (e.g., Image from Text, Video from Script).
 * @template RequestType The specific type for the generation request parameters.
 * @template ResultType The specific type for the generation result.
 */
export interface GeneratorPlugin<RequestType extends BaseGenerationRequest, ResultType extends BaseGenerationResult> {
  /** Unique identifier for the plugin (e.g., 'image-stability-sdxl') */
  getId(): string;

  /** User-friendly name (e.g., 'Generate Image (Stability SDXL)') */
  getName(): string;

  /** Brief description of what the plugin does */
  getDescription(): string;

  /** Icon component or name for UI representation */
  getIcon(): React.ReactNode | string; // Allow MUI icons or custom components

  /** React component responsible for rendering the plugin-specific form fields */
  getFormComponent(): React.ComponentType<{ 
    requestData: Partial<RequestType>; // Current form data
    onRequestChange: (data: Partial<RequestType>) => void; // Callback to update form data
    // Potentially add disabled state, context info etc.
  }>;

  /** The core generation logic */
  generate(request: RequestType): Promise<ResultType>;
  
  /** Optional: Function to validate the request before sending */
  validate?(request: RequestType): { isValid: boolean; errors?: Record<string, string> };
  
  /** Optional: Function to provide default request parameters */
  getDefaults?(): Partial<RequestType>;
}

// --- Example Specific Types (Illustrative) ---

export interface TextToImageRequest extends BaseGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  stylePreset?: string;
  aspectRatio?: string; // e.g., '1:1', '16:9'
  seed?: number;
}

export interface TextToImageResult extends BaseGenerationResult {
  status: 'success' | 'error' | 'pending';
  assetId?: string; // ID of the generated image asset
  previewUrl?: string;
  // Could include metadata like seed used, final prompt etc.
}

export interface CopyGenerationRequest extends BaseGenerationRequest {
  brief: string; // Description of desired copy
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  targetAudience?: string;
}

export interface CopyGenerationResult extends BaseGenerationResult {
  status: 'success' | 'error' | 'pending';
  generatedText: string; // The actual copy
}

// --- Registry Type ---
// Using a generic type for the registry value for flexibility
export type GeneratorRegistry = Map<string, GeneratorPlugin<any, any>>;
