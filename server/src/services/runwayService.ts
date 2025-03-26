import axios from 'axios';
import WebSocketService from './websocket';

// Import the Runway SDK
const RunwayML = require('@runwayml/sdk').default;

// Initialize Runway API client
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY || '';
// Updated base URL to use the correct endpoint for image generation
const RUNWAY_API_URL = 'https://api.runwayml.com/v1/generation';
// Runway SDK client
let runwayClient: any = null;

// Initialize the SDK client if API key is available
if (RUNWAY_API_KEY) {
  try {
    runwayClient = new RunwayML({
      apiKey: RUNWAY_API_KEY
    });
    console.log('Runway SDK client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Runway SDK client:', error);
  }
}

interface RunwayImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  numberOfImages?: number;
  style?: string;
  seed?: number;
  clientId?: string;
  withLogo?: boolean;
}

interface RunwayVideoGenerationOptions {
  promptImage: string;      // URL to the source image
  promptText?: string;      // Optional text prompt describing how to animate the image
  model?: string;           // Model to use (default: 'gen3a_turbo')
  motionStrength?: number;  // How much motion to apply (0.0 to 1.0)
  duration?: number;        // Video duration in seconds
  clientId?: string;        // Client ID for tracking
}

interface RunwayTextToVideoOptions {
  prompt: string;           // Text prompt describing the video to generate
  negativePrompt?: string;  // Optional negative prompt to guide generation away from certain concepts
  model?: string;           // Model to use (default: 'gen3a_turbo')
  mode?: string;            // Generation mode ('standard' or 'cinematic')
  width?: number;           // Width of the video (default: 1024)
  height?: number;          // Height of the video (default: 576)
  duration?: number;        // Video duration in seconds (default: 4)
  clientId?: string;        // Client ID for tracking
}

interface GenerationJob {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  type?: 'image' | 'video';
  progress?: number;  // Add progress field (0-1) for tracking generation progress
}

class RunwayService {
  private apiKey: string;
  private baseUrl: string;
  private wsService?: WebSocketService;
  private activeJobs: Map<string, GenerationJob>;
  private pollingIntervals: Map<string, NodeJS.Timeout>;
  private sdkClient: any;

  constructor(apiKey: string = RUNWAY_API_KEY, baseUrl: string = RUNWAY_API_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.activeJobs = new Map();
    this.pollingIntervals = new Map();
    
    // Initialize SDK client
    if (this.apiKey) {
      try {
        this.sdkClient = new RunwayML({
          apiKey: this.apiKey
        });
        console.log('Runway SDK client initialized in RunwayService');
      } catch (error) {
        console.error('Failed to initialize Runway SDK client in RunwayService:', error);
      }
    }
  }

  // Set WebSocket service for real-time updates
  setWebSocketService(wsService: WebSocketService) {
    this.wsService = wsService;
  }
  
  // Check if Runway service is properly configured
  isConfigured(): boolean {
    const isValid = this.apiKey !== '' && this.apiKey.length > 20 && this.sdkClient !== null;
    if (!isValid) {
      console.error('Runway service is not properly configured. Missing or invalid API key, or SDK client initialization failed.');
    }
    return isValid;
  }

  // Generate an image using Runway API
  async generateImage(options: RunwayImageGenerationOptions): Promise<GenerationJob> {
    try {
      console.log('Making API call to Runway for image generation');
      console.log('Using API key:', this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'Missing');
      console.log('Options:', JSON.stringify({
        ...options,
        prompt: options.prompt.substring(0, 30) + (options.prompt.length > 30 ? '...' : '')
      }));

      // Verify that we have a valid API key
      if (!this.isConfigured()) {
        throw new Error('Runway API key is not configured');
      }

      // Updated payload structure based on the working React component example
      const payload = {
        prompt: options.prompt,
        negative_prompt: options.negativePrompt || '',
        num_samples: options.numberOfImages || 1,
        guidance_scale: 7, // Default guidance scale
        // Use standard aspect ratio format like "16:9", "1:1", etc.
        aspect_ratio: this.calculateAspectRatioString(options.width, options.height),
        // Add seed if specified
        ...(options.seed ? { seed: options.seed } : {}),
        // Add style if specified - only if supported by the API
        ...(options.style ? { style: options.style.toLowerCase() } : {})
      };
      
      // Log the full API URL we're connecting to
      console.log(`Connecting to Runway API: ${this.baseUrl}`);
      console.log('API request payload:', JSON.stringify(payload));

      // Using the correct text_to_image endpoint as per documentation
      console.log(`Using Runway generation endpoint: ${this.baseUrl}`);
      console.log(`API Key (first 10 chars): ${this.apiKey.substring(0, 10)}...`);
      
      // Make the API request to the generation endpoint
      const response = await axios.post(
        this.baseUrl,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'runway-api-version': '0' // Required header for Runway API
          }
        }
      );

