import { supabase } from '../db/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

class NotificationService {
  async createNotification(userId: string, type: string, title: string, message: string, metadata?: any): Promise<Notification> {
    try {
      const notification: Notification = {
        id: uuidv4(),
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
        metadata
      };
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          id: notification.id,
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          read: notification.read,
          created_at: notification.createdAt,
          metadata: notification.metadata
        });
      
      if (error) {
        logger.error('Error creating notification:', error);
        throw error;
      }
      
      return notification;
    } catch (error) {
      logger.error('Error in createNotification:', error);
      throw error;
    }
  }
  
  async getNotifications(userId: string, limit = 20, offset = 0): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        logger.error('Error getting notifications:', error);
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        userId: item.user_id,
        type: item.type,
        title: item.title,
        message: item.message,
        read: item.read,
        createdAt: item.created_at,
        metadata: item.metadata
      }));
    } catch (error) {
      logger.error('Error in getNotifications:', error);
      throw error;
    }
  }
  
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) {
        logger.error('Error marking notification as read:', error);
        throw error;
      }
    } catch (error) {
      logger.error('Error in markAsRead:', error);
      throw error;
    }
  }
  
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
      
      if (error) {
        logger.error('Error marking all notifications as read:', error);
        throw error;
      }
    } catch (error) {
      logger.error('Error in markAllAsRead:', error);
      throw error;
    }
  }
  
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) {
        logger.error('Error deleting notification:', error);
        throw error;
      }
    } catch (error) {
      logger.error('Error in deleteNotification:', error);
      throw error;
    }
  }
  
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      
      if (error) {
        logger.error('Error getting unread count:', error);
        throw error;
      }
      
      return count || 0;
    } catch (error) {
      logger.error('Error in getUnreadCount:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
