import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toggleFavoriteTemplate } from '../../store/slices/templatesSlice';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  PlayCircleOutline as PlayCircleOutlineIcon,
  Facebook as FacebookIcon,
  YouTube as YouTubeIcon,
  Instagram as InstagramIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { Template } from '../../types/templates';

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
  onDelete?: (templateId: string) => void;
}

// Helper function to get platform icon
const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'facebook':
      return <FacebookIcon fontSize="small" />;
    case 'instagram':
      return <InstagramIcon fontSize="small" />;
    case 'youtube':
      return <YouTubeIcon fontSize="small" />;
    case 'tiktok':
      return <span style={{ fontSize: '16px' }}>📱</span>; // TikTok icon placeholder
    default:
      return undefined; // Return undefined instead of null
  }
};

// Helper function to get format color
const getFormatColor = (format?: string) => {
  // Handle undefined/null format gracefully
  if (!format) {
    return 'default';
  }
  
  // Now we know format is defined, so we can use toLowerCase
  switch (format.toLowerCase()) {
    case 'square':
      return 'primary';
    case 'portrait':
      return 'secondary';
    case 'landscape':
      return 'success';
    case 'story':
      return 'warning';
    default:
      return 'default';
  }
};

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onClick, onDelete }) => {
  // Use the template's isFavorite property directly instead of local state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSuccessSnackbar, setDeleteSuccessSnackbar] = useState(false);
  
  // Import necessary hooks
  const dispatch = useDispatch<any>();

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle favorite and dispatch to persist the change
    const updatedTemplate = {
      ...template,
      isFavorite: !template.isFavorite
    };
    // Optimistically update UI while API call happens
    dispatch(toggleFavoriteTemplate(updatedTemplate.id));
  };

  // Ensure we have a valid format value
  const normalizedFormat = template.format && ['square', 'landscape', 'portrait', 'story'].includes(template.format)
    ? template.format
    : 'square'; // Default to square if missing or invalid

  // Function to get aspect ratio values based on format
  const getAspectRatio = (format: string) => {
    switch (format) {
      case 'square': // 1:1
        return '1 / 1';
      case 'landscape': // 16:9
        return '16 / 9';
      case 'portrait': // 4:5
        return '4 / 5';
      case 'story': // 9:16
        return '9 / 16';
      default:
        return '1 / 1';
    }
  };

  // Get the CSS aspect ratio for this template
  const aspectRatio = getAspectRatio(normalizedFormat);

  return (
    <>
    <Card 
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.shadows[4],
          zIndex: 1
        },
      }}
      onClick={onClick}
    >
      {/* Template preview with proper aspect ratio */}
      <Box sx={{
        paddingTop: 2,
        paddingBottom: 2,
        bgcolor: 'black',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden', // Ensure no content bleeds outside
      }}>
        {/* Container for thumbnail and aspect ratio */}
        <Box sx={{
          position: 'relative',
          width: '180px',
          maxWidth: '95%',
        }}>
          {/* Thumbnail image if available */}
          {template.thumbnailUrl && (
            <Box 
              component="img"
              src={template.thumbnailUrl}
              alt={template.name}
              sx={{
                width: '100%',
                height: 'auto',
                aspectRatio: aspectRatio,
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1,
                border: '4px solid white',
                borderRadius: '4px',
              }}
            />
          )}
          
          {/* Aspect ratio container - always visible */}
          <Box
            sx={{
              width: '100%',
              aspectRatio: aspectRatio,
              border: '4px solid white',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 0 20px rgba(255,255,255,0.3)',
              position: 'relative',
              backgroundColor: template.thumbnailUrl ? 'rgba(0,0,0,0.5)' : '#111',
              zIndex: template.thumbnailUrl ? 2 : 1,
            }}
          >
            {/* Aspect ratio text */}
            <Typography 
              variant="h4" 
              component="div" 
              textAlign="center" 
              fontWeight="bold" 
              color="white"
              sx={{ 
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                letterSpacing: '1px',
                zIndex: 3,
              }}
            >
              {template.format === 'square' && '1:1'}
              {template.format === 'landscape' && '16:9'}
              {template.format === 'portrait' && '4:5'}
              {template.format === 'story' && '9:16'}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8,
          bgcolor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '50%',
        }}
      >
        <IconButton 
          size="small" 
          onClick={handleFavoriteToggle}
          sx={{ color: 'white' }}
        >
          {template.isFavorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
        </IconButton>
      </Box>
      
      <Box 
        sx={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0,
          right: 0,
          bgcolor: 'rgba(0, 0, 0, 0.6)',
          py: 0.5,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Format chip removed as requested */}
        
        <IconButton 
          size="small" 
          sx={{ color: 'white' }}
          onClick={(e) => {
            e.stopPropagation();
            window.open(template.previewUrl, '_blank');
          }}
        >
          <PlayCircleOutlineIcon />
        </IconButton>
      </Box>

      <CardContent sx={{ flexGrow: 1, py: 1 }}>
        <Typography variant="subtitle1" component="div" gutterBottom>
          {template.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {template.description}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
          {template.platforms.map((platform) => (
            <Chip
              key={platform}
              icon={getPlatformIcon(platform)}
              label={platform}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', p: 1, pt: 0 }}>
        <IconButton
          size="small"
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteDialogOpen(true);
          }}
        >
          <DeleteIcon />
        </IconButton>
        
        <Button 
          size="small" 
          variant="contained"
          onClick={(e) => {
            e.stopPropagation();
            // Dispatch action to use template
          }}
        >
          Use
        </Button>
      </CardActions>
    </Card>
    
    {/* Delete confirmation dialog */}
    <Dialog
      open={deleteDialogOpen}
      onClose={() => setDeleteDialogOpen(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <DialogTitle>Delete Template</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete "{template.name}"? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
        <Button 
          onClick={() => {
            if (onDelete) {
              onDelete(template.id);
              setDeleteDialogOpen(false);
              setDeleteSuccessSnackbar(true);
            }
          }} 
          color="error" 
          variant="contained"
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>

    {/* Success notification */}
    <Snackbar 
      open={deleteSuccessSnackbar} 
      autoHideDuration={4000} 
      onClose={() => setDeleteSuccessSnackbar(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        onClose={() => setDeleteSuccessSnackbar(false)} 
        severity="success" 
        sx={{ width: '100%' }}
      >
        Template deleted successfully
      </Alert>
    </Snackbar>
  </>
  );
};

export default TemplateCard;