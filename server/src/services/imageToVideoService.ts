import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketService } from './WebSocketService';
import { WebSocketEvent, JobProgressPayload } from '../types/websocket.types';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';
import { assetService } from './assetService.new';
import * as path from 'path';
import * as fs from 'fs';
import fsPromises from 'fs/promises';

// Initialize Runway API client (we'll use Runway for image-to-video conversion)
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY || '';
const RUNWAY_API_URL = 'https://api.runwayml.com/v1';

/**
 * Options for image-to-video generation
 */
export interface ImageToVideoOptions {
  // Source image URL or base64 data
  sourceImage: string;
  
  // Motion parameters
  motionType: 'zoom' | 'pan' | 'rotation' | 'complex';
  motionStrength: number; // 0-100
  motionDirection?: 'in' | 'out' | 'left' | 'right' | 'up' | 'down';
  
  // Duration in seconds
  duration: number;
  
  // Output format
  outputFormat: 'mp4' | 'mov' | 'gif';
  
  // Output resolution
  width: number;
  height: number;
  
  // Tracking IDs
  clientId?: string;
  userId?: string;
}

/**
 * Image-to-video job status
 */
export interface ImageToVideoJob {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  sourceImage?: string;
  clientId?: string;
  userId?: string;
  assetId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service for converting static images to videos with motion effects
 */
class ImageToVideoService {
  private apiKey: string;
  private baseUrl: string;
  private wsService?: WebSocketService;
  private activeJobs: Map<string, ImageToVideoJob>;
  private pollingIntervals: Map<string, NodeJS.Timeout>;
  
  constructor(apiKey: string = RUNWAY_API_KEY, baseUrl: string = RUNWAY_API_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.activeJobs = new Map();
    this.pollingIntervals = new Map();
  }
  
  /**
   * Set WebSocket service for real-time updates
   */
  setWebSocketService(wsService: WebSocketService) {
    this.wsService = wsService;
    logger.info('WebSocket service set for ImageToVideoService');
  }
  
  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    const isValid = this.apiKey !== '' && this.apiKey.length > 10;
    return isValid;
  }
  
