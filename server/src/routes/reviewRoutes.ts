// server/src/routes/reviewRoutes.ts
import express, { Router, Request, Response, NextFunction } from 'express';
import { reviewController } from '@/controllers/reviewController';
import { reviewAuth } from '@/middleware/reviewAuth';
import { internalAuth } from '@/middleware/internalAuth';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import { asRouteHandler } from '@/types/routeHandler';
import { ApiResponse } from '@/utils/ApiResponse'; // Import ApiResponse

const router = Router();

// --- Internal Routes (Require standard user authentication) ---

// Initiate a new review
router.post('/reviews', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await reviewController.initiateReview(req, res, next); // Assuming controller methods are async or handle next() properly
  } catch (error) {
    ApiResponse.error(res, error); 
  }
}));

// Get review history for an asset
router.get('/assets/:assetId/reviews', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await reviewController.getAssetReviewHistory(req, res, next);
  } catch (error) {
    ApiResponse.error(res, error);
  }
}));


// --- External Review Portal Routes (Require token authentication) ---

// Get review data using a token
router.get('/review/:token', reviewAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await reviewController.getReviewDataByToken(req, res, next);
  } catch (error) {
    ApiResponse.error(res, error);
  }
}));

// Add a comment using a token
router.post('/review/:token/comments', reviewAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await reviewController.addComment(req, res, next);
  } catch (error) {
    ApiResponse.error(res, error);
  }
}));

// Record approval/rejection using a token
router.post('/review/:token/approve', reviewAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await reviewController.recordApproval(req, res, next);
  } catch (error) {
    ApiResponse.error(res, error);
  }
}));


export default router;
