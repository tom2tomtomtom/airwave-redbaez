// server/src/services/notificationService.ts
import { supabase } from '@/config/supabaseClient';
import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  userId: string;
  type: 'review_request' | 'comment' | 'approval' | 'rejection' | 'revision' | 'mention';
  title: string;
  message: string;
  relatedItemId?: string; // Can be a review ID, asset ID, etc.
  relatedItemType?: string; // Can be 'review', 'asset', 'comment', etc.
  read: boolean;
  createdAt: string;
  metadata?: any; // Additional data specific to the notification type
}

class NotificationService {
  private static instance: NotificationService;
  private io: any; // Socket.io server instance
  private clientsMap: Map<string, string[]> = new Map(); // Map of userId to socket IDs

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the service with socket.io instance
   */
  public initialize(io: any) {
    this.io = io;

    // Setup socket listeners
    io.on('connection', (socket: Socket) => {
      console.log('Client connected to notification service');

      // Client authenticates with their user ID
      socket.on('auth', (userId: string) => {
        // Store the connection
        if (!this.clientsMap.has(userId)) {
          this.clientsMap.set(userId, []);
        }
        this.clientsMap.get(userId)?.push(socket.id);
        console.log(`User ${userId} authenticated with socket ${socket.id}`);

        // Join a room specific to this user
        socket.join(`user:${userId}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        // Remove this socket from the clients map
        this.clientsMap.forEach((socketIds, userId) => {
          const index = socketIds.indexOf(socket.id);
          if (index !== -1) {
            socketIds.splice(index, 1);
            console.log(`Socket ${socket.id} for user ${userId} disconnected`);
            
            // If this was the last socket for this user, remove the user entry
            if (socketIds.length === 0) {
              this.clientsMap.delete(userId);
            }
          }
        });
      });
    });
  }

  /**
   * Create a new notification
   */
  public async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    const newNotification: Notification = {
      id: uuidv4(),
      ...notification,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Save to database
    const { data, error } = await supabase
      .from('notifications')
      .insert(newNotification);

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    // Send real-time notification if user is connected
    this.sendRealtimeNotification(newNotification.userId, newNotification);

    return newNotification;
  }

  /**
   * Create and send a review request notification
   */
  public async sendReviewRequestNotification(
    userId: string,
    reviewId: string,
    assetTitle: string,
    requesterName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'review_request',
      title: 'New Review Request',
      message: `${requesterName} has requested your review on "${assetTitle}"`,
      relatedItemId: reviewId,
      relatedItemType: 'review',
      metadata: {
        assetTitle,
        requester: requesterName,
      },
    });
  }

  /**
   * Create and send a comment notification
   */
  public async sendCommentNotification(
    userId: string,
    reviewId: string,
    assetTitle: string,
    commenterName: string,
    comment: string,
    timestamp?: number
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'comment',
      title: 'New Comment',
      message: `${commenterName} commented on "${assetTitle}"${timestamp ? ` at ${this.formatTimestamp(timestamp)}` : ''}`,
      relatedItemId: reviewId,
      relatedItemType: 'review',
      metadata: {
        assetTitle,
        commenter: commenterName,
        comment,
        timestamp,
      },
    });
  }

  /**
   * Create and send an approval notification
   */
  public async sendApprovalNotification(
    userId: string,
    reviewId: string,
    assetTitle: string,
    approverName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'approval',
      title: 'Content Approved',
      message: `${approverName} has approved "${assetTitle}"`,
      relatedItemId: reviewId,
      relatedItemType: 'review',
      metadata: {
        assetTitle,
        approver: approverName,
      },
    });
  }

  /**
   * Create and send a rejection notification
   */
  public async sendRejectionNotification(
    userId: string,
    reviewId: string,
    assetTitle: string,
    rejectorName: string,
    feedback: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'rejection',
      title: 'Changes Requested',
      message: `${rejectorName} has requested changes to "${assetTitle}"`,
      relatedItemId: reviewId,
      relatedItemType: 'review',
      metadata: {
        assetTitle,
        rejector: rejectorName,
        feedback,
      },
    });
  }

  /**
   * Create and send a revision notification
   */
  public async sendRevisionNotification(
    userId: string,
    reviewId: string,
    assetTitle: string,
    revisorName: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'revision',
      title: 'New Revision Available',
      message: `${revisorName} has created a new revision of "${assetTitle}"`,
      relatedItemId: reviewId,
      relatedItemType: 'review',
      metadata: {
        assetTitle,
        revisor: revisorName,
      },
    });
  }

  /**
   * Get all notifications for a user
   */
  public async getUserNotifications(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data as Notification[];
  }

  /**
   * Mark a notification as read
   */
  public async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications for a user as read
   */
  public async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('userId', userId);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Delete a notification
   */
  public async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Send a real-time notification to a user
   */
  private sendRealtimeNotification(userId: string, notification: Notification): void {
    if (this.io) {
      // Emit to the user's room
      this.io.to(`user:${userId}`).emit('notification', notification);
    }
  }

  /**
   * Format a timestamp in seconds to a human-readable format (MM:SS)
   */
  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export const notificationService = NotificationService.getInstance();
