// server/src/routes/reviewRoutes.ts
import express, { Router, Request, Response, NextFunction } from 'express';
import { reviewController } from '@/controllers/reviewController';
import { reviewAuth } from '@/middleware/reviewAuth';
import { internalAuth } from '@/middleware/internalAuth';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';

const router = Router();

// --- Internal Routes (Require standard user authentication) ---

// Initiate a new review
router.post('/reviews', internalAuth, (req: AuthenticatedRequest, res: Response, next: NextFunction) => 
  reviewController.initiateReview(req, res, next)
);

// Get review history for an asset
router.get('/assets/:assetId/reviews', internalAuth, (req: AuthenticatedRequest, res: Response, next: NextFunction) => 
  reviewController.getAssetReviewHistory(req, res, next)
);


// --- External Review Portal Routes (Require token authentication) ---

// Get review data using a token
router.get('/review/:token', reviewAuth, (req: AuthenticatedRequest, res: Response, next: NextFunction) => 
  reviewController.getReviewDataByToken(req, res, next)
);

// Add a comment using a token
router.post('/review/:token/comments', reviewAuth, (req: AuthenticatedRequest, res: Response, next: NextFunction) => 
  reviewController.addComment(req, res, next)
);

// Record approval/rejection using a token
router.post('/review/:token/approve', reviewAuth, (req: AuthenticatedRequest, res: Response, next: NextFunction) => 
  reviewController.recordApproval(req, res, next)
);


export default router;
