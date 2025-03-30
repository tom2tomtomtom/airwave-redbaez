import apiClient from '../../../api/apiClient';
import { 
  TextToImageRequest, 
  TextToImageResult 
} from '../types/generation.types';

/**
 * Adapter for interacting with the backend Text-to-Image generation API.
 */
class TextToImageAdapter {
  private endpoint = '/api/generate/text-to-image';

  /**
   * Sends a request to generate an image based on text.
   * @param request - The generation parameters.
   * @returns A promise resolving to the generation result.
   */
  async generate(request: TextToImageRequest): Promise<TextToImageResult> {
    try {
      console.log('TextToImageAdapter: Sending request:', request);
      const response = await apiClient.post<TextToImageResult>(this.endpoint, request);
      
      // Assuming the backend returns a structure compatible with TextToImageResult
      console.log('TextToImageAdapter: Received response:', response.data);
      
      // Basic validation or transformation could happen here if needed
      if (!response.data || typeof response.data !== 'object') {
          throw new Error('Invalid response format from text-to-image endpoint');
      }
      
      // Ensure status is set, default to error if missing but looks like success otherwise?
      // Or trust backend to always return status. Let's assume backend is reliable for now.
      return {
        status: response.data.status || 'error',
        assetId: response.data.assetId,
        previewUrl: response.data.previewUrl,
        error: response.data.error,
        data: response.data.data // Pass through any extra data
      };
      
    } catch (error: any) {
      console.error('TextToImageAdapter: Error generating image:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred during image generation.';
      return {
        status: 'error',
        error: errorMessage,
      };
    }
  }
}

// Export a singleton instance
export const textToImageAdapter = new TextToImageAdapter();
