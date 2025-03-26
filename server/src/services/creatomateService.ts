import axios from 'axios';
import WebSocketService from './websocket';

// Initialize Creatomate API client
const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY || '';
const CREATOMATE_API_URL = 'https://api.creatomate.com/v1';

interface CreatomateRenderOptions {
  templateId: string;
  outputFormat: string;
  modifications: Record<string, any>;
}

interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  url?: string;
  thumbnailUrl?: string;
  error?: string;
}

class CreatomateService {
  private apiKey: string;
  private baseUrl: string;
  private wsService?: WebSocketService;
  private activeJobs: Map<string, RenderJob>;

  constructor(apiKey: string = CREATOMATE_API_KEY, baseUrl: string = CREATOMATE_API_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.activeJobs = new Map();
  }

  // Set WebSocket service for real-time updates
  setWebSocketService(wsService: WebSocketService) {
    this.wsService = wsService;
  }
  
  // Check if Creatomate service is properly configured
  isConnected(): boolean {
    // In production, we would do a real API check
    // For now, just check if API key is available
    return this.apiKey !== '' && this.apiKey.length > 10;
  }
  
  // Check if the service is properly configured with valid credentials
  isConfigured(): boolean {
    const isValid = this.apiKey !== '' && this.apiKey.length > 10;
    if (!isValid) {
      console.error('Creatomate service is not properly configured. Missing or invalid API key.');
    }
    return isValid;
  }

