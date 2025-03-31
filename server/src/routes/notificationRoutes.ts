// server/src/routes/notificationRoutes.ts
import express, { Router, Response, NextFunction } from 'express';
import { internalAuth } from '@/middleware/internalAuth';
import { notificationService, Notification } from '@/services/notificationService';
import { ApiResponse } from '@/utils/ApiResponse';
import { AuthenticatedRequest } from '@/types/AuthenticatedRequest';
import { asRouteHandler } from '@/types/routeHandler';
import { supabase } from '../db/supabaseClient';

const router = Router();

/**
 * Get all notifications for a user
 * GET /api/notifications/user/:userId
 */
router.get('/notifications/user/:userId', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { limit = '50', offset = '0' } = req.query;
    
    // Check if user has permission to view these notifications
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      return ApiResponse.error(res, 'You do not have permission to view these notifications');
    }
    
    const notifications = await notificationService.getUserNotifications(
      userId,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );
    
    return ApiResponse.success(res, notifications);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Mark a notification as read
 * PATCH /api/notifications/:notificationId/read
 */
router.patch('/notifications/:notificationId/read', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { notificationId } = req.params;
    
    // Get the notification to check ownership
    const { data: notification } = await supabase
      .from('notifications')
      .select('userId')
      .eq('id', notificationId)
      .single();
    
    // Check if user has permission to modify this notification
    if (!notification) {
      return ApiResponse.error(res, 'Notification not found');
    }
    
    if (req.user?.userId !== notification.userId && req.user?.role !== 'admin') {
      return ApiResponse.error(res, 'You do not have permission to modify this notification');
    }
    
    await notificationService.markNotificationAsRead(notificationId);
    
    return ApiResponse.success(res, { success: true });
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Mark all notifications for a user as read
 * PATCH /api/notifications/user/:userId/read-all
 */
router.patch('/notifications/user/:userId/read-all', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    // Check if user has permission to modify these notifications
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      return ApiResponse.error(res, 'You do not have permission to modify these notifications');
    }
    
    await notificationService.markAllNotificationsAsRead(userId);
    
    return ApiResponse.success(res, { success: true });
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Delete a notification
 * DELETE /api/notifications/:notificationId
 */
router.delete('/notifications/:notificationId', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { notificationId } = req.params;
    
    // Get the notification to check ownership
    const { data: notification } = await supabase
      .from('notifications')
      .select('userId')
      .eq('id', notificationId)
      .single();
    
    // Check if user has permission to delete this notification
    if (!notification) {
      return ApiResponse.error(res, 'Notification not found');
    }
    
    if (req.user?.userId !== notification.userId && req.user?.role !== 'admin') {
      return ApiResponse.error(res, 'You do not have permission to delete this notification');
    }
    
    await notificationService.deleteNotification(notificationId);
    
    return ApiResponse.success(res, { success: true });
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));

/**
 * Create a notification (admin only)
 * POST /api/notifications
 */
router.post('/notifications', internalAuth, asRouteHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Only admins can create notifications manually
    if (req.user?.role !== 'admin') {
      return ApiResponse.error(res, 'Only admins can create notifications manually');
    }
    
    const notification = req.body;
    
    if (!notification.userId || !notification.type || !notification.title || !notification.message) {
      return ApiResponse.error(res, 'Missing required notification fields');
    }
    
    const createdNotification = await notificationService.createNotification(notification);
    
    return ApiResponse.success(res, createdNotification);
  } catch (error) {
    return ApiResponse.error(res, error);
  }
}));



export default router;
