// server/src/controllers/reviewController.ts
import { Response, NextFunction } from 'express';
import { ReviewService } from '@/services/ReviewService';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/types/AuthenticatedRequest';
import { ReviewAuthenticatedRequest, ReviewApprovalPayload } from '@/types/review.types';
import { ApiError } from '@/utils/ApiError'; 
import { ApiResponse } from '@/utils/ApiResponse';
import { ErrorCode } from '@/types/errorTypes';

const reviewService = new ReviewService();

/**
 * Controller for handling review-related API requests.
 */
export const reviewController = {
  /**
   * POST /api/reviews
   * Initiates a new review for an asset. Requires internal authentication.
   */
  async initiateReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        // Use new ApiError signature with ErrorCode
        return next(new ApiError(ErrorCode.AUTHENTICATION_REQUIRED));
      }

      const result = await reviewService.initiateReview(req.body, userId);

      if (result.success) {
        // Use ApiResponse.success
        ApiResponse.success(res, result.data, 'Review initiated successfully', 201);
      } else {
        // Map service error to appropriate ApiError
        // Assuming validation failures return specific strings
        const errorCode = result.error?.includes('Validation') 
          ? ErrorCode.VALIDATION_FAILED 
          : ErrorCode.OPERATION_FAILED;
        next(new ApiError(errorCode, result.error || 'Failed to initiate review.'));
      }
    } catch (error) {
      logger.error('Error initiating review:', error);
      // Wrap unexpected errors before passing to central handler
      const apiError = error instanceof ApiError 
        ? error 
        : new ApiError(ErrorCode.INTERNAL_ERROR, 'Internal server error while initiating review.', undefined, error);
      next(apiError);
    }
  },

  /**
   * GET /api/review/:token
   * Fetches data for the external review portal using a token. Auth handled by reviewAuth middleware.
   */
  async getReviewDataByToken(req: ReviewAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewContext = req.reviewContext;

      if (!reviewContext) {
        logger.error('Review context missing after reviewAuth middleware');
        // Use new ApiError signature with ErrorCode
        return next(new ApiError(ErrorCode.AUTHENTICATION_REQUIRED, 'Unauthorized or invalid token context.'));
      }

      const result = await reviewService.getReviewData(
        reviewContext.reviewVersionId,
        reviewContext.reviewParticipantId
      );

      if (result.success) {
        // Use ApiResponse.success
        ApiResponse.success(res, result.data, 'Review data fetched successfully.');
      } else {
        // Map service error to ApiError
        next(new ApiError(ErrorCode.OPERATION_FAILED, result.error || 'Failed to fetch review data.'));
      }
    } catch (error) {
      logger.error('Error fetching review data by token:', error);
      // Wrap unexpected errors
      const apiError = error instanceof ApiError 
        ? error 
        : new ApiError(ErrorCode.INTERNAL_ERROR, 'Internal server error while fetching review data.', undefined, error);
      next(apiError);
    }
  },

  /**
   * POST /api/review/:token/comments
   * Adds a comment to the review. Auth handled by reviewAuth middleware.
   */
  async addComment(req: ReviewAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewContext = req.reviewContext;

      if (!reviewContext) {
        logger.error('Review context missing after reviewAuth middleware');
        // Use new ApiError signature
        return next(new ApiError(ErrorCode.AUTHENTICATION_REQUIRED, 'Unauthorized or invalid token context.'));
      }

      const result = await reviewService.addComment(
        req.body,
        reviewContext.reviewVersionId,
        reviewContext.reviewParticipantId
      );

      if (result.success) {
        // Use ApiResponse.success
        ApiResponse.success(res, result.data, 'Comment added successfully.', 201);
      } else {
        // Map service error to ApiError (consider VALIDATION_FAILED if applicable)
        const errorCode = result.error?.includes('Validation') 
          ? ErrorCode.VALIDATION_FAILED 
          : ErrorCode.OPERATION_FAILED;
        next(new ApiError(errorCode, result.error || 'Failed to add comment.'));
      }
    } catch (error) {
      logger.error('Error adding comment:', error);
      // Wrap unexpected errors
      const apiError = error instanceof ApiError 
        ? error 
        : new ApiError(ErrorCode.INTERNAL_ERROR, 'Internal server error while adding comment.', undefined, error);
      next(apiError);
    }
  },

  /**
   * POST /api/review/:token/approve
   * Records an approval action for the review. Auth handled by reviewAuth middleware.
   */
  async recordApproval(req: ReviewAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewContext = req.reviewContext;

      if (!reviewContext) {
        logger.error('Review context missing after reviewAuth middleware');
        // Use new ApiError signature
        return next(new ApiError(ErrorCode.AUTHENTICATION_REQUIRED, 'Unauthorized or invalid token context.'));
      }

      // Cast req.body to the expected payload type
      const payload = req.body as ReviewApprovalPayload;

      // Ensure the versionId from the context matches the one potentially in the payload
      // (Payload should ideally drive this, but service expects it separately too)
      if (payload.reviewVersionId && payload.reviewVersionId !== reviewContext.reviewVersionId) {
          return next(new ApiError(ErrorCode.INVALID_INPUT, 'Version ID mismatch between context and payload.'));
      }

      const result = await reviewService.recordApproval(
        payload, // Pass the entire payload object
        reviewContext.reviewVersionId, // Pass versionId separately as required by service
        reviewContext.reviewParticipantId
      );

      if (result.success) {
        // Use ApiResponse.success
        ApiResponse.success(res, result.data, 'Approval recorded successfully.');
      } else {
        // Map service error to ApiError
        next(new ApiError(ErrorCode.OPERATION_FAILED, result.error || 'Failed to record approval.'));
      }
    } catch (error) {
      logger.error('Error recording approval:', error);
      // Wrap unexpected errors
      const apiError = error instanceof ApiError 
        ? error 
        : new ApiError(ErrorCode.INTERNAL_ERROR, 'Internal server error while recording approval.', undefined, error);
      next(apiError);
    }
  },

  /**
   * GET /api/assets/:assetId/reviews
   * Fetches the review history for a specific asset. Requires internal authentication.
   */
  async getAssetReviewHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const assetId = req.params.assetId;

      if (!userId) {
        // Use new ApiError signature
        return next(new ApiError(ErrorCode.AUTHENTICATION_REQUIRED));
      }

      if (!assetId) {
        // Use new ApiError signature for missing parameter
        return next(new ApiError(ErrorCode.INVALID_INPUT, 'Asset ID is required.'));
      }

      const result = await reviewService.getAssetReviewHistory(assetId, userId);

      if (result.success) {
        // Use ApiResponse.success
        ApiResponse.success(res, result.data, 'Asset review history fetched successfully.');
      } else {
        // Map service error to ApiError
        // Check if error indicates asset not found vs other operation failure
        const errorCode = result.error?.includes('not found') 
          ? ErrorCode.RESOURCE_NOT_FOUND 
          : ErrorCode.OPERATION_FAILED;
        next(new ApiError(errorCode, result.error || 'Failed to fetch asset review history.'));
      }
    } catch (error) {
      logger.error('Error fetching asset review history:', error);
      // Wrap unexpected errors
      const apiError = error instanceof ApiError 
        ? error 
        : new ApiError(ErrorCode.INTERNAL_ERROR, 'Internal server error while fetching review history.', undefined, error);
      next(apiError);
    }
  },
};