  // Generate an image using Creatomate API
  async generateImage(options: CreatomateRenderOptions): Promise<RenderJob> {
    try {
      if (process.env.PROTOTYPE_MODE === 'true') {
        console.log('Running in PROTOTYPE_MODE. Using mock Creatomate image response.');
        return this.mockGenerateImage(options);
      }

      console.log('Making real API call to Creatomate for image generation');
      console.log('Using API key:', this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'Missing');
      console.log('Template ID:', options.templateId);
      console.log('Using modifications:', JSON.stringify(options.modifications));

      // Verify that we have a valid API key
      if (!this.isConfigured()) {
        throw new Error('Creatomate API key is not configured');
      }

      const payload = {
        source: {
          template_id: options.templateId,
          modifications: options.modifications
        },
        output_format: options.outputFormat || 'jpg'
      };
      
      console.log('API request payload:', JSON.stringify(payload));

      const response = await axios.post(
        `${this.baseUrl}/renders`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Creatomate API response:', JSON.stringify(response.data));

      if (!response.data || !response.data.id) {
        throw new Error('Creatomate API returned an invalid response (no job ID)');
      }

      const job: RenderJob = {
        id: response.data.id,
        status: response.data.status || 'queued'
      };

      console.log(`Created render job with ID: ${job.id}`);

      // Store job for status tracking
      this.activeJobs.set(job.id, job);
      
      // Start polling for status updates
      this.pollJobStatus(job.id);

      return job;
    } catch (error: any) {
      console.error('Creatomate API error:', error.response?.data || error.message);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  // Generate a video using Creatomate API
  async generateVideo(options: CreatomateRenderOptions): Promise<RenderJob> {
    try {
      if (process.env.PROTOTYPE_MODE === 'true') {
        console.log('Running in PROTOTYPE_MODE. Using mock Creatomate video response.');
        return this.mockGenerateVideo(options);
      }

      console.log('Making real API call to Creatomate for video generation');
      console.log('Using API key:', this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'Missing');
      console.log('Template ID:', options.templateId);
      console.log('Using modifications:', JSON.stringify(options.modifications));

      // Verify that we have a valid API key
      if (!this.isConfigured()) {
        throw new Error('Creatomate API key is not configured');
      }

      const payload = {
        source: {
          template_id: options.templateId,
          modifications: options.modifications
        },
        output_format: options.outputFormat || 'mp4'
      };
      
      console.log('API request payload:', JSON.stringify(payload));

      const response = await axios.post(
        `${this.baseUrl}/renders`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Creatomate API response:', JSON.stringify(response.data));

      if (!response.data || !response.data.id) {
        throw new Error('Creatomate API returned an invalid response (no job ID)');
      }

      const job: RenderJob = {
        id: response.data.id,
        status: response.data.status || 'queued'
      };

      console.log(`Created render job with ID: ${job.id}`);

      // Store job for status tracking
      this.activeJobs.set(job.id, job);
      
      // Start polling for status updates
      this.pollJobStatus(job.id);

      return job;
    } catch (error: any) {
      console.error('Creatomate API error:', error.response?.data || error.message);
      throw new Error(`Failed to generate video: ${error.message}`);
    }
  }

  // Generate a preview (faster, lower quality)
  async generatePreview(options: CreatomateRenderOptions): Promise<RenderJob> {
    if (process.env.PROTOTYPE_MODE === 'true') {
      console.log('Running in PROTOTYPE_MODE. Using mock Creatomate preview.');
      return this.mockGeneratePreview(options);
    }
    
    // Use the same method as generateVideo but with preview settings
    const previewOptions = {
      ...options,
      outputFormat: 'mp4',
      // Add preview-specific modifications (lower quality, watermark, etc.)
      modifications: {
        ...options.modifications,
        _preview: true,
        _resolution: '480p'
      }
    };

    return this.generateVideo(previewOptions);
  }

  // Check the status of a render job
  async checkRenderStatus(jobId: string): Promise<RenderJob> {
    try {
      if (!jobId) {
        throw new Error('No job ID provided to checkRenderStatus');
      }

      console.log(`Checking render status for job: ${jobId}`);

      if (process.env.PROTOTYPE_MODE === 'true') {
        console.log('Using mock job status in prototype mode');
        const job = this.activeJobs.get(jobId);
        if (!job) {
          throw new Error(`Job not found: ${jobId}`);
        }
        return job;
      }

      // Verify that we have a valid API key
      if (!this.isConfigured()) {
        throw new Error('Creatomate API key is not configured');
      }

      console.log(`Making real API call to check status for job: ${jobId}`);

      const response = await axios.get(
        `${this.baseUrl}/renders/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      console.log(`Received status response for job ${jobId}:`, JSON.stringify(response.data));

      const data = response.data;
      const job: RenderJob = {
        id: data.id,
        status: data.status,
        url: data.url,
        thumbnailUrl: data.thumbnails?.[0],
        error: data.error
      };

      console.log(`Job ${jobId} status: ${job.status}, url: ${job.url || 'not available yet'}`);

      // Update job in storage
      this.activeJobs.set(jobId, job);

      // Notify clients if status has changed and WebSocket service is available
      if (this.wsService) {
        this.wsService.broadcastToAll('renderStatus', { jobId, status: job.status, url: job.url });
      }

      return job;
    } catch (error: any) {
      console.error('Error checking render status:', error.response?.data || error.message);
      throw new Error(`Failed to check render status: ${error.message}`);
    }
  }

  // Poll for job status updates
  private async pollJobStatus(jobId: string, interval: number = 5000, maxAttempts: number = 60) {
    if (process.env.PROTOTYPE_MODE === 'true') {
      // In prototype mode, simulate status changes
      this.simulateStatusChanges(jobId);
      return;
    }

    let attempts = 0;
    
    const poll = async () => {
      try {
        const job = await this.checkRenderStatus(jobId);
        attempts++;

        if (job.status === 'completed' || job.status === 'failed' || attempts >= maxAttempts) {
          // Job has finished or maximum polling attempts reached
          return;
        }

        // Continue polling
        setTimeout(poll, interval);
      } catch (error) {
        console.error(`Error polling job ${jobId}:`, error);
      }
    };

    // Start polling
    poll();
  }

  // For prototype mode: Simulate status changes
  private simulateStatusChanges(jobId: string, isImage: boolean = false) {
    const statuses: Array<'queued' | 'rendering' | 'completed' | 'failed'> = [
      'queued', 'rendering', 'completed'
    ];
    
    let index = 0;
    const job = this.activeJobs.get(jobId);
    
    if (!job) {
      console.error(`Cannot simulate status changes for job ${jobId}: Job not found`);
      return;
    }

    console.log(`Starting status simulation for job ${jobId}`);

    const updateStatus = () => {
      if (index >= statuses.length) return;
      
      const newStatus = statuses[index];
      console.log(`Updating job ${jobId} status to ${newStatus}`);
      
      const updatedJob: RenderJob = { ...job, status: newStatus };
      
      if (newStatus === 'completed') {
        // Use placeholder media URLs that would typically work in a browser
        if (isImage) {
          // For images
          const aspectRatio = updatedJob.id.includes('square') ? '1:1' : 
                             updatedJob.id.includes('portrait') ? '9:16' : 
                             updatedJob.id.includes('instagram') ? '4:5' : '16:9';
          
          // Choose dimensions based on aspect ratio
          const dimensions = aspectRatio === '1:1' ? '600/600' : 
                            aspectRatio === '9:16' ? '600/1067' : 
                            aspectRatio === '4:5' ? '600/750' : '1067/600';
                            
          updatedJob.url = `https://picsum.photos/${dimensions}?random=${Math.floor(Math.random() * 1000)}`;
          updatedJob.thumbnailUrl = updatedJob.url;
        } else {
          // For videos
          updatedJob.url = 'https://picsum.photos/640/360.mp4';
          updatedJob.thumbnailUrl = 'https://picsum.photos/640/360';
        }
      }
      
      this.activeJobs.set(jobId, updatedJob);
      
      // Notify clients if WebSocket service is available
      if (this.wsService) {
        this.wsService.broadcastToAll('renderStatus', { 
          jobId, 
          status: updatedJob.status, 
          url: updatedJob.url,
          thumbnailUrl: updatedJob.thumbnailUrl 
        });
      }
      
      index++;
      
      if (index < statuses.length) {
        // Schedule next update
        setTimeout(updateStatus, 3000); // Faster updates for prototype mode
      } else {
        console.log(`Finished simulation for job ${jobId}. Final status: ${newStatus}`);
      }
    };
    
    // Start the simulation
    updateStatus();
  }

  // Mock implementations for prototype mode
  private mockGenerateImage(options: CreatomateRenderOptions): RenderJob {
    const jobId = `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const job: RenderJob = {
      id: jobId,
      status: 'queued'
    };
    
    // Log the mock job creation for debugging
    console.log(`Creating mock image job ${jobId} with template: ${options.templateId}`);
    console.log('Modifications:', JSON.stringify(options.modifications));
    
    // Start the simulation
    this.activeJobs.set(jobId, job);
    this.simulateStatusChanges(jobId, true);
    
    return job;
  }

  // Mock implementations for prototype mode
  private mockGenerateVideo(options: CreatomateRenderOptions): RenderJob {
    const jobId = `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const job: RenderJob = {
      id: jobId,
      status: 'queued'
    };
    
    this.activeJobs.set(jobId, job);
    
    // Log the mock job creation for debugging
    console.log(`Creating mock video job ${jobId} with template: ${options.templateId}`);
    console.log('Modifications:', JSON.stringify(options.modifications));
    
    // Start the simulation
    this.simulateStatusChanges(jobId);
    
    return job;
  }

  private mockGeneratePreview(options: CreatomateRenderOptions): RenderJob {
    const jobId = `preview-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // For previews, immediately return a "completed" status with mock URLs
    const job: RenderJob = {
      id: jobId,
      status: 'completed',
      url: 'https://example.com/mock-preview.mp4',
      thumbnailUrl: 'https://example.com/mock-preview-thumbnail.jpg'
    };
    
    this.activeJobs.set(jobId, job);
    
    // Notify clients
    if (this.wsService) {
      this.wsService.broadcastToAll('renderStatus', { 
        jobId, 
        status: job.status, 
        url: job.url,
        thumbnailUrl: job.thumbnailUrl 
      });
    }
    
    return job;
  }
}

// Export singleton instance
export const creatomateService = new CreatomateService();

// Export types for use in other files
export type { CreatomateRenderOptions, RenderJob };