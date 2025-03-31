import { GeneratorPlugin, GenerationOptions, GenerationResult } from '../types/generators';
import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Use environment variable or configuration file for API base URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Base delay in ms between retries (will be multiplied by attempt number)

/**
 * Interface for text-to-image generation options
 */
export interface TextToImageOptions extends GenerationOptions {
  prompt: string;
  negativePrompt?: string;
  styleReference?: File | null;
  width?: number;
  height?: number;
  numVariations?: number;
  styleStrength?: number;
  seed?: number;
}

/**
 * Interface for a single text-to-image result item
 */
export interface TextToImageResultItem {
  imageUrl: string;
  assetId?: string;
  seed?: number;
}

/**
 * Interface for text-to-image generation results
 */
export interface TextToImageResult extends GenerationResult {
  jobId: string;
  status: string;
  progress: number;
  error?: string;
  images?: TextToImageResultItem[];
  timestamp?: number;   // When this result was created/updated
  requestId?: string;   // Unique ID for tracking the request
  cached?: boolean;     // Whether this result came from cache
}

/**
 * Text-to-image generation plugin
 */
export class TextToImagePlugin implements GeneratorPlugin<TextToImageOptions, TextToImageResult> {
  private static instance: TextToImagePlugin;
  
  // Cache for generated prompts to avoid redundant API calls
  private promptCache: Map<string, TextToImageResult> = new Map();
  
  // In-flight requests to prevent duplicate requests for the same prompt
  private inFlightRequests: Map<string, Promise<TextToImageResult>> = new Map();

  // Required GeneratorPlugin properties
  id: string = 'text-to-image';
  type: string = 'text-to-image';
  name: string = 'Text to Image';
  description: string = 'Generate images from text prompts with style matching';
  icon: string = 'image';
  supportedInputs: string[] = ['text', 'image'];
  supportedOutputs: string[] = ['image'];
  defaultOptions: TextToImageOptions = {
    prompt: '',
    width: 1024,
    height: 1024,
    numVariations: 1,
    styleStrength: 0.5
  };
  
  // Configuration fields for the UI
  configFields: Array<any> = [
    {
      name: 'prompt',
      label: 'Prompt',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'Describe the image you want to generate',
      helperText: 'Be specific about style, subject, and details',
      required: true
    },
    {
      name: 'negativePrompt',
      label: 'Negative Prompt',
      type: 'textarea',
      defaultValue: '',
      placeholder: 'Things to exclude from the image',
      helperText: 'Specify elements you do not want in the generated image'
    },
    {
      name: 'styleReference',
      label: 'Style Reference',
      type: 'file',
      helperText: 'Upload an image to match its style',
      accept: 'image/*'
    },
    {
      name: 'styleStrength',
      label: 'Style Strength',
      type: 'slider',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
      helperText: 'How strongly to apply the reference style'
    },
    {
      name: 'width',
      label: 'Width',
      type: 'number',
      defaultValue: 1024,
      min: 256,
      max: 2048,
      step: 64,
      helperText: 'Width of the generated image'
    },
    {
      name: 'height',
      label: 'Height',
      type: 'number',
      defaultValue: 1024,
      min: 256,
      max: 2048,
      step: 64,
      helperText: 'Height of the generated image'
    },
    {
      name: 'numVariations',
      label: 'Number of Variations',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 9,
      step: 1,
      helperText: 'How many variations to generate'
    },
    {
      name: 'seed',
      label: 'Seed',
      type: 'number',
      helperText: 'Optional seed for reproducible results'
    }
  ];

  private constructor() {
    // Clear cache periodically (every 30 minutes)
    setInterval(() => this.clearOldCacheEntries(), 30 * 60 * 1000);
  }
  
  /**
   * Create a cache key from generation options
   * @param options The options to create a cache key for
   * @returns A string key uniquely representing the options
   */
  private createCacheKey(options: TextToImageOptions): string {
    // Don't include the file in the cache key, as we can't compare files easily
    // Instead, we'll just cache text-only prompts
    if (options.styleReference) {
      return ''; // Return empty string to signal this shouldn't be cached
    }
    
    // Create a normalized representation of the options for caching
    const cacheableOptions = {
      prompt: options.prompt.trim().toLowerCase(),
      negativePrompt: options.negativePrompt?.trim().toLowerCase() || '',
      width: options.width || this.defaultOptions.width,
      height: options.height || this.defaultOptions.height,
      numVariations: options.numVariations || this.defaultOptions.numVariations,
      styleStrength: options.styleStrength || this.defaultOptions.styleStrength,
      seed: options.seed || undefined
    };
    
    return JSON.stringify(cacheableOptions);
  }
  
