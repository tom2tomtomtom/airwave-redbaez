import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { assetService } from './assetService.new';
import { WebSocketService } from './WebSocketService';
import { WebSocketEvent } from '../types/websocket.types';

/**
 * Represents a subtitle generation job
 */
export interface SubtitleJob {
  id: string;
  clientId: string;
  userId: string;
  assetId: string;
  videoUrl: string;
  sourceLanguage: string;
  targetLanguages: string[];
  styleOptions?: SubtitleStyleOptions;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  error?: string;
  message?: string; // Status message for UI display
  results?: SubtitleResult[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Style options for subtitles
 */
export interface SubtitleStyleOptions {
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  opacity?: number;
  position?: 'bottom' | 'top' | 'middle';
  textAlign?: 'left' | 'center' | 'right';
  applyBrandGuidelines?: boolean;
}

/**
 * Result for a generated subtitle
 */
export interface SubtitleResult {
  language: string;
  format: 'srt' | 'vtt' | 'json';
  url: string;
  assetId?: string;
}

/**
 * Options for generating subtitles
 */
export interface SubtitleOptions {
  assetId: string;
  videoUrl: string;
  sourceLanguage?: string;
  targetLanguages?: string[];
  styleOptions?: SubtitleStyleOptions;
}

/**
 * Represents a subtitle entry with timing and text
 */
export interface SubtitleEntry {
  index: number;
  startTime: string; // Format: 00:00:00,000
  endTime: string;   // Format: 00:00:00,000
  text: string;
}

// Create a logger with the appropriate context
const logger = createLogger('SubtitleService');

/**
 * Service for generating and managing subtitles for videos
 * Handles job management, API integration, result processing, and WebSocket communication
 */
class SubtitleService {
  private apiKey: string;
  private apiUrl: string;
  private activeJobs: Map<string, SubtitleJob>;
  private uploadDir: string;
  private assetService: typeof assetService;
  private webSocketService: WebSocketService;
  
  // Available languages for subtitle generation
  private availableLanguages: Array<{code: string, name: string}> = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'ru', name: 'Russian' },
    { code: 'hi', name: 'Hindi' }
  ];

  constructor() {
    this.apiKey = process.env.ASSEMBLY_AI_API_KEY || '';
    this.apiUrl = 'https://api.assemblyai.com/v2';
    this.uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    this.activeJobs = new Map<string, SubtitleJob>();
    this.assetService = assetService;
    this.webSocketService = WebSocketService.getInstance();
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    
    // Create subtitles directory if it doesn't exist
    const subtitlesDir = path.join(this.uploadDir, 'subtitles');
    if (!fs.existsSync(subtitlesDir)) {
      fs.mkdirSync(subtitlesDir, { recursive: true });
    }

    // Validate API key
    if (!this.apiKey) {
      logger.warn('Missing ASSEMBLY_AI_API_KEY environment variable for subtitle service');
    }
    
    // Start a periodic cleanup of stale jobs
    setInterval(() => this.cleanupStaleJobs(), 30 * 60 * 1000); // Run every 30 minutes
  }

  /**
   * Get available languages for subtitle generation
   * 
   * @returns List of available languages
   */
  getAvailableLanguages() {
    return this.availableLanguages;
  }

