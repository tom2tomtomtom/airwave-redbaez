import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { assetService } from './assetService.new';
import { WebSocketService } from './WebSocketService';
import { WebSocketEvent } from '../types/websocket.types';

/**
 * Represents a text-to-image generation job
 */
export interface TextToImageJob {
  id: string;
  clientId: string;
  userId: string;
  prompt: string;
  negativePrompt?: string;
  styleReference?: string; // URL or base64 of the reference image
  width: number;
  height: number;
  numVariations: number;
  styleStrength?: number; // 0-1 value indicating how strongly to match the style
  seed?: number;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  error?: string;
  message?: string; // Status message for UI display
  results?: string[]; // URLs to generated images
  assetIds?: string[]; // IDs of assets created from generated images
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Options for generating images from text
 */
export interface TextToImageOptions {
  prompt: string;
  negativePrompt?: string;
  styleReference?: string;
  width?: number;
  height?: number;
  numVariations?: number;
  styleStrength?: number;
  seed?: number;
}

/**
 * Result from a text-to-image generation
 */
export interface TextToImageResult {
  jobId: string;
  status: string;
  progress: number;
  error?: string;
  imageUrls?: string[];
  assetIds?: string[];
}

// Create a logger with the appropriate context
const logger = createLogger('TextToImageService');

/**
 * Service for generating images from text using AI
 * Handles job management, API integration, result processing, and WebSocket communication
 */
class TextToImageService {
  private apiKey: string;
  private apiUrl: string;
  private activeJobs: Map<string, TextToImageJob>;
  private uploadDir: string;
  private assetService: typeof assetService;
  private webSocketService: WebSocketService;
  
  // Cache for previously generated prompts and their results
  private promptCache: Map<string, { results: string[], assetIds: string[], timestamp: number }> = new Map();
  
  // Maximum age for cached prompts in milliseconds (1 hour)
  private readonly MAX_CACHE_AGE = 60 * 60 * 1000;
  
  // Maximum number of items in cache
  private readonly MAX_CACHE_SIZE = 100;

  constructor() {
    this.apiKey = process.env.STABILITY_API_KEY || '';
    this.apiUrl = 'https://api.stability.ai';
    this.uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    this.activeJobs = new Map<string, TextToImageJob>();
    this.assetService = assetService;
    this.webSocketService = WebSocketService.getInstance();
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Validate API key
    if (!this.apiKey) {
      logger.warn('Missing STABILITY_API_KEY environment variable for text-to-image service');
    }
    // Start a periodic cleanup of the cache and stale jobs
    setInterval(() => this.cleanupCacheAndJobs(), 15 * 60 * 1000); // Run every 15 minutes
  }

