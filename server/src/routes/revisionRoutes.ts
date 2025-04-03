// server/src/routes/revisionRoutes.ts
import express, { Router, Request, Response, NextFunction } from 'express';
import { internalAuth } from '../middleware/internalAuth';
import { reviewAuth } from '../middleware/reviewAuth';
import { revisionService, RevisionComparison, Revision } from '../services/revisionService';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import { asRouteHandler } from '../types/routeHandler';

const router = Router();

/**
 * Create a new revision
 * POST /api/revisions
 */
router.post('/revisions', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { assetId, description, changeLog, previousVersionId, metadata } = req.body;
    
    // Validate the required fields
    if (!assetId || !req.user) {
      return ApiResponse.badRequest(res, 'Missing required fields');
    }
    
    const createdBy = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    };
    
    const revision = await revisionService.createRevision(
      assetId,
      createdBy,
      description || 'No description provided',
      changeLog || [],
      previousVersionId || null,
      metadata || {}
    );
    
    return ApiResponse.success(res, revision);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Get all revisions for an asset
 * GET /api/assets/:assetId/revisions
 */
router.get('/assets/:assetId/revisions', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { assetId } = req.params;
    
    if (!assetId) {
      return ApiResponse.badRequest(res, 'Asset ID is required');
    }
    
    const revisions = await revisionService.getAssetRevisions(assetId);
    
    return ApiResponse.success(res, revisions);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Get a specific revision
 * GET /api/revisions/:revisionId
 */
router.get('/revisions/:revisionId', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { revisionId } = req.params;
    
    if (!revisionId) {
      return ApiResponse.badRequest(res, 'Revision ID is required');
    }
    
    const revision = await revisionService.getRevision(revisionId);
    
    return ApiResponse.success(res, revision);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * External route - Get a specific revision using token auth
 * GET /api/public/revisions/:revisionId
 */
router.get('/public/revisions/:revisionId', reviewAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { revisionId } = req.params;
    
    if (!revisionId) {
      return ApiResponse.badRequest(res, 'Revision ID is required');
    }
    
    const revision = await revisionService.getRevision(revisionId);
    
    return ApiResponse.success(res, revision);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Update revision status
 * PATCH /api/revisions/:revisionId/status
 */
router.patch('/revisions/:revisionId/status', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { revisionId } = req.params;
    const { status, comments } = req.body;
    
    if (!revisionId || !status || !req.user) {
      return ApiResponse.badRequest(res, 'Missing required fields');
    }
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return ApiResponse.badRequest(res, 'Invalid status value');
    }
    
    const revision = await revisionService.updateRevisionStatus(
      revisionId,
      status as 'pending' | 'approved' | 'rejected',
      req.user.id,
      req.user.name,
      comments
    );
    
    return ApiResponse.success(res, revision);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * External route - Update revision status using token auth
 * PATCH /api/public/revisions/:revisionId/status
 */
router.patch('/public/revisions/:revisionId/status', reviewAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { revisionId } = req.params;
    const { status, comments } = req.body;
    const { reviewToken } = req as any; // Added by reviewAuth middleware
    
    if (!revisionId || !status || !reviewToken) {
      return ApiResponse.badRequest(res, 'Missing required fields');
    }
    
    if (!['approved', 'rejected'].includes(status)) {
      return ApiResponse.badRequest(res, 'Invalid status value');
    }
    
    // Get reviewer info from the token
    const reviewer = {
      id: reviewToken.userId || 'external',
      name: reviewToken.userName || 'External Reviewer',
      email: reviewToken.userEmail || 'unknown',
    };
    
    const revision = await revisionService.updateRevisionStatus(
      revisionId,
      status as 'pending' | 'approved' | 'rejected',
      reviewer.id,
      reviewer.name,
      comments
    );
    
    return ApiResponse.success(res, revision);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Compare two revisions
 * GET /api/revisions/compare
 */
router.get('/revisions/compare', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return ApiResponse.badRequest(res, 'Both from and to revision IDs are required');
    }
    
    const comparison = await revisionService.compareRevisions(
      from as string,
      to as string
    );
    
    return ApiResponse.success(res, comparison);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

export default router;
