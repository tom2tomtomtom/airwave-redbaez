import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button,
  Chip,
  Badge,
  IconButton,
  Divider,
  Paper,
  Tooltip
} from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';

import { CopyVariation } from '../../../services/copyGeneration/types';

interface VariationGalleryProps {
  variations: CopyVariation[];
  selectedVariationId: string | null;
  onSelectVariation: (id: string) => void;
  onEditVariation: (variation: CopyVariation) => void;
  onViewHistory: (variationId: string) => void;
}

/**
 * Variation Gallery Component
 * 
 * Displays multiple copy variations with version history
 * and allows for selection, editing, and reviewing.
 */
const VariationGallery: React.FC<VariationGalleryProps> = ({
  variations,
  selectedVariationId,
  onSelectVariation,
  onEditVariation,
  onViewHistory
}) => {
  // Get status chip color
  const getStatusColor = (status: CopyVariation['status']) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'review':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  // Get quality score stars
  const renderQualityScore = (score?: number) => {
    if (!score) return null;
    
    const fullStars = Math.floor(score);
    const emptyStars = 5 - fullStars;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {[...Array(fullStars)].map((_, i) => (
          <StarIcon key={`full-${i}`} fontSize="small" color="warning" />
        ))}
        {[...Array(emptyStars)].map((_, i) => (
          <StarOutlineIcon key={`empty-${i}`} fontSize="small" color="action" />
        ))}
      </Box>
    );
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // No variations yet
  if (variations.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Copy Variations Yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure your generation settings and click "Generate Copy" to create variations.
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Copy Variations
      </Typography>
      
      <Grid container spacing={3}>
        {variations.map((variation) => (
          <Grid item xs={12} sm={6} md={4} key={variation.id}>
            <Card 
              variant="outlined" 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderWidth: selectedVariationId === variation.id ? 2 : 1,
                borderColor: selectedVariationId === variation.id ? 'primary.main' : 'divider'
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Chip 
                    label={`v${variation.version}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                  <Chip 
                    label={variation.status} 
                    size="small" 
                    color={getStatusColor(variation.status)}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  {renderQualityScore(variation.qualityScore)}
                </Box>
                
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <FormatQuoteIcon 
                    sx={{ 
                      position: 'absolute', 
                      top: -10, 
                      left: -8, 
                      opacity: 0.2, 
                      transform: 'scaleX(-1)' 
                    }} 
                  />
                  
                  <Typography variant="body1" sx={{ pl: 3, pr: 1 }}>
                    {variation.frames 
                      ? `${variation.frames[0]}...` 
                      : variation.text}
                  </Typography>
                  
                  <FormatQuoteIcon 
                    sx={{ 
                      position: 'absolute', 
                      bottom: -10, 
                      right: -8, 
                      opacity: 0.2 
                    }} 
                  />
                </Box>
                
                {variation.frames && variation.frames.length > 1 && (
                  <Typography variant="body2" color="text.secondary">
                    {variation.frames.length} frames
                  </Typography>
                )}
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(variation.modifiedAt)}
                  </Typography>
                  
                  <Box>
                    <Tooltip title="Like">
                      <IconButton size="small" color="primary">
                        <ThumbUpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Dislike">
                      <IconButton size="small" color="error">
                        <ThumbDownIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
                <Button 
                  size="small" 
                  startIcon={<EditIcon />}
                  onClick={() => onEditVariation(variation)}
                >
                  Edit
                </Button>
                
                <Box>
                  <Tooltip title="View version history">
                    <IconButton 
                      size="small" 
                      onClick={() => onViewHistory(variation.id)}
                    >
                      <Badge 
                        badgeContent={variation.version > 1 ? variation.version : 0} 
                        color="primary"
                        showZero={false}
                      >
                        <HistoryIcon fontSize="small" />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  
                  <Button 
                    size="small" 
                    variant={selectedVariationId === variation.id ? "contained" : "outlined"}
                    onClick={() => onSelectVariation(variation.id)}
                    color="primary"
                  >
                    {selectedVariationId === variation.id ? "Selected" : "Select"}
                  </Button>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default VariationGallery;
