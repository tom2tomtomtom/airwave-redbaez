// client/src/components/signoff/VideoCommenting.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Chip,
  Slider,
  Tooltip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FlagIcon from '@mui/icons-material/Flag';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';

interface TimeBasedComment {
  id: string;
  timestamp: number; // Time in seconds in the video
  comment: string;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  resolved?: boolean;
}

interface VideoCommentingProps {
  videoUrl: string;
  assetId: string;
  reviewId: string;
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  canComment: boolean;
  onCommentAdded?: (comment: TimeBasedComment) => void;
  existingComments?: TimeBasedComment[];
}

const VideoCommenting: React.FC<VideoCommentingProps> = ({
  videoUrl,
  assetId,
  reviewId,
  currentUser,
  canComment,
  onCommentAdded,
  existingComments = [],
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [comments, setComments] = useState<TimeBasedComment[]>(existingComments || []);
  const [commentInput, setCommentInput] = useState('');
  const [commentTimeInput, setCommentTimeInput] = useState(0);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [formattedTime, setFormattedTime] = useState('0:00');
  const [formattedDuration, setFormattedDuration] = useState('0:00');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Format time as MM:SS
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle video metadata loaded
  const handleMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setFormattedDuration(formatTime(videoRef.current.duration));
    }
  };

  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setFormattedTime(formatTime(videoRef.current.currentTime));
      
      // Update comment time input when video is paused
      if (!isPlaying) {
        setCommentTimeInput(videoRef.current.currentTime);
      }
    }
  };

  // Handle slider change
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
      setFormattedTime(formatTime(value));
      setCommentTimeInput(value);
    }
  };

  // Set the current time for commenting
  const setCurrentTimeForComment = () => {
    if (videoRef.current) {
      setCommentTimeInput(videoRef.current.currentTime);
      setSelectedTimestamp(videoRef.current.currentTime);
      // Pause the video when setting a comment time
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Add a new comment
  const addComment = async () => {
    if (!commentInput.trim() || !canComment) return;

    try {
      const newComment: Omit<TimeBasedComment, 'id' | 'createdAt'> = {
        timestamp: commentTimeInput,
        comment: commentInput,
        createdBy: currentUser,
        resolved: false,
      };

      const response = await axios.post(`/api/reviews/${reviewId}/comments/timebased`, newComment);
      const savedComment = response.data.data;

      setComments(prev => [...prev, savedComment]);
      setCommentInput('');
      setSelectedTimestamp(null);

      if (onCommentAdded) {
        onCommentAdded(savedComment);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Handle clicking on a comment timestamp to jump to that position
  const jumpToTimestamp = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      setFormattedTime(formatTime(timestamp));
      
      // Highlight the timestamp
      setSelectedTimestamp(timestamp);
      
      // Pause the video at the timestamp
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Toggle comment resolved status
  const toggleCommentResolved = async (commentId: string) => {
    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      const updatedResolved = !comment.resolved;
      
      await axios.patch(`/api/reviews/${reviewId}/comments/${commentId}`, {
        resolved: updatedResolved,
      });

      setComments(prev => 
        prev.map(c => 
          c.id === commentId ? { ...c, resolved: updatedResolved } : c
        )
      );
    } catch (error) {
      console.error('Error updating comment resolved status:', error);
    }
  };

  // Open delete dialog
  const openDeleteDialog = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
  };

  // Delete a comment
  const deleteComment = async () => {
    if (!commentToDelete) return;

    try {
      await apiClient.delete(`/api/reviews/${reviewId}/comments/${commentToDelete}`);

      setComments(prev => prev.filter(c => c.id !== commentToDelete));
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={3} sx={{ mb: 2, overflow: 'hidden' }}>
        {/* Video Player */}
        <Box sx={{ position: 'relative', width: '100%' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            style={{ width: '100%', display: 'block' }}
            onLoadedMetadata={handleMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          
          {/* Video Controls */}
          <Box sx={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            p: 1, 
            backgroundColor: 'rgba(0,0,0,0.7)', 
            display: 'flex', 
            alignItems: 'center' 
          }}>
            <IconButton onClick={togglePlay} size="small" sx={{ color: 'white' }}>
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
            
            <Box sx={{ mx: 1, color: 'white', minWidth: '70px' }}>
              {formattedTime} / {formattedDuration}
            </Box>
            
            <Box sx={{ flex: 1, mx: 1 }}>
              <Slider
                value={currentTime}
                max={duration}
                onChange={handleSliderChange}
                sx={{ 
                  color: 'white',
                  '& .MuiSlider-thumb': {
                    width: 12,
                    height: 12,
                  },
                  '& .MuiSlider-rail': {
                    opacity: 0.5,
                  }
                }}
              />
            </Box>
            
            {canComment && (
              <Tooltip title="Add comment at current time">
                <IconButton 
                  onClick={setCurrentTimeForComment} 
                  size="small" 
                  sx={{ color: 'white' }}
                >
                  <FlagIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          
          {/* Comment markers on timeline */}
          <Box sx={{ position: 'absolute', bottom: 24, left: 70, right: 16, height: 20, pointerEvents: 'none' }}>
            {comments.map((comment) => {
              // Calculate position as percentage of total duration
              const position = (comment.timestamp / duration) * 100;
              return (
                <Tooltip key={comment.id} title={comment.comment}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${position}%`,
                      bottom: 2,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: comment.resolved ? 'success.main' : 'error.main',
                      transform: 'translateX(-50%)',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                    }}
                    onClick={() => jumpToTimestamp(comment.timestamp)}
                  />
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      </Paper>

      {/* Comment Input */}
      {canComment && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2">
              Adding comment at {formatTime(commentTimeInput)}
            </Typography>
          </Box>
          
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Add your comment here..."
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            disabled={!canComment}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<ChatIcon />}
              onClick={addComment}
              disabled={!commentInput.trim() || !canComment}
            >
              Add Comment
            </Button>
          </Box>
        </Paper>
      )}

      {/* Comment List */}
      <Typography variant="h6" gutterBottom>
        Time-based Comments ({comments.length})
      </Typography>
      
      {comments.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No comments yet. Add the first comment by clicking the flag icon while watching the video.
          </Typography>
        </Paper>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {comments
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((comment) => (
              <React.Fragment key={comment.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    backgroundColor: selectedTimestamp === comment.timestamp ? 'rgba(66, 165, 245, 0.1)' : 'inherit',
                  }}
                  secondaryAction={
                    <Box>
                      <Tooltip title={comment.resolved ? "Mark as unresolved" : "Mark as resolved"}>
                        <IconButton 
                          edge="end" 
                          onClick={() => toggleCommentResolved(comment.id)}
                          sx={{ color: comment.resolved ? 'success.main' : 'text.secondary' }}
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete comment">
                        <IconButton 
                          edge="end" 
                          onClick={() => openDeleteDialog(comment.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={comment.createdBy.avatar}>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography component="span" variant="subtitle2">
                          {comment.createdBy.name}
                        </Typography>
                        {comment.createdBy.role && (
                          <Chip 
                            label={comment.createdBy.role} 
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {comment.resolved && (
                          <Chip 
                            label="Resolved" 
                            size="small"
                            color="success"
                            icon={<CheckCircleIcon />}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Chip
                          icon={<AccessTimeIcon />}
                          label={formatTime(comment.timestamp)}
                          size="small"
                          variant="outlined"
                          onClick={() => jumpToTimestamp(comment.timestamp)}
                          clickable
                          sx={{ my: 1 }}
                        />
                        <Typography component="div" variant="body2" color="text.primary" sx={{ mt: 1 }}>
                          {comment.comment}
                        </Typography>
                        <Typography component="div" variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
        </List>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Comment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this comment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={deleteComment} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoCommenting;