  /**
   * Generate subtitles for a video
   * 
   * @param clientId Client identifier
   * @param userId User identifier
   * @param options Generation options including video source and languages
   * @returns Job ID and initial status
   */
  async generateSubtitles(clientId: string, userId: string, options: SubtitleOptions): Promise<{ jobId: string, status: string, progress: number }> {
    // Validate inputs
    if (!options.assetId) {
      throw new Error('Asset ID is required');
    }
    
    if (!options.videoUrl) {
      throw new Error('Video URL is required');
    }

    // Default values
    const sourceLanguage = options.sourceLanguage || 'en';
    const targetLanguages = options.targetLanguages || [sourceLanguage];
    const styleOptions = options.styleOptions || {};

    // Create a new job
    const jobId = uuidv4();
    const job: SubtitleJob = {
      id: jobId,
      clientId,
      userId,
      assetId: options.assetId,
      videoUrl: options.videoUrl,
      sourceLanguage,
      targetLanguages,
      styleOptions,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store the job
    this.activeJobs.set(jobId, job);
    logger.info(`Created subtitle job ${jobId} for client ${clientId}`);

    // Start the generation process asynchronously
    this.processJob(jobId).catch(error => {
      logger.error(`Error processing subtitle job ${jobId}: ${error.message}`);
      this.updateJobStatus(jobId, {
        status: 'failed',
        error: error.message,
        progress: 0,
      });
    });
    
    // Send initial WebSocket update
    this.webSocketService.broadcastToClient(clientId, WebSocketEvent.JOB_PROGRESS, {
      jobId,
      service: 'subtitle',
      status: 'pending',
      progress: 0,
      clientId,
      userId,
      message: 'Starting subtitle generation'
    });

    // Return the job details
    return {
      jobId,
      status: job.status,
      progress: job.progress,
    };
  }

  /**
   * Get the status of a specific subtitle job
   * 
   * @param jobId Job identifier
   * @returns Current job status or null if not found
   */
  async getJobStatus(jobId: string): Promise<{ jobId: string, status: string, progress: number, results?: SubtitleResult[] } | null> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      results: job.results
    };
  }

  /**
   * Get all subtitle jobs for a specific client
   * 
   * @param clientId Client identifier
   * @returns List of subtitle jobs for the client
   */
  async getClientJobs(clientId: string): Promise<Array<{ jobId: string, status: string, assetId: string, progress: number, createdAt: Date }>> {
    // Filter jobs by client ID and return basic information
    return Array.from(this.activeJobs.values())
      .filter(job => job.clientId === clientId)
      .map(job => ({
        jobId: job.id,
        status: job.status,
        assetId: job.assetId,
        progress: job.progress,
        createdAt: job.createdAt
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by creation date desc
  }

  /**
   * Process a subtitle generation job
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
        message: 'Preparing video for transcription'
      });

      // Update progress to show we've started
      await new Promise(resolve => setTimeout(resolve, 500));
      this.updateJobStatus(jobId, {
        progress: 20,
        message: 'Extracting audio from video'
      });
      
      // Simulate API call to speech-to-text service
      // In production, replace this with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.updateJobStatus(jobId, {
        progress: 40,
        message: 'Transcribing audio content'
      });
      
      // REPLACE THIS WITH ACTUAL API CALL IN PRODUCTION
      // Example API call to Assembly AI:
      /*
      // 1. Submit the video/audio for transcription
      const transcriptionResponse = await axios.post(
        `${this.apiUrl}/transcript`,
        {
          audio_url: job.videoUrl,
          language_code: job.sourceLanguage
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.apiKey,
          }
        }
      );
      
      const transcriptId = transcriptionResponse.data.id;
      
      // 2. Poll for completion
      let transcriptResult;
      let isComplete = false;
      
      while (!isComplete) {
        const pollingResponse = await axios.get(
          `${this.apiUrl}/transcript/${transcriptId}`,
          {
            headers: {
              'Authorization': this.apiKey
            }
          }
        );
        
        transcriptResult = pollingResponse.data;
        
        if (transcriptResult.status === 'completed' || transcriptResult.status === 'error') {
          isComplete = true;
        } else {
          // Update progress based on processing status
          const pollingProgress = transcriptResult.status === 'queued' ? 30 : 
                                 transcriptResult.status === 'processing' ? 50 : 60;
          
          this.updateJobStatus(jobId, {
            progress: pollingProgress,
            message: `Transcription ${transcriptResult.status}`
          });
          
          // Wait before polling again
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      
      if (transcriptResult.status === 'error') {
        throw new Error(`Transcription failed: ${transcriptResult.error}`);
      }
      */
      
      // For now, just simulate a delay as if we were generating transcription
      await new Promise(resolve => setTimeout(resolve, 3000));
      this.updateJobStatus(jobId, {
        progress: 60,
        message: 'Generating timestamps and alignment'
      });
      
      // Simulate additional processing for each target language
      const results: SubtitleResult[] = [];
      
      for (const language of job.targetLanguages) {
        await new Promise(resolve => setTimeout(resolve, 500));
        this.updateJobStatus(jobId, {
          progress: 70,
          message: `Generating ${this.getLanguageName(language)} subtitles`
        });
        
        // In real implementation, translate if needed and format subtitles
        // For now, just create placeholder subtitle files
        for (const format of ['srt', 'vtt']) {
          const subtitleFilename = `subtitle_${jobId}_${language}.${format}`;
          const subtitlePath = path.join(this.uploadDir, 'subtitles', subtitleFilename);
          
          // Create a dummy subtitle file for testing
          const dummyContent = this.generateDummySubtitles(format as 'srt' | 'vtt');
          fs.writeFileSync(subtitlePath, dummyContent);
          
          // Create a fake Express.Multer.File object from the subtitle file
          const subtitleBuffer = fs.readFileSync(subtitlePath);
          const subtitleFile = {
            buffer: subtitleBuffer,
            originalname: `subtitle_${language}.${format}`,
            mimetype: format === 'srt' ? 'application/x-subrip' : 'text/vtt',
            size: subtitleBuffer.length
          } as Express.Multer.File;
          
          // Register the generated subtitle as an asset
          const assetResult = await this.assetService.uploadAsset(
            subtitleFile,
            job.userId,
            {
              clientId: job.clientId,
              ownerId: job.userId, // Required by AssetUploadOptions
              name: `Subtitle - ${this.getLanguageName(language)} (${format.toUpperCase()})`,
              metadata: {
                assetType: 'subtitle', // Store type in metadata instead
                language,
                format,
                sourceAssetId: job.assetId,
                generatedBy: 'subtitleService'
              }
            }
          );
          
          if (assetResult.success && assetResult.data) {
            results.push({
              language,
              format: format as 'srt' | 'vtt',
              url: `/api/assets/${assetResult.data.id}/file`,
              assetId: assetResult.data.id
            });
          } else {
            logger.error(`Failed to register subtitle asset: ${assetResult.message}`);
          }
        }
      }
      
      // Apply styling if needed
      if (job.styleOptions) {
        await new Promise(resolve => setTimeout(resolve, 500));
        this.updateJobStatus(jobId, {
          progress: 85,
          message: 'Applying style formatting to subtitles'
        });
        
        // In real implementation, this would update the styling of the VTT files
      }
      
      // Update job with success status and results
      this.updateJobStatus(jobId, {
        status: 'succeeded',
        progress: 100,
        results,
        message: 'Subtitles generated successfully'
      });
      
      logger.info(`Successfully completed subtitle job ${jobId}`);
      
    } catch ($1: unknown) {
      logger.error(`Error in subtitle job ${jobId}: ${error.message}`);
      this.updateJobStatus(jobId, {
        status: 'failed',
        error: `Subtitle generation failed: ${error.message}`,
        progress: 0,
        message: 'An error occurred during generation'
      });
    }
  }
  
  /**
   * Generate dummy subtitles for testing
   * 
   * @param format Format of the subtitles
   * @returns Dummy subtitle content
   */
  private generateDummySubtitles(format: 'srt' | 'vtt'): string {
    if (format === 'srt') {
      return `1
00:00:01,000 --> 00:00:04,000
Welcome to AIrWAVE platform.

2
00:00:05,000 --> 00:00:08,000
This is a sample subtitle file.

3
00:00:09,000 --> 00:00:12,000
Generated for testing purposes.
`;
    } else { // vtt
      return `WEBVTT

00:00:01.000 --> 00:00:04.000
Welcome to AIrWAVE platform.

00:00:05.000 --> 00:00:08.000
This is a sample subtitle file.

00:00:09.000 --> 00:00:12.000
Generated for testing purposes.
`;
    }
  }
  
  /**
   * Get language name from language code
   * 
   * @param code Language code
   * @returns Language name
   */
  private getLanguageName(code: string): string {
    const language = this.availableLanguages.find(lang => lang.code === code);
    return language ? language.name : code;
  }

  /**
   * Update job status and broadcast the update via WebSocket
   * 
   * @param jobId Job identifier
   * @param updates Updates to apply to the job
   */
  private updateJobStatus(jobId: string, updates: Partial<SubtitleJob>): void {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return;
    }

    // Update the job
    Object.assign(job, {
      ...updates,
      updatedAt: new Date()
    });

    // Broadcast status update
    this.webSocketService.broadcastToClient(job.clientId, WebSocketEvent.JOB_PROGRESS, {
      jobId,
      service: 'subtitle',
      status: job.status,
      progress: job.progress,
      // Combine message with results if available
      message: job.results ? 
        `${job.message || ''} ${JSON.stringify({ results: job.results })}` : 
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
export const subtitleService = new SubtitleService();
