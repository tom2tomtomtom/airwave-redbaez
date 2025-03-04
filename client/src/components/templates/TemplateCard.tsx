import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Box,
  Button
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  PlayCircleOutline as PlayCircleOutlineIcon,
  Facebook as FacebookIcon,
  YouTube as YouTubeIcon,
  Instagram as InstagramIcon,
} from '@mui/icons-material';
import { Template } from '../../types/templates';

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
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
      return null;
  }
};

// Helper function to get format color
const getFormatColor = (format: string) => {
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

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onClick }) => {
  const [isFavorite, setIsFavorite] = React.useState(template.isFavorite || false);

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    // Here you would dispatch an action to update the favorite status
  };

  return (
    <Card 
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.3s',
        '&:hover': {
          transform: 'scale(1.02)',
        },
      }}
      onClick={onClick}
    >
      <CardMedia
        component="img"
        height="180"
        image={template.thumbnailUrl}
        alt={template.name}
        sx={{ position: 'relative' }}
      />
      
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
          {isFavorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
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
        <Chip 
          label={template.format}
          size="small"
          color={getFormatColor(template.format) as any}
          sx={{ fontSize: '0.75rem' }}
        />
        
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

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="div" gutterBottom>
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

      <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
        <Button 
          size="small" 
          variant="contained"
          onClick={(e) => {
            e.stopPropagation();
            // Dispatch action to use template
          }}
        >
          Use Template
        </Button>
      </CardActions>
    </Card>
  );
};

export default TemplateCard;