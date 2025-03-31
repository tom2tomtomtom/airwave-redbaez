import express from 'express';
import { imageToVideoService, ImageToVideoOptions, ImageToVideoJob } from '../services/imageToVideoService';
import { checkAuth } from '../middleware/auth.middleware';
import { supabase } from '../db/supabaseClient';
import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';

const router = express.Router();

/**
 * Generate a video from a static image
 * POST /api/image-to-video/generate
 */
router.post('/generate', checkAuth, async (req, res) => {
  try {
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
      return ApiResponse.error(res, new ApiError(
        ErrorCode.INVALID_INPUT,
        'Source image is required for video generation'
      ));
    }

    if (!motionType) {
      return ApiResponse.error(res, new ApiError(
        ErrorCode.INVALID_INPUT,
        'Motion type is required (zoom, pan, rotation, or complex)'
      ));
    }

    if (motionStrength === undefined || motionStrength < 0 || motionStrength > 100) {
      return ApiResponse.error(res, new ApiError(
        ErrorCode.INVALID_INPUT,
        'Motion strength is required and must be between 0 and 100'
      ));
    }

    if (!duration || duration <= 0) {
      return ApiResponse.error(res, new ApiError(
        ErrorCode.INVALID_INPUT,
        'Duration is required and must be greater than 0'
      ));
    }

    if (!width || !height) {
      return ApiResponse.error(res, new ApiError(
        ErrorCode.INVALID_INPUT,
        'Width and height are required for video generation'
      ));
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
    return ApiResponse.success(res, {
      job,
      message: 'Video generation started successfully'
    });
  } catch (error: any) {
    logger.error(`Error in image-to-video generation: ${error.message}`);
    return ApiResponse.error(res, 
      error instanceof ApiError 
        ? error 
        : new ApiError(ErrorCode.INTERNAL_ERROR, 'Failed to generate video: ' + error.message)
    );
  }
});

/**
 * Get the status of a video generation job
 * GET /api/image-to-video/status/:jobId
 */
router.get('/status/:jobId', checkAuth, async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get job status
    const job = imageToVideoService.getJobStatus(jobId);

    if (!job) {
      return ApiResponse.error(res, new ApiError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Job not found'
      ));
    }

    // Return job status
    return ApiResponse.success(res, { job });
  } catch (error: any) {
    logger.error(`Error getting job status: ${error.message}`);
    return ApiResponse.error(res, new ApiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get job status: ' + error.message
    ));
  }
});

/**
 * Get all jobs for the current user
 * GET /api/image-to-video/jobs
 */
router.get('/jobs', checkAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, new ApiError(
        ErrorCode.AUTHENTICATION_REQUIRED,
        'User not authenticated'
      ));
    }

    // Get jobs for the user
    const jobs = imageToVideoService.getUserJobs(userId);

    // Return jobs
    return ApiResponse.success(res, { jobs });
  } catch (error: any) {
    logger.error(`Error getting user jobs: ${error.message}`);
    return ApiResponse.error(res, new ApiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get user jobs: ' + error.message
    ));
  }
});

/**
 * Get all jobs for a specific client
 * GET /api/image-to-video/client/:clientId/jobs
 */
router.get('/client/:clientId/jobs', checkAuth, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get jobs for the client
    const jobs = imageToVideoService.getClientJobs(clientId);

    // Return jobs
    return ApiResponse.success(res, { jobs });
  } catch (error: any) {
    logger.error(`Error getting client jobs: ${error.message}`);
    return ApiResponse.error(res, new ApiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get client jobs: ' + error.message
    ));
  }
});

/**
 * Webhook endpoint for processing Runway callbacks
 * This should be registered with Runway as a webhook URL
 * POST /api/image-to-video/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const { taskId, status, output } = req.body;

    if (!taskId || !status) {
      return ApiResponse.error(res, new ApiError(
        ErrorCode.INVALID_INPUT,
        'Task ID and status are required'
      ));
    }

    // Process the webhook with the full request body
    await imageToVideoService.handleWebhook(req.body);

    // Return success
    return ApiResponse.success(res, { 
      message: 'Webhook processed successfully' 
    });
  } catch (error: any) {
    logger.error(`Error processing webhook: ${error.message}`);
    // Always return 200 to Runway to acknowledge receipt
    return ApiResponse.success(res, { 
      message: 'Webhook received, but error occurred during processing' 
    });
  }
});

export default router;
