// server/src/controllers/reviewController.ts
import { Request, Response, NextFunction } from 'express';
import { ReviewService } from '@/services/ReviewService';
import { logger } from '@/utils/logger'; 
import { AuthenticatedRequest } from '@/types/AuthenticatedRequest';
import { ReviewRequestContext, ReviewAuthenticatedRequest } from '@/types/review.types';
import { ApiError } from '@/middleware/errorHandler';

const reviewService = new ReviewService();

/**
 * Controller for handling review-related API requests.
 */
export const reviewController = {
  /**
   * POST /api/reviews
   * Initiates a new review for an asset. Requires internal authentication.
   */
  async initiateReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Assuming internal auth middleware adds user and client info to req
      const userId = req.user?.userId;

      if (!userId) {
        // Use next for consistent error handling
        return next(new ApiError({ statusCode: 401, message: 'User not authenticated' }));
      }

      // Assuming initiateReview needs request body and the initiating user's ID
      const result = await reviewService.initiateReview(req.body, userId);

      if (result.success) {
        res.status(201).json(result.data);
      } else {
        // Use next for consistent error handling
        const statusCode = result.error?.includes('Validation') ? 400 : 500;
        next(new ApiError({ statusCode, message: result.error || 'Failed to initiate review.' }));
      }
    } catch (error) {
      logger.error('Error initiating review:', error);
      // Pass error to the central handler
      next(error instanceof ApiError ? error : new ApiError({ statusCode: 500, message: 'Internal server error while initiating review.' }));
    }
  },

  /**
   * GET /api/review/:token
   * Fetches data for the external review portal using a token. Auth handled by reviewAuth middleware.
   */
  async getReviewDataByToken(req: ReviewAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const reviewContext = req.reviewContext;

      if (!reviewContext) {
        logger.error('Review context missing after reviewAuth middleware');
        // Use next for consistent error handling
        return next(new ApiError({ statusCode: 401, message: 'Unauthorized or invalid token context.' }));
      }

      // Correct method name and argument order
      const result = await reviewService.getReviewData(
        reviewContext.reviewVersionId,
        reviewContext.reviewParticipantId
      );

      if (result.success) {
        res.status(200).json(result.data);
      } else {
        // Use next for consistent error handling
        next(new ApiError({ statusCode: 500, message: result.error || 'Failed to fetch review data.' }));
      }
    } catch (error) {
      logger.error('Error fetching review data by token:', error);
      // Pass error to the central handler
      next(error instanceof ApiError ? error : new ApiError({ statusCode: 500, message: 'Internal server error while fetching review data.' }));
    }
  },

  /**
   * POST /api/review/:token/comments
   * Adds a comment to the review. Auth handled by reviewAuth middleware.
   */
  async addComment(req: ReviewAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const reviewContext = req.reviewContext;

      if (!reviewContext) {
        logger.error('Review context missing after reviewAuth middleware');
        // Use next for consistent error handling
        return next(new ApiError({ statusCode: 401, message: 'Unauthorized or invalid token context.' }));
      }

      // Add missing reviewVersionId argument
      const result = await reviewService.addComment(
        req.body,
        reviewContext.reviewVersionId,
        reviewContext.reviewParticipantId
      );

      if (result.success) {
        res.status(201).json(result.data);
      } else {
        // Use next for consistent error handling
        const statusCode = result.error?.includes('Validation') ? 400 : 500;
        next(new ApiError({ statusCode, message: result.error || 'Failed to add comment.' }));
      }
    } catch (error) {
      logger.error('Error adding review comment:', error);
      // Pass error to the central handler
      next(error instanceof ApiError ? error : new ApiError({ statusCode: 500, message: 'Internal server error while adding comment.' }));
    }
  },

  /**
   * POST /api/review/:token/approve
   * Records an approval action for the review. Auth handled by reviewAuth middleware.
   */
  async recordApproval(req: ReviewAuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const reviewContext = req.reviewContext;

      if (!reviewContext) {
        logger.error('Review context missing after reviewAuth middleware');
        // Use next for consistent error handling
        return next(new ApiError({ statusCode: 401, message: 'Unauthorized or invalid token context.' }));
      }

      // Add missing reviewVersionId argument
      const result = await reviewService.recordApproval(
        req.body,
        reviewContext.reviewVersionId,
        reviewContext.reviewParticipantId
      );

      if (result.success) {
        res.status(200).json({ message: 'Approval action recorded.' });
      } else {
        // Use next for consistent error handling
        const statusCode = result.error?.includes('Validation') ? 400 : 500;
        next(new ApiError({ statusCode, message: result.error || 'Failed to record approval.' }));
      }
    } catch (error) {
      logger.error('Error recording review approval:', error);
      // Pass error to the central handler
      next(error instanceof ApiError ? error : new ApiError({ statusCode: 500, message: 'Internal server error while recording approval.' }));
    }
  },

  /**
   * GET /api/assets/:assetId/reviews
   * Fetches the review history for a specific asset. Requires internal authentication.
   */
  async getAssetReviewHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { assetId } = req.params;

      if (!userId) {
        // Use next for consistent error handling
        return next(new ApiError({ statusCode: 401, message: 'User not authenticated' }));
      }

      if (!assetId) {
        // Use next for consistent error handling for missing parameters
        return next(new ApiError({ statusCode: 400, message: 'Asset ID is missing in URL parameters.' }));
      }

      // Assuming getAssetReviewHistory needs assetId and the requesting user's ID
      const result = await reviewService.getAssetReviewHistory(assetId, userId);

      if (result.success) {
        res.status(200).json(result.data);
      } else {
        // Use next for consistent error handling
        next(new ApiError({ statusCode: 500, message: result.error || 'Failed to fetch review history.' }));
      }
    } catch (error) {
      logger.error('Error fetching asset review history:', error);
      // Pass error to the central handler
      next(error instanceof ApiError ? error : new ApiError({ statusCode: 500, message: 'Internal server error while fetching review history.' }));
    }
  },
};
