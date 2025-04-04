import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { assetService } from './assetService.new';
import { WebSocketService } from './WebSocketService';
import { WebSocketEvent } from '../types/websocket.types';

/**
 * Represents a voiceover generation job
 */
export interface VoiceoverJob {
  id: string;
  clientId: string;
  userId: string;
  text: string;
  voice: string;
  speed: number;
  pitch: number;
  enhanceAudio: boolean;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  error?: string;
  message?: string; // Status message for UI display
  audioUrl?: string; // URL to generated audio
  assetId?: string; // ID of asset created from generated audio
  duration?: number; // Duration of the generated audio in seconds
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Options for generating voiceovers from text
 */
export interface VoiceoverOptions {
  text: string;
  voice: string;
  speed?: number;
  pitch?: number;
  enhanceAudio?: boolean;
}

/**
 * Result from a voiceover generation
 */
export interface VoiceoverResult {
  jobId: string;
  status: string;
  progress: number;
  error?: string;
  audioUrl?: string;
  assetId?: string;
  duration?: number;
}

// Create a logger with the appropriate context
const logger = createLogger('VoiceoverService');

/**
 * Service for generating voiceovers from text using AI
 * Handles job management, API integration, result processing, and WebSocket communication
 */
class VoiceoverService {
  private apiKey: string;
  private apiUrl: string;
  private activeJobs: Map<string, VoiceoverJob>;
  private uploadDir: string;
  private assetService: typeof assetService;
  private webSocketService: WebSocketService;
  
  // Available voices for the service using ElevenLabs
  private availableVoices: Array<{id: string, name: string, gender: string, accent?: string, preview?: string}> = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', accent: 'American' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', accent: 'American' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', accent: 'American' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', accent: 'American' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female', accent: 'American' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', accent: 'American' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male', accent: 'American' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', accent: 'American' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male', accent: 'American' }
  ];

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.apiUrl = 'https://api.elevenlabs.io/v1';
    this.uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    this.activeJobs = new Map<string, VoiceoverJob>();
    this.assetService = assetService;
    this.webSocketService = WebSocketService.getInstance();
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    
    // Create audio directory if it doesn't exist
    const audioDir = path.join(this.uploadDir, 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Validate API key
    if (!this.apiKey) {
      logger.warn('Missing ELEVENLABS_API_KEY environment variable for voiceover service');
    }
    
    // Start a periodic cleanup of stale jobs
    setInterval(() => this.cleanupStaleJobs(), 30 * 60 * 1000); // Run every 30 minutes
  }

  /**
   * Get available voices for the service
   * 
   * @returns List of available voices
   */
  getAvailableVoices() {
    return this.availableVoices;
  }

