import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  CardActions,
  Button,
  CircularProgress,
  Tooltip,
  Paper,
  Skeleton,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import {
  Check as CheckIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CloudDownload as CloudDownloadIcon,
  Share as ShareIcon,
  ThumbUp as ThumbUpIcon,
  Analytics as AnalyticsIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon
} from '@mui/icons-material';
import { Asset } from '../../types/assets';

// Types for Matrix Combinations
export interface AssetCombination {
  id: string;
  assets: { [variableName: string]: Asset | null };
  previewUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  engagementScore?: number;  // Calculated score based on A/B testing or predictive model
  isFavourite?: boolean;
}

interface MatrixCombinationGridProps {
  combinations: AssetCombination[];
  isGenerating: boolean;
  isOptimizing: boolean;
  onGenerateAll: () => void;
  onRegenerateCombination: (combinationId: string) => void;
  onToggleFavourite: (combinationId: string) => void;
  onExportCombination: (combinationId: string) => void;
  templateFormat?: string;
  onOptimizeRecommendations?: () => void;
}

export const MatrixCombinationGrid: React.FC<MatrixCombinationGridProps> = ({
  combinations,
  isGenerating,
  isOptimizing,
  onGenerateAll,
  onRegenerateCombination,
  onToggleFavourite,
  onExportCombination,
  templateFormat = 'square',
  onOptimizeRecommendations
}) => {
  const [sortedCombinations, setSortedCombinations] = useState<AssetCombination[]>([]);
  
  // Update and sort combinations when they change
  useEffect(() => {
    // Sort combinations by engagement score (if available), then by status
    const sorted = [...combinations].sort((a, b) => {
      // First priority: put completed items first
      if (a.status === 'completed' && b.status !== 'completed') return -1;
      if (a.status !== 'completed' && b.status === 'completed') return 1;
      
      // Second priority: sort by engagement score (higher first)
      if (a.engagementScore !== undefined && b.engagementScore !== undefined) {
        return b.engagementScore - a.engagementScore;
      }
      
      // Third priority: put favourites first
      if (a.isFavourite && !b.isFavourite) return -1;
      if (!a.isFavourite && b.isFavourite) return 1;
      
      // For items with same status, sort by progress
      if (a.status === b.status) {
        return b.progress - a.progress;
      }
      
      return 0;
    });
    
    setSortedCombinations(sorted);
  }, [combinations]);
  
  // Helper function to get aspect ratio based on template format
  const getAspectRatio = () => {
    switch (templateFormat) {
      case 'landscape':
        return '16/9';
      case 'portrait':
        return '4/5';
      case 'story':
        return '9/16';
      case 'square':
      default:
        return '1/1';
    }
  };
  
  // Render the combinations grid
  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h6">
          Matrix Combinations ({combinations.length})
        </Typography>
        <Box>
          {onOptimizeRecommendations && (
            <Button 
              variant="outlined" 
              startIcon={<AnalyticsIcon />}
              onClick={onOptimizeRecommendations}
              disabled={isOptimizing || isGenerating || combinations.length === 0}
              sx={{ mr: 2 }}
            >
              {isOptimizing ? 'Optimising...' : 'Optimise Recommendations'}
            </Button>
          )}
          <Button 
            variant="contained" 
            onClick={onGenerateAll}
            disabled={isGenerating || combinations.length === 0}
          >
            {isGenerating ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Generating...
              </>
            ) : 'Generate All'}
          </Button>
        </Box>
      </Box>
      
      {combinations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Select assets for each variable to create combinations
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {sortedCombinations.map((combination) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={combination.id}>
              <Card 
                sx={{ 
                  position: 'relative',
                  border: combination.engagementScore !== undefined && combination.engagementScore > 0.7 ? 
                    '2px solid #4caf50' : undefined
                }}
              >
                {/* Preview Image/Video */}
                <Box 
                  sx={{ 
                    position: 'relative',
                    paddingTop: `calc(100% * ${getAspectRatio().split('/')[1]} / ${getAspectRatio().split('/')[0]})`,
                    backgroundColor: 'grey.100'
                  }}
                >
                  {combination.status === 'completed' && combination.previewUrl ? (
                    <CardMedia
                      component={combination.previewUrl.endsWith('.mp4') ? 'video' : 'img'}
                      src={combination.previewUrl}
                      controls={combination.previewUrl.endsWith('.mp4')}
                      sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <Box 
                      sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'grey.200'
                      }}
                    >
                      {combination.status === 'generating' ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <CircularProgress 
                            variant="determinate" 
                            value={combination.progress} 
                            size={50}
                          />
                          <Typography variant="caption" display="block">
                            {Math.round(combination.progress)}%
                          </Typography>
                        </Box>
                      ) : combination.status === 'failed' ? (
                        <Typography color="error">Generation Failed</Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Pending Generation
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {/* Badges for engagement score or optimization */}
                  {combination.engagementScore !== undefined && (
                    <Chip
                      label={`Score: ${Math.round(combination.engagementScore * 100)}%`}
                      color={combination.engagementScore > 0.7 ? 'success' : 
                             combination.engagementScore > 0.4 ? 'primary' : 'default'}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                </Box>
                
                <CardContent sx={{ pt: 1, pb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Combination #{combinations.indexOf(combination) + 1}
                  </Typography>
                  
                  {/* Asset list summary */}
                  {Object.entries(combination.assets).length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      {Object.entries(combination.assets).map(([variableName, asset]) => (
                        asset && (
                          <Tooltip key={variableName} title={`${variableName}: ${asset.name}`}>
                            <Chip
                              label={variableName.substring(0, 1).toUpperCase()}
                              size="small"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Tooltip>
                        )
                      ))}
                    </Stack>
                  )}
                </CardContent>
                
                <CardActions sx={{ pt: 0 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => onToggleFavourite(combination.id)}
                    color={combination.isFavourite ? 'primary' : 'default'}
                  >
                    {combination.isFavourite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  
                  <IconButton 
                    size="small"
                    onClick={() => onRegenerateCombination(combination.id)}
                    disabled={isGenerating || combination.status === 'generating'}
                  >
                    <ShareIcon />
                  </IconButton>
                  
                  <IconButton
                    size="small"
                    onClick={() => onExportCombination(combination.id)}
                    disabled={combination.status !== 'completed'}
                  >
                    <CloudDownloadIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
