import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { assetService } from './assetService.new';
import { WebSocketService } from './WebSocketService';
import { WebSocketEvent } from '../types/websocket.types';

/**
 * Represents a music generation job
 */
export interface MusicGenerationJob {
  id: string;
  clientId: string;
  userId: string;
  prompt: string;
  genre?: string;
  mood?: string;
  tempo?: number;
  duration?: number; // Requested duration in seconds
  includeTracks?: boolean;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  error?: string;
  message?: string; // Status message for UI display
  audioUrl?: string; // URL to generated music
  waveformUrl?: string; // URL to waveform image
  assetId?: string; // ID of asset created
  actualDuration?: number; // Actual duration of the generated music in seconds
  individualTracks?: {
    name: string;
    url: string;
    assetId?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Options for generating music from prompts
 */
export interface MusicGenerationOptions {
  prompt: string;
  genre?: string;
  mood?: string;
  tempo?: number;
  duration?: number;
  includeTracks?: boolean;
}

/**
 * Result from a music generation
 */
export interface MusicGenerationResult {
  jobId: string;
  status: string;
  progress: number;
  error?: string;
  audioUrl?: string;
  waveformUrl?: string;
  assetId?: string;
  duration?: number;
  individualTracks?: {
    name: string;
    url: string;
    assetId?: string;
  }[];
}

// Create a logger with the appropriate context
const logger = createLogger('MusicGenerationService');

/**
 * Service for generating music from text prompts using AI
 * Handles job management, API integration, result processing, and WebSocket communication
 */
class MusicGenerationService {
  private apiKey: string;
  private apiUrl: string;
  private activeJobs: Map<string, MusicGenerationJob>;
  private uploadDir: string;
  private assetService: typeof assetService;
  private webSocketService: WebSocketService;
  
  // Available genres and moods for the service
  private availableGenres: string[] = [
    'Pop', 'Rock', 'Electronic', 'Hip Hop', 'R&B', 'Jazz', 'Classical', 'Ambient', 
    'Folk', 'Country', 'Blues', 'Metal', 'Reggae', 'World', 'Experimental'
  ];
  
  private availableMoods: string[] = [
    'Happy', 'Sad', 'Energetic', 'Calm', 'Epic', 'Romantic', 'Scary', 'Mysterious',
    'Peaceful', 'Aggressive', 'Playful', 'Nostalgic', 'Uplifting', 'Tense', 'Dreamy'
  ];

  constructor() {
    this.apiKey = process.env.MUBERT_API_KEY || '';
    this.apiUrl = 'https://api.mubert.com/v2';
    this.uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    this.activeJobs = new Map<string, MusicGenerationJob>();
    this.assetService = assetService;
    this.webSocketService = WebSocketService.getInstance();
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    
    // Create music directory if it doesn't exist
    const musicDir = path.join(this.uploadDir, 'music');
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true });
    }

    // Validate API key
    if (!this.apiKey) {
      logger.warn('Missing MUBERT_API_KEY environment variable for music generation service');
    }
    