  /**
   * Clear cache entries older than 2 hours
   */
  private clearOldCacheEntries(): void {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    
    for (const [key, value] of this.promptCache.entries()) {
      if (value.timestamp && (now - value.timestamp) > TWO_HOURS) {
        this.promptCache.delete(key);
      }
    }
  }

  /**
   * Get the singleton instance of TextToImagePlugin
   */
  public static getInstance(): TextToImagePlugin {
    if (!TextToImagePlugin.instance) {
      TextToImagePlugin.instance = new TextToImagePlugin();
    }
    return TextToImagePlugin.instance;
  }

  /**
   * Generate images from text prompts with caching and retry support
   * 
   * @param options Generation options including prompt and style references
   * @returns Promise with job ID and initial status
   */
  async generate(options: TextToImageOptions): Promise<TextToImageResult> {
    // Create a cache key based on the options
    const cacheKey = this.createCacheKey(options);
    
    // If we have a valid cache key and a cached result exists, return it immediately
    if (cacheKey && this.promptCache.has(cacheKey)) {
      const cachedResult = this.promptCache.get(cacheKey)!;
      
      // Only return cached results that were successful
      if (cachedResult.status === 'succeeded' && cachedResult.images && cachedResult.images.length > 0) {
        console.log('Using cached text-to-image result');
        return { ...cachedResult, cached: true };
      }
    }
    
    // Check if there's already an in-flight request for this prompt
    if (cacheKey && this.inFlightRequests.has(cacheKey)) {
      console.log('Reusing in-flight text-to-image request');
      return this.inFlightRequests.get(cacheKey)!;
    }
    
    // Create a new request with retries
    const requestPromise = this.executeWithRetries(async () => {
      const formData = new FormData();
      
      // Add text parameters
      formData.append('prompt', options.prompt);
      
      if (options.negativePrompt) {
        formData.append('negativePrompt', options.negativePrompt);
      }
      
      if (options.width) {
        formData.append('width', options.width.toString());
      }
      
      if (options.height) {
        formData.append('height', options.height.toString());
      }
      
      if (options.numVariations) {
        formData.append('numVariations', options.numVariations.toString());
      }
      
      if (options.styleStrength) {
        formData.append('styleStrength', options.styleStrength.toString());
      }
      
      if (options.seed) {
        formData.append('seed', options.seed.toString());
      }
      
      // Add style reference file if provided
      if (options.styleReference) {
        formData.append('styleReference', options.styleReference);
      }
      
      // Send the generation request
      const response = await axios.post<{
        success: boolean;
        data: {
          jobId: string;
          status: string;
          progress: number;
        };
      }>(`${API_BASE_URL}/api/text-to-image/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const result: TextToImageResult = {
        jobId: response.data.data.jobId,
        status: response.data.data.status,
        progress: response.data.data.progress,
        timestamp: Date.now(),
        requestId: uuidv4(),
      };
      
      // If this is a cacheable request, store it in the cache
      if (cacheKey) {
        // We'll update this with the full result when checkStatus is called
        this.promptCache.set(cacheKey, result);
      }
      
      return result;
    });
    
    // If this is a cacheable request, store the promise to avoid duplicate requests
    if (cacheKey) {
      this.inFlightRequests.set(cacheKey, requestPromise);
    }
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up in-flight request reference once complete
      if (cacheKey) {
        this.inFlightRequests.delete(cacheKey);
      }
    }
  }
  
  /**
   * Retry a function with exponential backoff
   * @param fn The async function to retry
   * @returns Result of the function
   */
  private async executeWithRetries<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry if it's a client error (4xx)
        if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
          break;
        }
        
        // If not the last attempt, wait before retrying
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * attempt;
          console.log(`Text-to-image API call failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries failed, format the error message
    // Make sure errors from the API are formatted properly
    let errorMessage = 'Failed to generate images after multiple attempts';
    if (axios.isAxiosError(lastError)) {
      const axiosError = lastError as AxiosError<{success: boolean, message: string}>;
      if (axiosError.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
    } else if (lastError?.message) {
      errorMessage = lastError.message;
    }
    
    throw new Error(errorMessage);
  }

  /**
   * Check the status of a generation job
   * 
   * @param jobId Job identifier
   * @returns Current job status and results if available
   */
  /**
   * Get the URL to the generation page
   */
  getPageUrl(): string {
    return '/text-to-image';
  }

  /**
   * Check the status of a generation job with retry logic
   * 
   * @param jobId Job identifier
   * @returns Current job status and results if available
   */
  async checkStatus(jobId: string): Promise<TextToImageResult> {
    return this.executeWithRetries(async () => {
      const response = await axios.get<{
        success: boolean;
        data: {
          jobId: string;
          status: string;
          progress: number;
          error?: string;
          imageUrls?: string[];
          assetIds?: string[];
          prompt?: string;
          seed?: number;
        };
      }>(`${API_BASE_URL}/api/text-to-image/status/${jobId}`);
      
      const data = response.data.data;
      
      // Format the results
      const images = data.imageUrls?.map((url, index) => ({
        imageUrl: url,
        assetId: data.assetIds?.[index],
        seed: data.seed,
      })) || [];
      
      const result: TextToImageResult = {
        jobId: data.jobId,
        status: data.status,
        progress: data.progress,
        error: data.error,
        images,
        timestamp: Date.now(),
        requestId: uuidv4(),
      };
      
      // If job succeeded, check if we should update our cache with the complete result
      if (data.status === 'succeeded' && data.prompt && images.length > 0) {
        // Create a synthetic options object to generate a cache key
        const syntheticOptions: TextToImageOptions = {
          prompt: data.prompt,
          // We can't know other parameters from just the job ID, so this is a best-effort cache
        };
        
        const cacheKey = this.createCacheKey(syntheticOptions);
        if (cacheKey) {
          // Update cache with the complete result
          this.promptCache.set(cacheKey, result);
        }
      }
      
      return result;
    });
  }

  /**
   * Cancel a generation job with retry logic
   * 
   * @param jobId Job identifier
   * @returns Success status
   */
  async cancel(jobId: string): Promise<boolean> {
    return this.executeWithRetries(async () => {
      const response = await axios.post<{
        success: boolean;
        data: {
          cancelled: boolean;
        };
      }>(`${API_BASE_URL}/api/text-to-image/cancel/${jobId}`);
      
      return response.data.data.cancelled;
    });
  }

  /**
   * Get all jobs for the current client with retry logic
   * 
   * @returns List of jobs
   */
  async getJobs(): Promise<TextToImageResult[]> {
    return this.executeWithRetries(async () => {
      const response = await axios.get<{
        success: boolean;
        data: Array<{
          jobId: string;
          status: string;
          progress: number;
          error?: string;
          imageUrls?: string[];
          assetIds?: string[];
          prompt?: string;
          seed?: number;
          timestamp?: number;
        }>;
      }>(`${API_BASE_URL}/api/text-to-image/jobs`);
      
      const results = response.data.data.map(job => {
        const images = job.imageUrls?.map((url, index) => ({
          imageUrl: url,
          assetId: job.assetIds?.[index],
          seed: job.seed,
        })) || [];
        
        const result: TextToImageResult = {
          jobId: job.jobId,
          status: job.status,
          progress: job.progress,
          error: job.error,
          images,
          timestamp: job.timestamp || Date.now(),
          requestId: uuidv4(),
        };
        
        // Add to cache if successful
        if (job.status === 'succeeded' && job.prompt && images.length > 0) {
          const syntheticOptions: TextToImageOptions = {
            prompt: job.prompt,
          };
          
          const cacheKey = this.createCacheKey(syntheticOptions);
          if (cacheKey) {
            this.promptCache.set(cacheKey, result);
          }
        }
        
        return result;
      });
      
      return results;
    });
  }
}

// Export the singleton instance
export const textToImagePlugin = TextToImagePlugin.getInstance();
