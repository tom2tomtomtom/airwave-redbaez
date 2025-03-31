// client/src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import axios from 'axios';

export interface Notification {
  id: string;
  userId: string;
  type: 'review_request' | 'comment' | 'approval' | 'rejection' | 'revision' | 'mention';
  title: string;
  message: string;
  relatedItemId?: string;
  relatedItemType?: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

interface TimeBasedComment {
  id: string;
  timestamp: number;
  comment: string;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  resolved: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  subscribeToComments?: (reviewId: string, callback: (comment: TimeBasedComment) => void) => (() => void);
}

/**
 * Hook for managing notifications with WebSocket real-time updates
 */
export const useNotifications = (userId: string): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Set up WebSocket connection
  const { lastMessage, sendMessage } = useWebSocket('notifications');

  // Fetch notifications from the API
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`/api/notifications/user/${userId}`);
      const notifs = response.data.data as Notification[];
      
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load of notifications
  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  // Set up WebSocket listeners
  useEffect(() => {
    if (!userId) return;

    // Authenticate with the notification service
    sendMessage({
      type: 'auth',
      userId
    });

    // No need to listen here - we'll handle incoming messages through the lastMessage object
  }, [sendMessage, userId]);
  
  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    
    try {
      const data = typeof lastMessage.data === 'string' ? JSON.parse(lastMessage.data) : lastMessage.data;
      
      if (lastMessage.type === 'notification') {
        const notification = data as Notification;
        
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Display browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/logo192.png', // Assuming you have this icon
          });
        }
      }
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
    }
  }, [lastMessage]);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);
  
  // Subscribe to comments on a specific review
  const subscribeToComments = useCallback((reviewId: string, callback: (comment: TimeBasedComment) => void) => {
    if (!reviewId || !userId) return () => {};
    
    // Join the review room to get real-time comment updates
    sendMessage({
      type: 'join-review',
      reviewId,
      userId
    });
    
    // Set up a listener for the lastMessage to detect comments for this review
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'comment' && data.reviewId === reviewId) {
          callback(data.comment);
        }
      } catch (err) {
        console.error('Error processing comment message:', err);
      }
    };
    
    // Add event listener to window
    window.addEventListener('message', handleMessage);
    
    // Return unsubscribe function
    return () => {
      window.removeEventListener('message', handleMessage);
      
      // Leave the review room
      sendMessage({
        type: 'leave-review',
        reviewId,
        userId
      });
    };
  }, [sendMessage, userId]);

  // Mark a notification as read
  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      await axios.patch(`/api/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      setError(err.response?.data?.message || 'Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async (): Promise<void> => {
    try {
      await axios.patch(`/api/notifications/user/${userId}/read-all`);
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      setError(err.response?.data?.message || 'Failed to mark all notifications as read');
    }
  };

  // Delete a notification
  const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      
      const notification = notifications.find(n => n.id === notificationId);
      
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  // Refresh notifications
  const refreshNotifications = async (): Promise<void> => {
    await fetchNotifications();
  };



  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    subscribeToComments,
  };
};
