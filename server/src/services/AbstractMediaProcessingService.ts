/**
 * Abstract Media Processing Service Class
 * Provides common functionality for services that process media
 */
import { MediaProcessingService, MediaInput, MediaOutput, MediaProcessingStatus } from '../types/serviceInterfaces';
import { AbstractExternalApiService } from './AbstractExternalApiService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';

export abstract class AbstractMediaProcessingService extends AbstractExternalApiService implements MediaProcessingService {
  protected processingJobs: Map<string, MediaProcessingStatus> = new Map();
  
  constructor(serviceName: string, baseUrl: string) {
    super(serviceName, baseUrl);
  }
  
  /**
   * Process media using the service
   * @param input Media input to process
   * @returns Media processing output
   */
  public async processMedia(input: MediaInput): Promise<MediaOutput> {
    this.validateInitialized();
    logger.info(`Processing media with ${this.serviceName}`);
    
    try {
      if (!this.hasValidCredentials()) {
        throw new ApiError(
          ErrorCode.EXTERNAL_API_ERROR,
          `${this.serviceName} has no valid credentials for media processing`,
          { service: this.serviceName }
        );
      }
      
      // Implement actual media processing in derived classes
      const result = await this.performMediaProcessing(input);
      
      // Track the job if a job ID is returned
      if (result.jobId) {
        this.processingJobs.set(result.jobId, 'completed');
        logger.info(`${this.serviceName} processing job completed: ${result.jobId}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error processing media with ${this.serviceName}:`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.MEDIA_PROCESSING_FAILED,
        `Failed to process media with ${this.serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  /**
   * Cancel a processing job
   * @param jobId ID of the job to cancel
   * @returns True if the job was cancelled, false otherwise
   */
  public async cancelProcessing(jobId: string): Promise<boolean> {
    this.validateInitialized();
    logger.info(`Cancelling ${this.serviceName} processing job: ${jobId}`);
    
    try {
      // Check if we're tracking this job
      if (!this.processingJobs.has(jobId)) {
        logger.warn(`Unknown job ID for cancellation: ${jobId}`);
        return false;
      }
      
      // Implement actual job cancellation in derived classes
      const result = await this.performJobCancellation(jobId);
      
      if (result) {
        this.processingJobs.set(jobId, 'cancelled');
        logger.info(`${this.serviceName} processing job cancelled: ${jobId}`);
      } else {
        logger.warn(`Failed to cancel ${this.serviceName} processing job: ${jobId}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error cancelling ${this.serviceName} processing job ${jobId}:`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.EXTERNAL_API_ERROR,
        `Failed to cancel ${this.serviceName} processing job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { jobId }
      );
    }
  }
  
  /**
   * Get the status of a processing job
   * @param jobId ID of the job to check
   * @returns Status of the processing job
   */
  public async getProcessingStatus(jobId: string): Promise<MediaProcessingStatus> {
    this.validateInitialized();
    logger.info(`Checking status of ${this.serviceName} processing job: ${jobId}`);
    
    try {
      // Check if we're tracking this job locally
      if (this.processingJobs.has(jobId)) {
        const localStatus = this.processingJobs.get(jobId);
        
        // If the job is in a terminal state locally, return that
        if (localStatus === 'completed' || localStatus === 'failed' || localStatus === 'cancelled') {
          return localStatus;
        }
      }
      
      // Implement actual status checking in derived classes
      const status = await this.performStatusCheck(jobId);
      
      // Update our local tracking
      this.processingJobs.set(jobId, status);
      logger.debug(`${this.serviceName} processing job ${jobId} status: ${status}`);
      
      return status;
    } catch (error) {
      logger.error(`Error checking ${this.serviceName} processing job ${jobId} status:`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.EXTERNAL_API_ERROR,
        `Failed to check ${this.serviceName} processing job status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { jobId }
      );
    }
  }
  
  /**
   * Perform media processing
   * Should be implemented by derived classes
   */
  protected abstract performMediaProcessing(input: MediaInput): Promise<MediaOutput>;
  
  /**
   * Perform job cancellation
   * Should be implemented by derived classes
   */
  protected abstract performJobCancellation(jobId: string): Promise<boolean>;
  
  /**
   * Perform status check
   * Should be implemented by derived classes
   */
  protected abstract performStatusCheck(jobId: string): Promise<MediaProcessingStatus>;
}
