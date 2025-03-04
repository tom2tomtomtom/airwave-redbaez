import React, { useState } from 'react';
import { 
  Card, 
  CardMedia, 
  CardContent, 
  CardActions, 
  Typography, 
  IconButton, 
  Menu, 
  MenuItem, 
  Chip, 
  Box
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CloudDownload as CloudDownloadIcon,
  TextFields as TextFieldsIcon,
  Image as ImageIcon,
  Videocam as VideocamIcon,
  AudioFile as AudioFileIcon
} from '@mui/icons-material';
import { Asset } from '../../types/assets';

interface AssetCardProps {
  asset: Asset;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isFavorite, setIsFavorite] = useState(asset.isFavorite || false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
    // Here you would dispatch an action to update the favorite status in the backend
  };

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleDelete = () => {
    // Dispatch delete action
    handleMenuClose();
  };

  const handleEdit = () => {
    // Redirect to edit page or open edit dialog
    handleMenuClose();
  };

  const handleDownload = () => {
    // Handle asset download
    handleMenuClose();
  };

  // Determine icon based on asset type
  const getAssetTypeIcon = () => {
    switch (asset.type) {
      case 'image':
        return <ImageIcon />;
      case 'video':
        return <VideocamIcon />;
      case 'audio':
        return <AudioFileIcon />;
      case 'text':
        return <TextFieldsIcon />;
      default:
        return <TextFieldsIcon />;
    }
  };

  return (
    <Card elevation={2}>
      {/* Media Preview */}
      {asset.type === 'image' && (
        <CardMedia
          component="img"
          height="140"
          image={asset.url}
          alt={asset.name}
        />
      )}
      
      {asset.type === 'video' && (
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            height="140"
            image={asset.thumbnailUrl || asset.url}
            alt={asset.name}
          />
          <IconButton 
            sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)',
              }
            }}
            onClick={handlePlayToggle}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Box>
      )}
      
      {asset.type === 'audio' && (
        <Box 
          sx={{ 
            height: 140, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'primary.light' 
          }}
        >
          <AudioFileIcon sx={{ fontSize: 60, color: 'white' }} />
        </Box>
      )}
      
      {asset.type === 'text' && (
        <Box 
          sx={{ 
            height: 140, 
            p: 2,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'secondary.light',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              maxHeight: '100%', 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {asset.content}
          </Typography>
        </Box>
      )}

      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" component="div" noWrap title={asset.name}>
            {asset.name}
          </Typography>
          <IconButton 
            size="small" 
            onClick={handleFavoriteToggle}
          >
            {isFavorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
          </IconButton>
        </Box>
        
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            icon={getAssetTypeIcon()} 
            label={asset.type.charAt(0).toUpperCase() + asset.type.slice(1)} 
            size="small" 
            variant="outlined"
          />
          {asset.tags?.map((tag, index) => (
            <Chip key={index} label={tag} size="small" />
          ))}
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <IconButton aria-label="more options" onClick={handleMenuClick}>
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={handleDownload}>
            <CloudDownloadIcon fontSize="small" sx={{ mr: 1 }} />
            Download
          </MenuItem>
          <MenuItem onClick={handleDelete}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>
      </CardActions>
    </Card>
  );
};

export default AssetCard;