  /**
   * Generate images from a text prompt
   * 
   * @param clientId Client identifier
   * @param userId User identifier
   * @param options Generation options including prompt and style references
   * @returns Job ID and initial status
   */
  async generateImages(clientId: string, userId: string, options: TextToImageOptions): Promise<TextToImageResult> {
    // Validate inputs
    if (!options.prompt) {
      throw new Error('Prompt is required');
    }

    // Default values
    const width = options.width || 1024;
    const height = options.height || 1024;
    const numVariations = options.numVariations || 1;
    const styleStrength = options.styleStrength || 0.5;

    // Create a new job
    const jobId = uuidv4();
    const job: TextToImageJob = {
      id: jobId,
      clientId,
      userId,
      prompt: options.prompt,
      negativePrompt: options.negativePrompt,
      styleReference: options.styleReference,
      width,
      height,
      numVariations,
      styleStrength,
      seed: options.seed,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store the job
    this.activeJobs.set(jobId, job);
    logger.info(`Created text-to-image job ${jobId} for client ${clientId}`);

    // Start the generation process asynchronously
    this.processJob(jobId).catch(error => {
      logger.error(`Error processing text-to-image job ${jobId}: ${error.message}`);
      this.updateJobStatus(jobId, {
        status: 'failed',
        error: error.message,
        progress: 0,
      });
    });
    
    // Send initial WebSocket update
    this.webSocketService.broadcastToClient(clientId, WebSocketEvent.JOB_PROGRESS, {
      jobId,
      service: 'text-to-image',
      status: 'pending',
      progress: 0,
      clientId,
      userId,
      message: 'Starting image generation'
    });

    // Return the job details
    return {
      jobId,
      status: job.status,
      progress: job.progress,
    };
  }



  /**
   * Clean up the prompt cache and stale jobs
   * Removes expired cache entries and completed jobs older than 24 hours
   */
  private cleanupCacheAndJobs(): void {
    const now = Date.now();
    
    // Clean up expired cache entries
    for (const [prompt, cacheItem] of this.promptCache.entries()) {
      if (now - cacheItem.timestamp > this.MAX_CACHE_AGE) {
        this.promptCache.delete(prompt);
      }
    }
    
    // If cache is still too large, remove oldest entries
    if (this.promptCache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = [...this.promptCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
      const entriesToRemove = sortedEntries.slice(0, this.promptCache.size - this.MAX_CACHE_SIZE);
      for (const [prompt] of entriesToRemove) {
        this.promptCache.delete(prompt);
      }
    }
    
    // Clean up stale jobs older than 24 hours
    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    for (const [jobId, job] of this.activeJobs.entries()) {
      const jobAge = now - job.updatedAt.getTime();
      if (jobAge > DAY_IN_MS && (job.status === 'succeeded' || job.status === 'failed')) {
        this.activeJobs.delete(jobId);
      }
    }
    
    logger.debug(`Cleaned up cache (${this.promptCache.size} items) and stale jobs (${this.activeJobs.size} active jobs remaining)`);
  }
  
  /**
   * Generate tags from a prompt using keyword extraction
   * 
   * @param prompt The text prompt
   * @returns Array of extracted tags
   */
  private async generateTags(prompt: string): Promise<string[]> {
    try {
      // Extract top keywords from the prompt to use as tags
      const words = prompt.toLowerCase().replace(/[^\w\s]/gi, ' ').split(/\s+/).filter(word => word.length > 2);
      
      // Define stopwords (common words to exclude)
      const stopwords = new Set([
        'the', 'and', 'for', 'with', 'from', 'this', 'that', 'these', 'those',
        'there', 'their', 'they', 'what', 'when', 'who', 'how', 'why', 'where',
        'which', 'will', 'would', 'could', 'should', 'into', 'more', 'some',
        'such', 'than', 'then', 'them', 'very', 'just', 'about', 'over'
      ]);
      
      // Filter out stopwords and get unique keywords
      const keywords = Array.from(new Set(
        words.filter(word => !stopwords.has(word))
      ));
      
      // Limit to top 10 keywords
      return keywords.slice(0, 10);
    } catch (error: any) {
      logger.error(`Error generating tags from prompt: ${error.message}`);
      // Return a few basic tags as fallback
      return ['ai-generated', 'image'];
    }
  }
  
  /**
   * Generate a cache key for a set of generation options
   * 
   * @param options Text-to-image options
   * @returns Cache key or null if not cacheable
   */
  private generateCacheKey(options: Partial<TextToImageOptions>): string | null {
    // Only cache if we have a prompt and no style reference
    if (!options.prompt || options.styleReference) {
      return null;
    }
    
    // Create a deterministic key from the options that affect the output
    return JSON.stringify({
      prompt: options.prompt,
      negativePrompt: options.negativePrompt || '',
      width: options.width || 1024,
      height: options.height || 1024,
      seed: options.seed
    });
  }
  
  /**
   * Process a text-to-image generation job
   * 
   * @param jobId Job identifier
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, {
        status: 'processing',
        progress: 10,
      });

      // Handle style reference if provided
      let styleReferencePayload = {};
      if (job.styleReference) {
        // Process the style reference (will be implemented based on the API)
        styleReferencePayload = {
          style_reference: job.styleReference,
          style_strength: job.styleStrength,
        };
      }

      // Call Stability AI API (this will need to be adapted to the chosen provider)
      const response = await axios.post(
        `${this.apiUrl}/v1/generation/text-to-image`,
        {
          text_prompts: [
            {
              text: job.prompt,
              weight: 1.0,
            },
            ...(job.negativePrompt ? [{
              text: job.negativePrompt,
              weight: -1.0,
            }] : []),
          ],
          height: job.height,
          width: job.width,
          samples: job.numVariations,
          ...(job.seed ? { seed: job.seed } : {}),
          ...styleReferencePayload,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      // Update progress as we get the API response
      await this.updateJobStatus(jobId, {
        progress: 50,
      });

      // Process the results
      const imageUrls: string[] = [];
      const assetIds: string[] = [];

      // Save the generated images temporarily and create assets
      for (let i = 0; i < response.data.artifacts.length; i++) {
        const artifact = response.data.artifacts[i];
        const imageData = artifact.base64;
        const imageSeed = artifact.seed;

        // Save to a temporary file
        const tempFilePath = path.join(this.uploadDir, `${jobId}_${i}.png`);
        await fs.promises.writeFile(tempFilePath, Buffer.from(imageData, 'base64'));

        // Update progress as we save each image
        await this.updateJobStatus(jobId, {
          progress: 50 + Math.floor((i + 1) / response.data.artifacts.length * 40),
          message: `Processing image ${i + 1} of ${response.data.artifacts.length}`
        });

        // Create a user-friendly URL for the image
        const imageUrl = `/uploads/${jobId}_${i}.png`;
        imageUrls.push(imageUrl);

        // Generate auto tags based on the prompt
        const promptTags = await this.generateTags(job.prompt);
        
        // Save image to asset library
        try {
          // Prepare a descriptive name with timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const shortPrompt = job.prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase();
          const filename = `${shortPrompt}-${timestamp}.png`;
          
          const assetResult = await this.assetService.uploadAsset({
            clientId: job.clientId,
            userId: job.userId,
            file: {
              path: tempFilePath,
              originalname: filename,
              mimetype: 'image/png',
            } as Express.Multer.File,
            metadata: {
              tags: [...new Set(['generated', 'text-to-image', ...promptTags])], // Remove duplicates
              prompt: job.prompt,
              negativePrompt: job.negativePrompt,
              seed: imageSeed,
              width: job.width,
              height: job.height,
              generatedBy: 'text-to-image',
              style: job.styleReference ? 'reference-based' : 'standard',
              description: `AI generated image from prompt: ${job.prompt}`,
            },
          });

          if (assetResult.success && assetResult.data) {
            assetIds.push(assetResult.data.id);
          }
        } catch (error: any) {
          logger.error(`Failed to save generated image to assets: ${error.message}`);
          // We continue even if asset creation fails
        }
      }

      // Update job with results
      await this.updateJobStatus(jobId, {
        status: 'succeeded',
        progress: 100,
        results: imageUrls,
        assetIds,
        message: 'Image generation completed successfully'
      });;
      
      // Store in cache if this is a standard prompt without style reference
      if (!job.styleReference && job.prompt) {
        const cacheKey = this.generateCacheKey({
          prompt: job.prompt,
          negativePrompt: job.negativePrompt,
          width: job.width,
          height: job.height,
          seed: job.seed
        });
        
        if (cacheKey) {
          this.promptCache.set(cacheKey, {
            results: imageUrls,
            assetIds,
            timestamp: Date.now()
          });
          logger.debug(`Cached results for prompt: ${job.prompt.substring(0, 50)}...`);
        }
      }

      logger.info(`Text-to-image job ${jobId} completed successfully`);
    } catch (error: any) {
      logger.error(`Error in text-to-image job ${jobId}: ${error.message}`);
      
      // Update job status to failed
      await this.updateJobStatus(jobId, {
        status: 'failed',
        error: error.message || 'Unknown error occurred',
        progress: 0,
      });
    }
  }


  
  /**
   * Update the status of a text-to-image job and send WebSocket notifications
   * 
   * @param jobId Job identifier
   * @param updates Partial updates to apply to the job
   */
  private async updateJobStatus(jobId: string, updates: Partial<TextToImageJob>): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Apply updates
    Object.assign(job, {
      ...updates,
      updatedAt: new Date(),
    });
    
    // Send WebSocket update if progress or status changed
    if ('progress' in updates || 'status' in updates) {
      // Broadcast to client room
      if (job.clientId) {
        this.webSocketService.broadcastToClient(job.clientId, WebSocketEvent.JOB_PROGRESS, {
          jobId: job.id,
          service: 'text-to-image',
          status: job.status,
          progress: job.progress,
          message: updates.message || (job.status === 'failed' ? job.error : undefined),
          clientId: job.clientId,
          userId: job.userId
        });
      }
    }

    // If the job is completed (succeeded or failed), we could clean up temporary resources
    if (job.status === 'succeeded' || job.status === 'failed') {
      // Eventually we could implement cleanup logic here
    }

    // Broadcast the status update (in a real implementation, this would use WebSockets)
    // broadcastJobUpdate(jobId, job); - Placeholder for WebSocket implementation
  }

  /**
   * Check the status of a text-to-image job
   * 
   * @param jobId Job identifier
   * @returns Current job status and results if available
   */
  async checkStatus(jobId: string): Promise<TextToImageResult> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    return {
      jobId,
      status: job.status,
      progress: job.progress,
      error: job.error,
      imageUrls: job.results,
      assetIds: job.assetIds,
    };
  }

  /**
   * Get a list of all active jobs for a client
   * 
   * @param clientId Client identifier
   * @returns List of active jobs
   */
  getClientJobs(clientId: string): TextToImageResult[] {
    const clientJobs: TextToImageResult[] = [];
    
    this.activeJobs.forEach(job => {
      if (job.clientId === clientId) {
        clientJobs.push({
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          error: job.error,
          imageUrls: job.results,
          assetIds: job.assetIds,
        });
      }
    });
    
    return clientJobs;
  }

  /**
   * Cancel a text-to-image job if it's still processing
   * 
   * @param jobId Job identifier
   * @returns Success status
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Only allow cancelling jobs that are pending or processing
    if (job.status === 'pending' || job.status === 'processing') {
      await this.updateJobStatus(jobId, {
        status: 'failed',
        error: 'Job cancelled by user',
        progress: 0,
      });
      return true;
    }

    return false;
  }
}

// Export a singleton instance
export const textToImageService = new TextToImageService();
