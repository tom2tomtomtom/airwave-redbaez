// server/src/routes/timeBasedCommentRoutes.ts
import express, { Router, Response, NextFunction } from 'express';
import { internalAuth } from '../middleware/internalAuth';
import { reviewAuth } from '../middleware/reviewAuth';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import { asRouteHandler } from '../types/routeHandler';
import { supabase } from '../db/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from '../services/notificationService';

const router = Router();

interface TimeBasedComment {
  id: string;
  reviewId: string;
  assetId: string;
  timestamp: number; // Time in seconds in the video/audio
  comment: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  resolved: boolean;
}

/**
 * Add a time-based comment to a review
 * POST /api/reviews/:reviewId/comments/timebased
 */
router.post('/reviews/:reviewId/comments/timebased', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;
    const { timestamp, comment, assetId } = req.body;
    
    if (!reviewId || !comment || timestamp === undefined || !req.user) {
      return ApiResponse.error(res, 'Missing required fields');
    }
    
    // Get review to verify it exists
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();
    
    if (reviewError || !review) {
      return ApiResponse.notFound(res, 'Review not found');
    }
    
    // Create time-based comment
    const newComment: TimeBasedComment = {
      id: uuidv4(),
      reviewId,
      assetId: assetId || review.assetId,
      timestamp,
      comment,
      createdAt: new Date().toISOString(),
      createdBy: {
        id: req.user.userId,
        name: req.user.email.split('@')[0], // Using the first part of email as name
        email: req.user.email,
        role: req.user.role,
        avatar: '',
      },
      resolved: false,
    };
    
    const { data, error } = await supabase
      .from('time_based_comments')
      .insert(newComment);
    
    if (error) {
      logger.error('Error creating time-based comment:', error);
      return ApiResponse.error(res, error);
    }
    
    // Notify asset owner and other stakeholders
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from('asset_stakeholders')
      .select('userId, role')
      .eq('assetId', newComment.assetId);
    
    if (!stakeholdersError && stakeholders) {
      // Get asset title for notification
      const { data: asset } = await supabase
        .from('assets')
        .select('title')
        .eq('id', newComment.assetId)
        .single();
      
      const assetTitle = asset?.title || 'Untitled Asset';
      
      // Send notifications to all stakeholders except the commenter
      for (const stakeholder of stakeholders) {
        if (stakeholder.userId !== req.user.userId) {
          await notificationService.sendCommentNotification(
            stakeholder.userId,
            reviewId,
            assetTitle,
            req.user.name,
            comment,
            timestamp
          );
        }
      }
    }
    
    return ApiResponse.success(res, newComment);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * External route - Add a time-based comment to a review using token auth
 * POST /api/public/reviews/:reviewId/comments/timebased
 */
router.post('/public/reviews/:reviewId/comments/timebased', reviewAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;
    const { timestamp, comment, assetId } = req.body;
    const { reviewToken } = req as any; // Added by reviewAuth middleware
    
    if (!reviewId || !comment || timestamp === undefined || !reviewToken) {
      return ApiResponse.error(res, 'Missing required fields');
    }
    
    // Get review to verify it exists and belongs to the token
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();
    
    if (reviewError || !review) {
      return ApiResponse.notFound(res, 'Review not found');
    }
    
    // Verify token is for this review
    if (reviewToken.reviewId !== reviewId) {
      return ApiResponse.error(res, 'Invalid review token');
    }
    
    // Create comment
    const newComment: TimeBasedComment = {
      id: uuidv4(),
      reviewId,
      assetId: assetId || review.assetId,
      timestamp,
      comment,
      createdAt: new Date().toISOString(),
      createdBy: {
        id: reviewToken.userId || 'external',
        name: reviewToken.userName || 'External Reviewer',
        email: reviewToken.userEmail || 'unknown',
        role: reviewToken.userRole || 'client',
      },
      resolved: false,
    };
    
    const { data, error } = await supabase
      .from('time_based_comments')
      .insert(newComment);
    
    if (error) {
      logger.error('Error creating time-based comment:', error);
      return ApiResponse.error(res, error);
    }
    
    // Notify asset owner
    if (review.createdBy) {
      // Get asset title for notification
      const { data: asset } = await supabase
        .from('assets')
        .select('title')
        .eq('id', newComment.assetId)
        .single();
      
      const assetTitle = asset?.title || 'Untitled Asset';
      
      await notificationService.sendCommentNotification(
        review.createdBy,
        reviewId,
        assetTitle,
        newComment.createdBy.name,
        comment,
        timestamp
      );
    }
    
    return ApiResponse.success(res, newComment);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Get all time-based comments for a review
 * GET /api/reviews/:reviewId/comments/timebased
 */
router.get('/reviews/:reviewId/comments/timebased', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;
    
    if (!reviewId) {
      return ApiResponse.error(res, 'Review ID is required');
    }
    
    // Get all comments for the review
    const { data, error } = await supabase
      .from('time_based_comments')
      .select('*')
      .eq('reviewId', reviewId)
      .order('timestamp', { ascending: true });
    
    if (error) {
      logger.error('Error fetching time-based comments:', error);
      return ApiResponse.error(res, error);
    }
    
    return ApiResponse.success(res, data);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Update a time-based comment
 * PATCH /api/reviews/:reviewId/comments/:commentId
 */
router.patch('/reviews/:reviewId/comments/:commentId', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reviewId, commentId } = req.params;
    const updates = req.body;
    
    if (!reviewId || !commentId) {
      return ApiResponse.badRequest(res, 'Review ID and Comment ID are required');
    }
    
    // Get the comment to check ownership
    const { data: comment, error: commentError } = await supabase
      .from('time_based_comments')
      .select('*')
      .eq('id', commentId)
      .eq('reviewId', reviewId)
      .single();
    
    if (commentError || !comment) {
      return ApiResponse.notFound(res, 'Comment not found');
    }
    
    // Only allow the creator or an admin to update the comment content
    // But allow resolving/unresolving by anyone
    if ('comment' in updates && comment.createdBy.id !== req.user?.userId && req.user?.role !== 'admin') {
      return ApiResponse.error(res, 'You do not have permission to update this comment');
    }
    
    // Only allow updating specific fields
    const allowedUpdates = ['comment', 'resolved'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});
    
    // If there are no valid updates, return early
    if (Object.keys(filteredUpdates).length === 0) {
      return ApiResponse.error(res, 'No valid fields to update');
    }
    
    // Update the comment
    const { data, error } = await supabase
      .from('time_based_comments')
      .update(filteredUpdates)
      .eq('id', commentId)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating time-based comment:', error);
      return ApiResponse.error(res, error);
    }
    
    return ApiResponse.success(res, data);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Delete a time-based comment
 * DELETE /api/reviews/:reviewId/comments/:commentId
 */
router.delete('/reviews/:reviewId/comments/:commentId', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reviewId, commentId } = req.params;
    
    if (!reviewId || !commentId) {
      return ApiResponse.badRequest(res, 'Review ID and Comment ID are required');
    }
    
    // Get the comment to check ownership
    const { data: comment, error: commentError } = await supabase
      .from('time_based_comments')
      .select('*')
      .eq('id', commentId)
      .eq('reviewId', reviewId)
      .single();
    
    if (commentError || !comment) {
      return ApiResponse.notFound(res, 'Comment not found');
    }
    
    // Only allow the creator or an admin to delete the comment
    if (comment.createdBy.id !== req.user?.userId && req.user?.role !== 'admin') {
      return ApiResponse.error(res, 'You do not have permission to delete this comment');
    }
    
    // Delete the comment
    const { error } = await supabase
      .from('time_based_comments')
      .delete()
      .eq('id', commentId);
    
    if (error) {
      logger.error('Error deleting time-based comment:', error);
      return ApiResponse.error(res, error);
    }
    
    return ApiResponse.success(res, { success: true });
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

export default router;