  /**
   * Generate a video from an image
   * @param options Image-to-video generation options
   * @returns Promise with the generation job
   */
  async generateVideo(options: ImageToVideoOptions): Promise<ImageToVideoJob> {
    if (!this.isConfigured()) {
      throw new ApiError(ErrorCode.CONFIGURATION_ERROR, 'Image-to-video service is not properly configured');
    }
    
    // Create a new job with pending status
    const jobId = uuidv4();
    const newJob: ImageToVideoJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      sourceImage: options.sourceImage,
      clientId: options.clientId,
      userId: options.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store the job in our active jobs map
    this.activeJobs.set(jobId, newJob);
    
    try {
      // Prepare payload for Runway API (adapt based on Runway's specific API requirements)
      const payload = {
        model: 'gen3a_turbo', // Runway's image animation model
        input: {
          image: options.sourceImage,
          prompt: `Convert this image to video with ${options.motionType} motion ${options.motionDirection ? 'towards ' + options.motionDirection : ''}`,
          motion_strength: options.motionStrength / 100, // Convert to 0-1 range
          duration: options.duration
        },
        output_format: options.outputFormat,
        webhook_url: process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/webhooks/runway` : undefined
      };
      
      // Update job status
      this.updateJobStatus(jobId, {
        status: 'processing',
        progress: 10,
        updatedAt: new Date()
      });
      
      // Send real-time update
      this.sendWebSocketUpdate(jobId, options.clientId, options.userId);
      
      // Make API request to Runway
      logger.info(`Starting image-to-video conversion for job ${jobId}`);
      const response = await axios.post(`${this.baseUrl}/generation/image-to-video`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Extract task ID from response
      const taskId = response.data.id;
      
      // Start polling for results if webhook is not configured
      if (!process.env.API_BASE_URL) {
        this.pollForVideoResults(taskId, jobId, options.clientId, options.userId);
      }
      
      // Return the job
      return this.activeJobs.get(jobId) as ImageToVideoJob;
    } catch ($1: unknown) {
      // Handle API error
      logger.error(`Error generating video: ${error.message}`);
      
      // Update job with error
      this.updateJobStatus(jobId, {
        status: 'failed',
        error: error.message || 'Unknown error during video generation',
        updatedAt: new Date()
      });
      
      // Send real-time update
      this.sendWebSocketUpdate(jobId, options.clientId, options.userId);
      
      // Return the failed job
      return this.activeJobs.get(jobId) as ImageToVideoJob;
    }
  }
  
  /**
   * Poll for video generation results
   * @param taskId Runway task ID
   * @param jobId Our internal job ID
   * @param clientId Optional client ID for tracking
   * @param userId Optional user ID for tracking
   */
  private pollForVideoResults(taskId: string, jobId: string, clientId?: string, userId?: string) {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second interval
    const interval = 5000; // 5 seconds
    
    const poll = async () => {
      try {
        if (attempts >= maxAttempts) {
          this.updateJobStatus(jobId, {
            status: 'failed',
            error: 'Timeout waiting for video generation',
            updatedAt: new Date()
          });
          this.sendWebSocketUpdate(jobId, clientId, userId);
          this.clearPollingInterval(jobId);
          return;
        }
        
        attempts++;
        
        // Calculate progress based on attempts (simple approximation)
        const progress = Math.min(10 + Math.floor((attempts / maxAttempts) * 80), 90);
        
        // Update progress
        this.updateJobStatus(jobId, {
          progress,
          updatedAt: new Date()
        });
        
        // Send real-time update
        this.sendWebSocketUpdate(jobId, clientId, userId);
        
        // Check task status
        const response = await axios.get(`${this.baseUrl}/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        
        const status = response.data.status;
        
        if (status === 'succeeded') {
          // Task completed successfully
          this.updateJobStatus(jobId, {
            status: 'succeeded',
            progress: 100,
            videoUrl: response.data.output.video,
            thumbnailUrl: response.data.output.thumbnail,
            updatedAt: new Date()
          });
          
          this.sendWebSocketUpdate(jobId, clientId, userId);
          this.clearPollingInterval(jobId);
          logger.info(`Image-to-video job ${jobId} completed successfully`);
        } else if (status === 'failed') {
          // Task failed
          this.updateJobStatus(jobId, {
            status: 'failed',
            error: response.data.error || 'Video generation failed',
            updatedAt: new Date()
          });
          
          this.sendWebSocketUpdate(jobId, clientId, userId);
          this.clearPollingInterval(jobId);
          logger.error(`Image-to-video job ${jobId} failed: ${response.data.error}`);
        } else {
          // Task still processing, continue polling
          logger.debug(`Image-to-video job ${jobId} still processing (attempt ${attempts})`);
        }
      } catch ($1: unknown) {
        logger.error(`Error polling for video results: ${error.message}`);
        
        // Don't fail the job yet, try again in the next interval
        // unless we've reached max attempts
        if (attempts >= maxAttempts) {
          this.updateJobStatus(jobId, {
            status: 'failed',
            error: `Error checking video status: ${error.message}`,
            updatedAt: new Date()
          });
          
          this.sendWebSocketUpdate(jobId, clientId, userId);
          this.clearPollingInterval(jobId);
        }
      }
    };
    
    // Start polling
    const intervalId = setInterval(poll, interval);
    this.pollingIntervals.set(jobId, intervalId);
    
    // Immediately do first poll
    poll();
  }
  
