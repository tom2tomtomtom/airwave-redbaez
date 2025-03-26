import React, { useState, useCallback } from 'react';
import { getAssetUrl } from '../../utils/assetUtils';
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
  Box,
  CircularProgress,
  LinearProgress,
  Badge
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
import { useAssetOperations } from '../../hooks/useAssetOperations';

interface AssetCardProps {
  asset: Asset;
  onAssetChanged?: (assetId: string) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onAssetChanged }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // Handle both UK and US spelling variants for favourite/favorite
  const [isFavourite, setIsFavourite] = useState(asset.isFavourite || asset.isFavorite || false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Use our custom hook for asset operations
  const { toggleFavourite, deleteAsset, downloadAsset, loading, error } = useAssetOperations();
  
  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleFavouriteToggle = useCallback(async () => {
    const newStatus = await toggleFavourite(asset.id, isFavourite);
    setIsFavourite(newStatus);
    
    if (onAssetChanged) {
      onAssetChanged(asset.id);
    }
  }, [asset.id, isFavourite, toggleFavourite, onAssetChanged]);

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleDelete = useCallback(async () => {
    const success = await deleteAsset(asset.id);
    
    if (success && onAssetChanged) {
      onAssetChanged(asset.id);
    }
    
    handleMenuClose();
  }, [asset.id, deleteAsset, onAssetChanged]);

  const handleEdit = () => {
    // Redirect to edit page or open edit dialog
    handleMenuClose();
  };

  const handleDownload = useCallback(async () => {
    await downloadAsset(asset.id);
    handleMenuClose();
  }, [asset.id, downloadAsset]);

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
          image={getAssetUrl(asset?.url || '')}
          alt={asset.name}
        />
      )}
      
      {asset.type === 'video' && (
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            height="140"
            image={getAssetUrl(asset?.thumbnailUrl || asset?.url || '')}
            alt={asset.name}
          />
          {asset.status === 'processing' ? (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <CircularProgress color="secondary" size={30} sx={{ mb: 1 }} />
              <Typography variant="caption" align="center" sx={{ fontWeight: 'bold' }}>
                Processing Video
              </Typography>
              <LinearProgress 
                sx={{ width: '80%', mt: 1 }}
                color="secondary"
              />
            </Box>
          ) : (
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
          )}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {asset.status === 'processing' && (
              <Chip 
                label="Processing" 
                color="secondary" 
                size="small"
                icon={<CircularProgress size={10} color="inherit" />}
                sx={{ height: 24 }}
              />
            )}
            <IconButton 
              size="small" 
              onClick={handleFavouriteToggle}
              disabled={loading}
            >
              {isFavourite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
            </IconButton>
          </Box>
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