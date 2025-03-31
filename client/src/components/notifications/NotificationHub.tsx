// client/src/components/notifications/NotificationHub.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Divider,
  Button,
  Tooltip,
  CircularProgress,
  Paper,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/Chat';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, Notification } from '../../hooks/useNotifications';

interface NotificationHubProps {
  userId: string;
}

const NotificationHub: React.FC<NotificationHubProps> = ({ userId }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);
  const navigate = useNavigate();
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications(userId);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    refreshNotifications(); // Refresh when opening
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type and related item
    if (notification.relatedItemType === 'review' && notification.relatedItemId) {
      navigate(`/review/${notification.relatedItemId}`);
    } else if (notification.relatedItemType === 'asset' && notification.relatedItemId) {
      navigate(`/assets/${notification.relatedItemId}`);
    }
    
    handleCloseMenu();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'review_request':
        return <PersonIcon />;
      case 'comment':
        return <ChatIcon />;
      case 'approval':
        return <ThumbUpIcon color="success" />;
      case 'rejection':
        return <ThumbDownIcon color="error" />;
      case 'revision':
        return <HistoryIcon color="primary" />;
      case 'mention':
        return <ChatIcon color="secondary" />;
      default:
        return <NotificationsIcon />;
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          onClick={handleOpenMenu}
          size="large"
          aria-controls={isOpen ? 'notification-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={isOpen ? 'true' : undefined}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleCloseMenu}
        MenuListProps={{
          'aria-labelledby': 'notification-button',
        }}
        PaperProps={{
          style: {
            width: '360px',
            maxHeight: '500px',
          },
        }}
      >
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button 
              size="small" 
              onClick={() => markAllAsRead()}
              startIcon={<CheckCircleIcon />}
            >
              Mark all as read
            </Button>
          )}
        </Box>
        
        <Divider />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Typography color="error">Failed to load notifications</Typography>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">No notifications yet</Typography>
          </Box>
        ) : (
          <List sx={{ width: '100%', p: 0 }}>
            {notifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  alignItems="flex-start"
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    backgroundColor: notification.read ? 'inherit' : 'rgba(66, 165, 245, 0.1)',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: notification.read ? 'grey.300' : 'primary.main' }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Typography
                        component="span"
                        variant="body1"
                        fontWeight={notification.read ? 'regular' : 'bold'}
                      >
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="textPrimary">
                          {notification.message}
                        </Typography>
                        <Typography component="div" variant="caption" color="textSecondary">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </Typography>
                      </>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
        
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <Button onClick={() => navigate('/notifications')} size="small">
            View all notifications
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationHub;