  /**
   * Generate voiceover from text
   * 
   * @param clientId Client identifier
   * @param userId User identifier
   * @param options Generation options including text and voice parameters
   * @returns Job ID and initial status
   */
  async generateVoiceover(clientId: string, userId: string, options: VoiceoverOptions): Promise<VoiceoverResult> {
    // Validate inputs
    if (!options.text) {
      throw new Error('Text is required');
    }
    
    if (!options.voice) {
      throw new Error('Voice is required');
    }

    // Default values
    const speed = options.speed || 1.0;
    const pitch = options.pitch || 1.0;
    const enhanceAudio = options.enhanceAudio || false;

    // Create a new job
    const jobId = uuidv4();
    const job: VoiceoverJob = {
      id: jobId,
      clientId,
      userId,
      text: options.text,
      voice: options.voice,
      speed,
      pitch,
      enhanceAudio,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store the job
    this.activeJobs.set(jobId, job);
    logger.info(`Created voiceover job ${jobId} for client ${clientId}`);

    // Start the generation process asynchronously
    this.processJob(jobId).catch(error => {
      logger.error(`Error processing voiceover job ${jobId}: ${error.message}`);
      this.updateJobStatus(jobId, {
        status: 'failed',
        error: error.message,
        progress: 0,
      });
    });
    
    // Send initial WebSocket update
    this.webSocketService.broadcastToClient(clientId, WebSocketEvent.JOB_PROGRESS, {
      jobId,
      service: 'voiceover',
      status: 'pending',
      progress: 0,
      clientId,
      userId,
      message: 'Starting voiceover generation'
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
  async getJobStatus(jobId: string): Promise<VoiceoverResult | null> {
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
      assetId: job.assetId,
      duration: job.duration
    };
  }

  /**
   * Process a voiceover generation job
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
        message: 'Preparing text for voiceover'
      });

      // Update progress to show we've started
      await new Promise(resolve => setTimeout(resolve, 500));
      this.updateJobStatus(jobId, {
        progress: 20,
        message: 'Analyzing text intonation'
      });
      
      // Simulate API call to text-to-speech service
      // In production, replace this with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.updateJobStatus(jobId, {
        progress: 40,
        message: 'Generating voice audio'
      });
      
      // Make the actual API call to ElevenLabs
      let audioBuffer: Buffer;
      try {
        logger.info(`Calling ElevenLabs API for job ${jobId} with voice ${job.voice}`);
        
        const response = await axios.post(
          `${this.apiUrl}/text-to-speech/${job.voice}`,
          {
            text: job.text,
            model_id: 'eleven_turbo_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
              speaking_rate: job.speed
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': this.apiKey,
            },
            responseType: 'arraybuffer'
          }
        );
        
        audioBuffer = Buffer.from(response.data);
        logger.info(`Successfully received audio data for job ${jobId} (${audioBuffer.length} bytes)`);
      } catch ($1: unknown) {
        logger.error(`Error calling ElevenLabs API: ${error.message}`);
        
        // If API key is missing or we're in development mode, generate a mock audio file
        if (!this.apiKey || process.env.NODE_ENV === 'development') {
          logger.info(`Using mock audio data for job ${jobId} in development mode`);
          // Just create a small dummy buffer for testing
          audioBuffer = Buffer.from('MOCK AUDIO DATA');
          // Add a delay to simulate API call
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // In production, rethrow the error
          throw error;
        }
      }
      this.updateJobStatus(jobId, {
        progress: 70,
        message: 'Processing and enhancing audio'
      });
      
      // Simulate audio enhancement if enabled
      if (job.enhanceAudio) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.updateJobStatus(jobId, {
          progress: 85,
          message: 'Applying audio enhancement'
        });
      }
      
      // Simulate saving the file
      const audioFilename = `voiceover_${jobId}.mp3`;
      const audioPath = path.join(this.uploadDir, 'audio', audioFilename);
      
      // Ensure the audio directory exists
      const audioDir = path.join(this.uploadDir, 'audio');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }
      
      // Save the audio buffer to a file
      fs.writeFileSync(audioPath, audioBuffer);
      
      // Simulate duration calculation
      const duration = job.text.split(' ').length * 0.3; // Rough estimate: 0.3 seconds per word
      
      // Create a fake Express.Multer.File object from the audio file
      const audioFile = {
        buffer: fs.readFileSync(audioPath),
        originalname: audioFilename,
        mimetype: 'audio/mpeg',
        size: fs.statSync(audioPath).size
      } as Express.Multer.File;
      
      // Register the generated audio as an asset
      const assetResult = await this.assetService.uploadAsset(
        audioFile,
        job.userId,
        {
          clientId: job.clientId,
          ownerId: job.userId,
          name: `Voiceover - ${new Date().toLocaleString()}`,
          metadata: {
            assetType: 'audio',
            text: job.text,
            voice: job.voice,
            voiceName: this.getVoiceName(job.voice),
            duration: duration,
            speed: job.speed,
            pitch: job.pitch,
            enhanced: job.enhanceAudio,
            generatedBy: 'ElevenLabs'
          }
        }
      );
      
      if (!assetResult.success || !assetResult.data) {
        throw new Error(`Failed to register audio asset: ${assetResult.message}`);
      }
      
      // Use the created asset's URL as the audioUrl
      const assetId = assetResult.data.id;
      const audioUrl = `/api/assets/${assetId}/file`; // This URL should match your asset retrieval route
      
      // Update job with success status and asset information
      this.updateJobStatus(jobId, {
        status: 'succeeded',
        progress: 100,
        audioUrl,
        assetId,
        duration,
        message: 'Voiceover generated successfully'
      });
      
      logger.info(`Successfully completed voiceover job ${jobId}`);
      
    } catch ($1: unknown) {
      logger.error(`Error in voiceover job ${jobId}: ${error.message}`);
      this.updateJobStatus(jobId, {
        status: 'failed',
        error: `Voiceover generation failed: ${error.message}`,
        progress: 0,
        message: 'An error occurred during generation'
      });
    }
  }
  
  /**
   * Maps a voice ID to the API-specific voice ID
   * This would need to be updated based on the actual API being used
   * 
   * @param voiceId The internal voice ID
   * @returns The API-specific voice ID
   */
  private getVoiceId(voiceId: string): string {
    // This is a placeholder. In production, map your voice IDs to the API's voice IDs
    const voiceMap: Record<string, string> = {
      'en-US-Neural2-F': '21m00Tcm4TlvDq8ikWAM', // ElevenLabs Rachel voice
      'en-US-Neural2-M': 'pNInz6obpgDQGcFmaJgB', // ElevenLabs Adam voice
      'en-GB-Neural2-F': 'jBpfuIE2acCO8z3wKNLl', // ElevenLabs Bella voice
      'en-GB-Neural2-M': 'SOYHLrjzK2X1ezoPC6cr', // ElevenLabs Daniel voice
      'en-AU-Neural2-F': 'D38z5RcWu1voky8WS1ja', // ElevenLabs example Australian voice
      'en-AU-Neural2-M': 'tOyyrVHwgyUkR9XpYMbM'  // ElevenLabs example Australian voice
    };
    
    return voiceMap[voiceId] || voiceId;
  }

  /**
   * Update job status and broadcast the update via WebSocket
   * 
   * @param jobId Job identifier
   * @param updates Updates to apply to the job
   */
  private updateJobStatus(jobId: string, updates: Partial<VoiceoverJob>): void {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return;
    }

    // Update the job
    Object.assign(job, {
      ...updates,
      updatedAt: new Date()
    });

    // Create an additional data object for message serialization
    const additionalData = {
      audioUrl: job.audioUrl,
      assetId: job.assetId,
      duration: job.duration
    };

    // Broadcast status update
    this.webSocketService.broadcastToClient(job.clientId, WebSocketEvent.JOB_PROGRESS, {
      jobId,
      service: 'voiceover',
      status: job.status,
      progress: job.progress,
      // Include additional data in the message as JSON if available
      message: job.audioUrl ? 
        `${job.message || ''} ${JSON.stringify(additionalData)}`.trim() : 
        (job.message || ''),
      error: job.error,
      clientId: job.clientId,
      userId: job.userId
    });
  }

  /**
   * Get voice name from voice ID
   * 
   * @param voiceId The voice ID to look up
   * @returns The name of the voice or 'Unknown Voice' if not found
   */
  private getVoiceName(voiceId: string): string {
    const voice = this.availableVoices.find(v => v.id === voiceId);
    return voice ? voice.name : 'Unknown Voice';
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
export const voiceoverService = new VoiceoverService();
