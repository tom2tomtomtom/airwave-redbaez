import React from 'react';
import { PhotoCamera } from '@mui/icons-material'; // Example icon
import { 
  GeneratorPlugin, 
  TextToImageRequest, 
  TextToImageResult 
} from '../types/generation.types';
import { TextToImageForm } from '../components/forms/TextToImageForm';
import { textToImageAdapter } from '../adapters/TextToImageAdapter';

export class TextToImagePlugin implements GeneratorPlugin<TextToImageRequest, TextToImageResult> {
  private readonly id = 'text-to-image-stability'; // Example ID
  private readonly name = 'Generate Image (Stability)';
  private readonly description = 'Create images from text descriptions using Stability AI.';

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  // Return type should be React.ReactNode as it can be an element or other node types
  getIcon(): React.ReactNode {
    return <PhotoCamera />;
  }

  getFormComponent(): React.ComponentType<{ 
    requestData: Partial<TextToImageRequest>; 
    onRequestChange: (data: Partial<TextToImageRequest>) => void; 
  }> {
    return TextToImageForm;
  }
  
  getDefaults(): Partial<TextToImageRequest> {
      return {
          prompt: '',
          negativePrompt: '',
          aspectRatio: '1:1', // Default to square
          stylePreset: 'photographic' // Default style
      };
  }

  validate(request: TextToImageRequest): { isValid: boolean; errors?: Record<string, string> } {
    const errors: Record<string, string> = {};
    if (!request.prompt || request.prompt.trim().length === 0) {
      errors.prompt = 'Prompt is required.';
    }
    // Add more validation rules if needed (e.g., length checks, seed format)
    
    return { isValid: Object.keys(errors).length === 0, errors };
  }

  async generate(request: TextToImageRequest): Promise<TextToImageResult> {
    console.log(`TextToImagePlugin (${this.id}): Starting generation with request:`, request);
    
    // Add validation call before sending
    const validation = this.validate(request);
    if (!validation.isValid) {
      console.error('TextToImagePlugin: Validation failed', validation.errors);
      return {
        status: 'error',
        error: `Validation failed: ${Object.values(validation.errors || {}).join(', ')}`
      };
    }
    
    // Call the adapter
    const result = await textToImageAdapter.generate(request);
    console.log(`TextToImagePlugin (${this.id}): Received result:`, result);
    return result;
  }
}

// Export an instance for registration
export const textToImagePlugin = new TextToImagePlugin();