  /**
   * Clear polling interval for a job
   * @param jobId The job ID
   */
  private clearPollingInterval(jobId: string) {
    const interval = this.pollingIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(jobId);
    }
  }
  
  /**
   * Update job status with partial data
   * @param jobId The job ID
   * @param updates Partial job data to update
   */
  private async updateJobStatus(jobId: string, updates: Partial<ImageToVideoJob>) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      logger.warn(`Cannot update non-existent job ${jobId}`);
      return;
    }

    // Update job data
    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date()
    };
    
    // Store updated job
    this.activeJobs.set(jobId, updatedJob);
    
    // Key integration point: When a job successfully completes and has a video URL,
    // we automatically save it to the asset library if it hasn't been saved already
    if (updates.status === 'succeeded' && updates.videoUrl && !job.assetId) {
      // Only attempt to save if we have the required context for asset creation
      if (job.clientId && job.userId) {
        try {
          // This is where the image-to-video service connects with the asset service
          // The generated video becomes a permanent asset in the system that users can access
          // through the asset library interface
          await this.saveVideoToAssets(jobId, updatedJob);
        } catch (error) {
          // Log errors but don't fail the job - the video generation was still successful
          // even if we couldn't save it to the asset library
          logger.error(`Failed to save video to assets for job ${jobId}: ${error}`);
        }
      }
    }
  }
  
  /**
   * Send WebSocket update for a job
   * @param jobId The job ID
   * @param clientId Optional client ID
   * @param userId Optional user ID
   */
  private sendWebSocketUpdate(jobId: string, clientId?: string, userId?: string) {
    if (!this.wsService) {
      return;
    }
    
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return;
    }
    
    const payload: JobProgressPayload = {
      jobId,
      service: 'image-to-video',
      status: job.status,
      progress: job.progress,
      resultUrl: job.videoUrl,
      message: `Image-to-video conversion ${job.status}`,
      error: job.error,
      clientId: clientId || '',
      userId: userId || ''
    };
    
    // Broadcast to specific client if clientId is provided
    if (clientId) {
      this.wsService.broadcastToClient(
        clientId, 
        WebSocketEvent.JOB_PROGRESS, 
        payload
      );
    }
    
    // Broadcast to specific user if userId is provided
    if (userId) {
      this.wsService.broadcastToUser(
        userId, 
        WebSocketEvent.JOB_PROGRESS, 
        payload
      );
    }
    
    // Broadcast to all clients (admin monitoring)
    this.wsService.broadcast(
      WebSocketEvent.JOB_PROGRESS,
      payload
    );
  }
  
  /**
   * Get the status of a specific job
   * @param jobId The job ID
   * @returns The job or null if not found
   */
  getJobStatus(jobId: string): ImageToVideoJob | null {
    return this.activeJobs.get(jobId) || null;
  }
  
  /**
   * Get all active jobs
   * @returns Array of all active jobs
   */
  getAllJobs(): ImageToVideoJob[] {
    return Array.from(this.activeJobs.values());
  }
  
  /**
   * Get jobs for a specific client
   * @param clientId The client ID
   * @returns Array of jobs for the client
   */
  getClientJobs(clientId: string): ImageToVideoJob[] {
    return Array.from(this.activeJobs.values())
      .filter(job => job.clientId === clientId);
  }
  
  /**
   * Get jobs for a specific user
   * @param userId The user ID
   * @returns Array of jobs for the user
   */
  getUserJobs(userId: string): ImageToVideoJob[] {
    return Array.from(this.activeJobs.values())
      .filter(job => job.userId === userId);
  }
  
  /**
   * Save a generated video to the asset library
   * 
   * This method serves as the integration point between image-to-video generation and the asset
   * management system. When a video is successfully generated, this method downloads the video,
   * prepares it for storage, and saves it to the asset library with appropriate metadata.
   * 
   * The integration flow is as follows:
   * 1. Download video from external API provider's URL
   * 2. Create a temporary file for processing
   * 3. Create a compatible file object for the asset service
   * 4. Add metadata including generation source, job ID, and processing status
   * 5. Upload to asset library with appropriate tags and categories
   * 6. Update the original job with the new asset ID for reference
   * 
   * This enables users to easily find and manage generated videos through the standard
   * asset library interface, while maintaining a connection to the original generation job.
   * 
   * @param jobId The unique identifier for the generation job
   * @param job The complete job data containing videoUrl, user context, and other details
   */
  private async saveVideoToAssets(jobId: string, job: ImageToVideoJob): Promise<void> {
    // Early validation - we need the video URL to download and the client/user IDs for proper ownership
    // attribution and context when creating the asset
    if (!job.videoUrl || !job.clientId || !job.userId) {
      logger.warn(`Cannot save video to assets for job ${jobId}: Missing videoUrl, clientId, or userId`);
      return;
    }
    
    try {
      logger.info(`Saving video to assets for job ${jobId}`);
      
      // Download the video from the URL
      const response = await axios.get(job.videoUrl, { responseType: 'arraybuffer' });
      const videoBuffer = Buffer.from(response.data, 'binary');
      
      // Create a temporary file path
      const tempDir = path.join(process.env.UPLOAD_DIR || './uploads', 'temp');
      if (!fs.existsSync(tempDir)) {
        await fsPromises.mkdir(tempDir, { recursive: true });
      }
      
      const fileExtension = path.extname(job.videoUrl) || '.mp4';
      const tempFilePath = path.join(tempDir, `${jobId}${fileExtension}`);
      
      // Save the video to a temporary file
      await fsPromises.writeFile(tempFilePath, videoBuffer);
      
      // Create a file object compatible with Express.Multer.File
      const file = {
        originalname: `generated-video-${jobId}${fileExtension}`,
        mimetype: 'video/mp4',
        size: videoBuffer.length,
        buffer: videoBuffer,
        path: tempFilePath
      } as Express.Multer.File;
      
      // Generate appropriate metadata from the source image and video parameters
      const assetMetadata: Record<string, any> = {
        generatedFrom: 'image-to-video',
        sourceJobId: jobId,
        motionType: job.sourceImage ? 'Generated from image' : 'AI-generated',
        processingStatus: 'complete',
        generatedAt: new Date().toISOString()
      };
      
      // Create an asset using the assetService
      const assetResult = await assetService.uploadAsset(file, job.userId, {
        clientId: job.clientId,
        ownerId: job.userId, // Required by AssetUploadOptions
        name: `Generated Video ${new Date().toLocaleDateString('en-GB')}`,
        description: 'Video generated from image with motion effects',
        tags: ['generated', 'image-to-video', 'motion'],
        categories: ['videos', 'generated'],
        metadata: assetMetadata,
        alternativeText: 'Generated video with motion effects'
      });
      
      // Clean up the temporary file
      try {
        await fsPromises.unlink(tempFilePath);
      } catch (cleanupError) {
        logger.warn(`Failed to clean up temporary file ${tempFilePath}: ${cleanupError}`);
      }
      
      if (assetResult.success && assetResult.data) {
        logger.info(`Successfully saved video to assets for job ${jobId} as asset ${assetResult.data.id}`);
        
        // Update the job with the asset ID for future reference
        await this.updateJobStatus(jobId, {
          assetId: assetResult.data.id
        });
      } else {
        logger.error(`Failed to save video to assets for job ${jobId}: ${assetResult.message}`);
      }
    } catch ($1: unknown) {
      logger.error(`Error saving video to assets for job ${jobId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Handle webhook notification from Runway
   * 
   * This method processes incoming webhook notifications from the external API provider,
   * updating job statuses and triggering asset creation when appropriate. Webhooks are a
   * critical part of the async generation flow, enabling the system to react to completed
   * video generations without constant polling.
   * 
   * The webhook processing flow:
   * 1. External API sends notification when a job status changes
   * 2. This method extracts the job ID and status information
   * 3. The corresponding job is updated in our system
   * 4. For completed jobs, this triggers asset creation through updateJobStatus
   * 5. Status changes are broadcast to clients via WebSockets
   * 
   * This webhook handler is designed to be resilient, logging errors but always returning
   * a success response to the provider to acknowledge receipt of the webhook.
   * 
   * @param data The complete webhook payload from the Runway API containing job status and output information
   */
  async handleWebhook($1: unknown) {
    try {
      // Extract relevant data from webhook
      const taskId = data.id || data.task_id;
      const status = data.status;
      const jobId = data.metadata?.jobId || data.job_id;
      
      logger.info(`Received webhook for job ${jobId} with status ${status}`);
      
      // Find the job in our active jobs map
      if (!jobId || !this.activeJobs.has(jobId)) {
        logger.warn(`Received webhook for unknown job: ${jobId}`);
        return;
      }
      
      const job = this.activeJobs.get(jobId);
      
      if (status === 'completed' || status === 'succeeded' || status === 'success') {
        // Job completed successfully
        const videoUrl = data.output?.video || data.output?.video_url || data.video || data.output;
        const thumbnailUrl = data.output?.thumbnail || data.output?.thumbnail_url || data.thumbnail || data.output;
        
        // Extract assetId if it exists in metadata
        const assetId = data.metadata?.assetId;
        
        // Update job status, including assetId if available
        await this.updateJobStatus(jobId, {
          status: 'succeeded',
          progress: 100,
          videoUrl,
          thumbnailUrl,
          ...(assetId && { assetId }), // Include assetId only if it exists
          updatedAt: new Date()
        });
        
        logger.info(`Image-to-video job ${jobId} completed successfully`);
      } else if (status === 'failed' || status === 'error') {
        // Job failed
        const errorMessage = data.error || 'Unknown error during video generation';
        
        await this.updateJobStatus(jobId, {
          status: 'failed',
          error: errorMessage,
          updatedAt: new Date()
        });
        
        logger.error(`Image-to-video job ${jobId} failed: ${errorMessage}`);
      } else {
        // Job still processing
        const progress = data.progress || 0;
        
        // Update job status
        await this.updateJobStatus(jobId, {
          status: 'processing',
          progress,
          updatedAt: new Date()
        });
        
        logger.debug(`Image-to-video job ${jobId} still processing at ${progress}%`);
      }
    } catch ($1: unknown) {
      logger.error(`Error handling webhook: ${error.message}`);
    }
  }
}

// Export singleton instance
export const imageToVideoService = new ImageToVideoService();

// Note: Types are already exported at the beginning of the file