    // Start a periodic cleanup of stale jobs
    setInterval(() => this.cleanupStaleJobs(), 30 * 60 * 1000); // Run every 30 minutes
  }

  /**
   * Get available genres for the service
   * 
   * @returns List of available genres
   */
  getAvailableGenres() {
    return this.availableGenres;
  }
  
  /**
   * Get available moods for the service
   * 
   * @returns List of available moods
   */
  getAvailableMoods() {
    return this.availableMoods;
  }

  /**
   * Generate music from a prompt and optional parameters
   * 
   * @param clientId Client identifier
   * @param userId User identifier
   * @param options Generation options including prompt, genre, mood, etc.
   * @returns Job ID and initial status
   */
  async generateMusic(clientId: string, userId: string, options: MusicGenerationOptions): Promise<MusicGenerationResult> {
    // Validate inputs
    if (!options.prompt) {
      throw new Error('Prompt is required');
    }

    // Default values
    const genre = options.genre || '';
    const mood = options.mood || '';
    const tempo = options.tempo || 120;
    const duration = options.duration || 30;
    const includeTracks = options.includeTracks || false;

    // Create a new job
    const jobId = uuidv4();
    const job: MusicGenerationJob = {
      id: jobId,
      clientId,
      userId,
      prompt: options.prompt,
      genre,
      mood,
      tempo,
      duration,
      includeTracks,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store the job
    this.activeJobs.set(jobId, job);
    logger.info(`Created music generation job ${jobId} for client ${clientId}`);

    // Start the generation process asynchronously
    this.processJob(jobId).catch(error => {
      logger.error(`Error processing music generation job ${jobId}: ${error.message}`);
      this.updateJobStatus(jobId, {
        status: 'failed',
        error: error.message,
        progress: 0,
      });
    });
    
    // Send initial WebSocket update
    this.webSocketService.broadcastToClient(clientId, WebSocketEvent.JOB_PROGRESS, {
      jobId,
      service: 'music',
      status: 'pending',
      progress: 0,
      clientId,
      userId,
      message: 'Starting music generation'
    });

    // Return the job details
    return {
      jobId,
      status: job.status,
      progress: job.progress,
    };
  }

  /**
   * Get the status of a specific job
   * 
   * @param jobId Job identifier
   * @returns Current job status or null if not found
   */
  async getJobStatus(jobId: string): Promise<MusicGenerationResult | null> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error,
      audioUrl: job.audioUrl,
      waveformUrl: job.waveformUrl,
      assetId: job.assetId,
      duration: job.duration,
      individualTracks: job.individualTracks
    };
  }

  /**
   * Process a music generation job
   * 
   * @param jobId Job identifier to process
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    try {
      // Update job status to processing
      this.updateJobStatus(jobId, {
        status: 'processing',
        progress: 10,
        message: 'Analyzing prompt and parameters'
      });

      // Update progress to show we've started
      await new Promise(resolve => setTimeout(resolve, 500));
      this.updateJobStatus(jobId, {
        progress: 20,
        message: 'Composing musical structure'
      });
      
      // Simulate API call to music generation service
      // In production, replace this with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.updateJobStatus(jobId, {
        progress: 40,
        message: 'Generating melody and harmony'
      });
      
      // REPLACE THIS WITH ACTUAL API CALL IN PRODUCTION
      // Example API call to Mubert or similar service:
      /*
      const response = await axios.post(
        `${this.apiUrl}/generate-track`,
        {
          prompt: job.prompt,
          genre: job.genre,
          mood: job.mood,
          tempo: job.tempo,
          duration: job.duration,
          separate_stems: job.includeTracks
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          }
        }
      );
      */
      
      // For now, just simulate a delay as if we were generating music
      await new Promise(resolve => setTimeout(resolve, 3000));
      this.updateJobStatus(jobId, {
        progress: 70,
        message: 'Adding instrumentation and effects'
      });
      
      // Simulate additional processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.updateJobStatus(jobId, {
        progress: 85,
        message: 'Finalizing composition'
      });
      
      // Simulate saving the file
      const musicFilename = `music_${jobId}.mp3`;
      const musicPath = path.join(this.uploadDir, 'music', musicFilename);
      
      // In real implementation, save the buffer from the API response
      // For now, just create a placeholder
      // fs.writeFileSync(musicPath, response.data.audio);
      
      // Create a fake Express.Multer.File object from the music file
      // In a real implementation, we'd have actual file data from the API
      const musicFile = {
        buffer: Buffer.from('dummy audio data'),  // Placeholder in demo
        originalname: musicFilename,
        mimetype: 'audio/mpeg',
        size: 1024  // Placeholder size
      } as Express.Multer.File;
      
      // Make sure the directory exists
      const musicDir = path.join(this.uploadDir, 'music');
      if (!fs.existsSync(musicDir)) {
        fs.mkdirSync(musicDir, { recursive: true });
      }
      
      // Write placeholder data to file
      fs.writeFileSync(musicPath, Buffer.from('dummy audio data'));
      
      // Register the generated music as an asset
      const assetResult = await this.assetService.uploadAsset(
        musicFile,
        job.userId,
        {
          clientId: job.clientId,
          ownerId: job.userId,
          name: `Music - ${new Date().toLocaleString()}`,
          metadata: {
            assetType: 'audio',
            prompt: job.prompt,
            genre: job.genre,
            mood: job.mood,
            tempo: job.tempo,
            duration: job.duration || 30
          }
        }
      );
      
      if (!assetResult.success) {
        throw new Error(`Failed to register music asset: ${assetResult.message}`);
      }
      
      // Make sure we have asset data before proceeding
      if (!assetResult.data) {
        throw new Error('Asset creation succeeded but returned no data');
      }
      
      // Use the created asset's URL as the audioUrl
      const assetId = assetResult.data.id;
      const audioUrl = `/api/assets/${assetId}/file`; // This URL should match your asset retrieval route
      
      // Generate a waveform image (would be part of the real implementation)
      const waveformUrl = `/api/assets/${assetId}/waveform`;
      
      let individualTracks: MusicGenerationJob['individualTracks'] = undefined;
      
      // If individual tracks were requested, create assets for those too
      if (job.includeTracks) {
        // In a real implementation, these would be created from the separate stems
        // provided by the music generation API
        const trackNames = ['Drums', 'Bass', 'Melody', 'Harmony'];
        individualTracks = [];
        
        for (const trackName of trackNames) {
          const trackFilename = `music_${jobId}_${trackName.toLowerCase()}.mp3`;
          const trackPath = path.join(this.uploadDir, 'music', trackFilename);
          
          // Create a dummy file for the track
          const trackFile = {
            buffer: Buffer.from('dummy track data'),  // Placeholder in demo
            originalname: trackFilename,
            mimetype: 'audio/mpeg',
            size: 1024  // Placeholder size
          } as Express.Multer.File;
          
          // Write placeholder data to file
          fs.writeFileSync(trackPath, Buffer.from('dummy track data'));
          
          // Create an asset for each track
          const trackAssetResult = await this.assetService.uploadAsset(
            trackFile,
            job.userId,
            {
              clientId: job.clientId,
              ownerId: job.userId,
              name: `Music Track - ${trackName}`,
              metadata: {
                assetType: 'audio',
                prompt: job.prompt,
                genre: job.genre,
                mood: job.mood,
                track_type: trackName,
                parent_id: assetId
              }
            }
          );
          
          if (trackAssetResult.success && trackAssetResult.data) {
            const trackAssetId = trackAssetResult.data.id;
            individualTracks.push({
              name: trackName,
              url: `/api/assets/${trackAssetId}/file`,
              assetId: trackAssetId
            });
          }
        }
      }
      
      // Update job with success status and asset information
      this.updateJobStatus(jobId, {
        status: 'succeeded',
        progress: 100,
        audioUrl,
        waveformUrl,
        assetId,
        duration: job.duration,
        individualTracks,
        message: 'Music generated successfully'
      });
      
      logger.info(`Successfully completed music generation job ${jobId}`);
      
    } catch (error: any) {
      logger.error(`Error in music generation job ${jobId}: ${error.message}`);
      this.updateJobStatus(jobId, {
        status: 'failed',
        error: `Music generation failed: ${error.message}`,
        progress: 0,
        message: 'An error occurred during generation'
      });
    }
  }

  /**
   * Update job status and broadcast the update via WebSocket
   * 
   * @param jobId Job identifier
   * @param updates Updates to apply to the job
   */
  private updateJobStatus(jobId: string, updates: Partial<MusicGenerationJob>): void {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return;
    }

    // Update the job
    Object.assign(job, {
      ...updates,
      updatedAt: new Date()
    });

    // Broadcast status update with message including additional data
    const additionalData = {
      audioUrl: job.audioUrl,
      waveformUrl: job.waveformUrl,
      assetId: job.assetId,
      duration: job.duration,
      individualTracks: job.individualTracks
    };
    
    this.webSocketService.broadcastToClient(job.clientId, WebSocketEvent.JOB_PROGRESS, {
      jobId,
      service: 'music',
      status: job.status,
      progress: job.progress,
      // Include the additional data in the message as JSON if available
      message: job.audioUrl ? 
        `${job.message || ''} ${JSON.stringify(additionalData)}`.trim() : 
        (job.message || ''),
      error: job.error,
      clientId: job.clientId,
      userId: job.userId
    });
  }

  /**
   * Clean up stale jobs to prevent memory leaks
   * Removes completed and failed jobs older than 24 hours
   */
  private cleanupStaleJobs(): void {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.activeJobs.entries()) {
      // Remove completed or failed jobs that are older than 24 hours
      if ((job.status === 'succeeded' || job.status === 'failed') && 
          job.updatedAt < twentyFourHoursAgo) {
        this.activeJobs.delete(jobId);
        logger.debug(`Cleaned up stale job ${jobId}`);
      }
    }
  }
}

// Export a singleton instance
export const musicGenerationService = new MusicGenerationService();