      // Log the raw response data
      console.log('Runway API response structure:', Object.keys(response.data));
      console.log('Runway API complete response:', JSON.stringify(response.data));
      
      // Handle response based on updated API documentation
      // Process the response based on the actual Runway API response structure
      console.log('Runway API response structure:', JSON.stringify(response.data, null, 2));
      
      // Check if we have immediate results in the artifacts array
      if (response.data.artifacts && response.data.artifacts.length > 0) {
        const imageUrl = response.data.artifacts[0].uri;
        console.log(`Image generated successfully, URL: ${imageUrl}`);
        return { 
          id: response.data.id || `runway-${Date.now()}`, // Use response ID or generate a fallback ID
          imageUrl, 
          status: 'succeeded' 
        };
      }
      
      // If no immediate results, check for a task ID for async processing
      const taskId = response.data.id;
      
      if (!taskId) {
        throw new Error('No artifacts or task ID returned from Runway API');
      }
      
      console.log(`Image generation task started with ID: ${taskId}, polling for results...`);
      const imageUrl = await this.pollForTaskResults(taskId);

      // Create a job ID for tracking
      const jobId = `runway-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // We've already extracted the imageUrl from the response above

      const job: GenerationJob = {
        id: jobId,
        status: 'succeeded',
        imageUrl: imageUrl
      };

      console.log(`Created image generation job with ID: ${job.id}`);

      // Store job for status tracking
      this.activeJobs.set(job.id, job);
      
      // Notify clients via WebSocket if available
      if (this.wsService) {
        this.wsService.broadcastToAll('image_generation_complete', {
          jobId: job.id,
          status: job.status,
          url: job.imageUrl
        });
      }

      return job;
    } catch (error: any) {
      console.error('Runway API error:', error.response?.data || error.message);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  // Get the status of a specific job
  getJobStatus(jobId: string): GenerationJob | null {
    return this.activeJobs.get(jobId) || null;
  }
  
  // Helper function to calculate aspect ratio string - used to convert width/height to standard ratios
  private calculateAspectRatioString(width: number, height: number): string {
    // Calculate the GCD (Greatest Common Divisor) to simplify the ratio
    const gcd = (a: number, b: number): number => {
      return b === 0 ? a : gcd(b, a % b);
    };
    
    const divisor = gcd(width, height);
    const simplifiedWidth = width / divisor;
    const simplifiedHeight = height / divisor;
    
    // Return common aspect ratios in the format expected by Runway API
    if (simplifiedWidth === simplifiedHeight) { // 1:1 square
      return '1:1';
    } else if ((simplifiedWidth === 16 && simplifiedHeight === 9) || 
              (Math.abs(width / height - 16 / 9) < 0.01)) { // 16:9 landscape
      return '16:9';
    } else if ((simplifiedWidth === 9 && simplifiedHeight === 16) || 
              (Math.abs(width / height - 9 / 16) < 0.01)) { // 9:16 portrait/story
      return '9:16';
    } else if ((simplifiedWidth === 4 && simplifiedHeight === 3) || 
              (Math.abs(width / height - 4 / 3) < 0.01)) { // 4:3
      return '4:3';
    } else if ((simplifiedWidth === 3 && simplifiedHeight === 4) || 
              (Math.abs(width / height - 3 / 4) < 0.01)) { // 3:4
      return '3:4';
    } else if ((simplifiedWidth === 3 && simplifiedHeight === 2) || 
              (Math.abs(width / height - 3 / 2) < 0.01)) { // 3:2
      return '3:2';
    } else if ((simplifiedWidth === 2 && simplifiedHeight === 3) || 
              (Math.abs(width / height - 2 / 3) < 0.01)) { // 2:3
      return '2:3';
    } else {
      // Default to a simplified custom ratio string
      return `${simplifiedWidth}:${simplifiedHeight}`;
    }
  }
  
  async pollForTaskResults(taskId: string, maxAttempts = 30, interval = 5000): Promise<string> {
    let attempts = 0;
    
    // First try with SDK if available
    if (this.sdkClient && this.sdkClient.tasks && typeof this.sdkClient.tasks.retrieve === 'function') {
      console.log(`Using SDK to poll for task ${taskId}`);
      
      while (attempts < maxAttempts) {
        try {
          console.log(`SDK polling attempt ${attempts + 1}/${maxAttempts}`);
          
          // Use the SDK to check task status
          const taskStatus = await this.sdkClient.tasks.retrieve(taskId);
          console.log(`SDK task status: ${taskStatus.status}`);
          
          if (['SUCCEEDED', 'COMPLETED'].includes(taskStatus.status)) {
            if (Array.isArray(taskStatus.output) && taskStatus.output.length > 0) {
              const url = taskStatus.output[0];
              console.log(`Task completed successfully with URL: ${url}`);
              return url;
            } else if (taskStatus.artifacts && taskStatus.artifacts.length > 0) {
              const url = taskStatus.artifacts[0].uri;
              console.log(`Task completed with artifacts URL: ${url}`);
              return url;
            } else {
              console.warn('Task completed but no output URL found');
            }
          } else if (taskStatus.status === 'FAILED') {
            throw new Error(`Task failed: ${taskStatus.error || 'Unknown error'}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, interval));
          attempts++;
        } catch (error: any) {
          console.error(`SDK polling error:`, error.message);
          break; // Fallback to REST API polling
        }
      }
      
      // Reset attempts counter for fallback method
      attempts = 0;
      console.log('Falling back to REST API polling');
    }
    
    // Fallback to REST API polling if SDK fails or isn't available
    while (attempts < maxAttempts) {
      try {
        console.log(`Polling for task ${taskId}, attempt ${attempts + 1}/${maxAttempts}`);
        
        // Use the same endpoint structure for status checking as for creation
        const response = await axios.get(
          `${this.baseUrl}/${taskId}`, // Use baseUrl with taskId appended
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );
        
        console.log(`Task status: ${response.data.status || 'unknown'}`);
        
        // Check if the generation is complete - Accept both SUCCEEDED and COMPLETED statuses
        if (response.data.status === 'SUCCEEDED' || response.data.status === 'COMPLETED') {
          // First check for artifacts array - this matches the React component implementation
          if (response.data.artifacts && response.data.artifacts.length > 0) {
            const imageUrl = response.data.artifacts[0].uri;
            console.log(`Task completed with image URL: ${imageUrl}`);
            return imageUrl;
          }
          // Fallback handling for other response formats
          else if (response.data.output) {
            // Handle different output formats
            if (Array.isArray(response.data.output) && response.data.output.length > 0) {
              const imageUrl = response.data.output[0];
              console.log(`Task completed with image URL: ${imageUrl}`);
              return imageUrl;
            } else if (response.data.output.images && response.data.output.images.length > 0) {
              const imageUrl = response.data.output.images[0].url;
              console.log(`Task completed with image URL: ${imageUrl}`);
              return imageUrl;
            } else if (typeof response.data.output === 'string') {
              console.log(`Task completed with image URL: ${response.data.output}`);
              return response.data.output;
            }
          }
          
          // If we get here, we couldn't find the image URL
          throw new Error('No image URL found in completed task results');
        }
        // Check for failure
        else if (response.data.status === 'FAILED') {
          const errorMessage = response.data.error || 'Unknown error';
          console.error(`Task failed: ${errorMessage}`);
          throw new Error(`Generation failed: ${errorMessage}`);
        }
        
        // Task is still in progress, wait before polling again
        console.log(`Task ${taskId} still in progress, waiting ${interval/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } catch (error: any) {
        console.error(`Error polling for task ${taskId}:`, error.message);
        if (error.response?.data) {
          console.error(`Error details:`, JSON.stringify(error.response.data));
        }
        throw error;
      }
    }
    
    throw new Error(`Timed out waiting for task results after ${maxAttempts} attempts`);
  }

  /**
   * Generate a video from an image using Runway API
   * 
   * @param options Video generation options
   * @returns Promise with the generation job
   */
  /**
   * Generate a video from text using Runway API (text-to-video)
   * 
   * @param options Text-to-video generation options
   * @returns Promise with the generation job
   */
  async generateTextToVideo(options: RunwayTextToVideoOptions): Promise<GenerationJob> {
    console.log('Text-to-video generation is no longer supported');
    
    // Create a job ID that indicates this feature is disabled
    const jobId = `disabled-text-to-video-${Date.now()}`;
    
    // Create job with error status
    const job: GenerationJob = {
      id: jobId,
      status: 'failed',
      type: 'video',
      error: 'Text-to-video generation is no longer supported. Please use image-to-video generation instead.'
    };
    
    // Add to active jobs to make it trackable
    this.activeJobs.set(jobId, job);
    
    return job;
  }
  
  // Helper method to calculate aspect ratio string from dimensions
  private calculateAspectRatioFromDimensions(width: number, height: number): string {
    // Use existing gcd implementation
    const divisor = this.gcd(width, height);
    const w = width / divisor;
    const h = height / divisor;
    
    // Return in Runway's expected format
    return `${w}:${h}`;
  }

  // Calculate GCD for aspect ratio calculations
  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  async generateVideo(options: RunwayVideoGenerationOptions): Promise<GenerationJob> {
    try {
      console.log('Generating video from image with Runway');
      console.log(`Using API key: ${this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'Missing'}`);
      console.log(`Image URL: ${options.promptImage}`);
      console.log(`Prompt: ${options.promptText || 'None'}`)
      
      // Verify that we have a valid configuration
      if (!this.isConfigured()) {
        throw new Error('Runway API key is not configured or SDK client initialization failed');
      }

      if (!this.sdkClient) {
        throw new Error('Runway SDK client is not initialized');
      }
      
      // Create the image-to-video task using the SDK (the approach that worked in our tests)
      console.log('Creating image-to-video task with SDK...');
      const task = await this.sdkClient.imageToVideo.create({
        model: options.model || 'gen3a_turbo',
        promptImage: options.promptImage,
        promptText: options.promptText || '',
        motionStrength: options.motionStrength || 0.5,
        duration: options.duration || 4
      });
      
      console.log(`Video generation task created with ID: ${task.id}`);
      
      // Create a job for tracking
      const jobId = `runway-video-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const job: GenerationJob = {
        id: jobId,
        status: 'processing',
        type: 'video'
      };
      
      // Store job for tracking
      this.activeJobs.set(jobId, job);
      
      // Start polling for results in the background
      this.pollVideoTask(task.id, jobId);
      
      return job;
    } catch (error: any) {
      console.error('Runway video generation error:', error.message);
      throw new Error(`Failed to generate video: ${error.message}`);
    }
  }
  
  /**
   * Poll for video task results and update the job status
   */
  private async pollVideoTask(taskId: string, jobId: string) {
    try {
      // Poll for task completion
      const videoUrl = await this.pollForTaskResults(taskId);
      
      // Update the job with the video URL
      const job = this.activeJobs.get(jobId);
      if (job) {
        job.status = 'succeeded';
        job.videoUrl = videoUrl;
        this.activeJobs.set(jobId, job);
        
        // Notify clients via WebSocket if available
        if (this.wsService) {
          this.wsService.broadcastToAll('video_generation_complete', {
            jobId: job.id,
            status: job.status,
            url: job.videoUrl
          });
        }
      }
    } catch (error: any) {
      console.error('Error polling for video task:', error.message);
      
      // Update the job with the error
      const job = this.activeJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        this.activeJobs.set(jobId, job);
        
        // Notify clients via WebSocket if available
        if (this.wsService) {
          this.wsService.broadcastToAll('video_generation_failed', {
            jobId: job.id,
            status: job.status,
            error: job.error
          });
        }
      }
    }
  }

  // Legacy method maintained for backward compatibility
  async pollForResults(jobId: string, maxAttempts = 30, interval = 1000): Promise<string> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Polling for job ${jobId}, attempt ${attempts + 1}/${maxAttempts}`);
        
        // Check the generation status
        const response = await axios.get(
          `https://api.runwayml.com/v1/generations/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Accept': 'application/json',
              'runway-api-version': '0' // Required header for Runway API
            }
          }
        );
        
        console.log(`Poll response status: ${response.data.status}`);
        
        if (response.data.status === 'succeeded') {
          // Generation completed
          if (response.data.outputs && response.data.outputs.length > 0) {
            return response.data.outputs[0].url;
          } else {
            throw new Error('Generation succeeded but no output URL found');
          }
        } else if (response.data.status === 'failed') {
          throw new Error(`Generation failed: ${response.data.error || 'Unknown error'}`);
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } catch (error: any) {
        console.error(`Error polling job ${jobId}:`, error.message);
        throw new Error(`Failed to poll for results: ${error.message}`);
      }
    }
    
    throw new Error(`Timeout waiting for job ${jobId} to complete after ${maxAttempts} attempts`);
  }
}

// Export a singleton instance
const runwayService = new RunwayService();
export { runwayService, RunwayImageGenerationOptions, GenerationJob };
