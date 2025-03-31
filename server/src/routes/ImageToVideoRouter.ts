import { Request, Response, NextFunction } from 'express';
import { BaseRouter } from './BaseRouter';
import { imageToVideoService, ImageToVideoOptions, ImageToVideoJob } from '../services/imageToVideoService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';

/**
 * Router for image-to-video conversion functionality
 */
export class ImageToVideoRouter extends BaseRouter {
  constructor() {
    // Path '/image-to-video' and requireAuth true
    super('/image-to-video', true);
  }

  /**
   * Initialize routes for image-to-video conversion
   */
  protected initializeRoutes(): void {
    // Generate video from image
    this.router.post('/generate', this.asyncHandler(this.generateVideo));
    
    // Get status of specific job
    this.router.get('/status/:jobId', this.asyncHandler(this.getJobStatus));
    
    // Get all jobs for current user
    this.router.get('/jobs', this.asyncHandler(this.getUserJobs));
    
    // Get all jobs for specific client
    this.router.get('/client/:clientId/jobs', this.asyncHandler(this.getClientJobs));
    
    // Webhook endpoint for processing API provider callbacks
    this.router.post('/webhook', this.asyncHandler(this.handleWebhook));
  }

  /**
   * Generate a video from a static image
   */
  private async generateVideo(req: Request, res: Response): Promise<void> {
    const { 
      sourceImage, 
      motionType,
      motionStrength,
      motionDirection,
      duration,
      outputFormat,
      width,
      height,
      clientId
    } = req.body;

    // Get user ID from authenticated request
    const userId = req.user?.id;

    // Validate required parameters
    if (!sourceImage) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Source image is required for video generation');
    }

    if (!motionType) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Motion type is required (zoom, pan, rotation, or complex)');
    }

    if (motionStrength === undefined || motionStrength < 0 || motionStrength > 100) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Motion strength is required and must be between 0 and 100');
    }

    if (!duration || duration <= 0) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Duration is required and must be greater than 0');
    }

    if (!width || !height) {
      throw new ApiError(ErrorCode.INVALID_INPUT, 'Width and height are required for video generation');
    }

    // Create the generation options
    const options: ImageToVideoOptions = {
      sourceImage,
      motionType,
      motionStrength,
      motionDirection,
      duration,
      outputFormat: outputFormat || 'mp4',
      width,
      height,
      clientId,
      userId
    };

    // Generate the video
    const job = await imageToVideoService.generateVideo(options);

    // Return the job details
    res.json({
      success: true,
      job,
      message: 'Video generation started successfully'
    });
  }

  /**
   * Get the status of a video generation job
   */
  private async getJobStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;

    // Get job status
    const job = imageToVideoService.getJobStatus(jobId);

    if (!job) {
      throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, 'Job not found');
    }

    // Return job status
    res.json({
      success: true,
      job
    });
  }

  /**
   * Get all jobs for the current user
   */
  private async getUserJobs(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(ErrorCode.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    // Get jobs for the user
    const jobs = imageToVideoService.getUserJobs(userId);

    // Return jobs
    res.json({
      success: true,
      jobs
    });
  }

  /**
   * Get all jobs for a specific client
   */
  private async getClientJobs(req: Request, res: Response): Promise<void> {
    const { clientId } = req.params;

    // Get jobs for the client
    const jobs = imageToVideoService.getClientJobs(clientId);

    // Return jobs
    res.json({
      success: true,
      jobs
    });
  }

  /**
   * Webhook endpoint for processing API provider callbacks
   */
  private async handleWebhook(req: Request, res: Response): Promise<void> {
    const { taskId, status, output } = req.body;

    if (!taskId || !status) {
      logger.warn('Webhook received with missing taskId or status');
      // Don't throw error for webhooks, just log and return success
    }

    try {
      // Process the webhook by passing the entire request body
      await imageToVideoService.handleWebhook(req.body);
    } catch (error) {
      // Log error but don't fail the request
      logger.error(`Error processing webhook: ${error}`);
    }

    // Always return success to acknowledge receipt
    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  }
}

// Export router instance
export const imageToVideoRouter = new ImageToVideoRouter();
