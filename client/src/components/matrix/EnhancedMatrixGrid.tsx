import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Chip,
  Stack,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CloudDownload as CloudDownloadIcon,
  Share as ShareIcon,
  ThumbUp as ThumbUpIcon,
  Analytics as AnalyticsIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  MoreVert as MoreVertIcon,
  InsertPhoto as InsertPhotoIcon,
  Videocam as VideocamIcon,
  TextFields as TextFieldsIcon,
  Settings as SettingsIcon,
  FilterAlt as FilterAltIcon,
  Sort as SortIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { AssetCombination } from '../matrix/MatrixCombinationGrid';
import { styled } from '@mui/material/styles';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeGrid as Grid2 } from 'react-window';

// Custom styled components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[6],
  },
}));

const StyledCardMedia = styled(CardMedia)(({ theme }) => ({
  position: 'relative',
  paddingTop: '56.25%', // 16:9 aspect ratio
  backgroundColor: theme.palette.grey[100],
  backgroundSize: 'cover',
  '&.portrait': {
    paddingTop: '177.78%', // 9:16 aspect ratio
  },
  '&.square': {
    paddingTop: '100%', // 1:1 aspect ratio
  },
}));

const ScoreChip = styled(Chip)<{ score: number }>(({ theme, score }) => {
  // Color based on score (green for high, yellow for medium, red for low)
  let color;
  if (score >= 0.7) {
    color = theme.palette.success.main;
  } else if (score >= 0.4) {
    color = theme.palette.warning.main;
  } else {
    color = theme.palette.error.main;
  }
  
  return {
    backgroundColor: color,
    color: theme.palette.common.white,
    fontWeight: 'bold',
  };
});

// Define the format type for the grid
export type TemplateFormat = 'landscape' | 'portrait' | 'square' | 'instagram' | 'tiktok' | 'twitter';

interface EnhancedMatrixGridProps {
  combinations: AssetCombination[];
  isGenerating: boolean;
  isOptimizing: boolean;
  templateFormat?: TemplateFormat;
  onGenerateAll: () => void;
  onRegenerateCombination: (combinationId: string) => void;
  onToggleFavourite: (combinationId: string) => void;
  onExportCombination: (combinationId: string) => void;
  onExportAll: () => void;
  onOptimizeRecommendations?: () => void;
  onViewAnalytics?: (combinationId: string) => void;
}

export const EnhancedMatrixGrid: React.FC<EnhancedMatrixGridProps> = ({
  combinations,
  isGenerating,
  isOptimizing,
  templateFormat = 'square',
  onGenerateAll,
  onRegenerateCombination,
  onToggleFavourite,
  onExportCombination,
  onExportAll,
  onOptimizeRecommendations,
  onViewAnalytics
}) => {
  const [sortedCombinations, setSortedCombinations] = useState<AssetCombination[]>([]);
  const [sortOrder, setSortOrder] = useState<'score' | 'date' | 'favourite'>('score');
  const [selectedCombination, setSelectedCombination] = useState<AssetCombination | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuCombinationId, setMenuCombinationId] = useState<string | null>(null);
  
  // Grid configuration
  const [columnCount, setColumnCount] = useState(3);
  const itemSize = 300; // Size of each grid item
  
  // Update column count based on window width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 600) {
        setColumnCount(1);
      } else if (width < 960) {
        setColumnCount(2);
      } else if (width < 1280) {
        setColumnCount(3);
      } else {
        setColumnCount(4);
      }
    };
    
    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Update and sort combinations when they change
  useEffect(() => {
    sortCombinations();
  }, [combinations, sortOrder]);
  
  const sortCombinations = useCallback(() => {
    const sorted = [...combinations].sort((a, b) => {
      // Apply different sort orders
      if (sortOrder === 'score') {
        // First priority: engagement score
        if (a.engagementScore !== undefined && b.engagementScore !== undefined) {
          return b.engagementScore - a.engagementScore;
        }
      } else if (sortOrder === 'favourite') {
        // First priority: favourites
        if (a.isFavourite && !b.isFavourite) return -1;
        if (!a.isFavourite && b.isFavourite) return 1;
      }
      
      // Common secondary priorities
      // Put completed items first
      if (a.status === 'completed' && b.status !== 'completed') return -1;
      if (a.status !== 'completed' && b.status === 'completed') return 1;
      
      // For items with same status, sort by progress
      if (a.status === b.status) {
        return b.progress - a.progress;
      }
      
      return 0;
    });
    
    setSortedCombinations(sorted);
  }, [combinations, sortOrder]);
  
  // Open the options menu for a combination
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, combinationId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuCombinationId(combinationId);
  };
  
  // Close the options menu
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuCombinationId(null);
  };
  
  // Handle menu actions
  const handleMenuAction = (action: 'favourite' | 'export' | 'regenerate' | 'analytics') => {
    if (!menuCombinationId) return;
    
    switch (action) {
      case 'favourite':
        onToggleFavourite(menuCombinationId);
        break;
      case 'export':
        onExportCombination(menuCombinationId);
        break;
      case 'regenerate':
        onRegenerateCombination(menuCombinationId);
        break;
      case 'analytics':
        if (onViewAnalytics) {
          onViewAnalytics(menuCombinationId);
        }
        break;
    }
    
    handleCloseMenu();
  };
  
  // Handle preview opening
  const handleOpenPreview = (combination: AssetCombination) => {
    setSelectedCombination(combination);
    setPreviewOpen(true);
  };
  
  // Get the correct aspect ratio class for card media
  const getAspectRatioClass = (): string => {
    switch (templateFormat) {
      case 'landscape': return '';
      case 'portrait': return 'portrait';
      case 'square': return 'square';
      case 'instagram': return 'square';
      case 'tiktok': return 'portrait';
      case 'twitter': return '';
      default: return '';
    }
  };
  
  // Get asset type icon
  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <InsertPhotoIcon fontSize="small" />;
      case 'video': return <VideocamIcon fontSize="small" />;
      case 'text': return <TextFieldsIcon fontSize="small" />;
      default: return null;
    }
  };
  
  // Render an individual combination card
  const renderCombinationCard = (combination: AssetCombination) => {
    const { id, assets, status, progress, previewUrl, engagementScore, isFavourite } = combination;
    
    // Get asset info for display
    const assetTypes = Object.values(assets)
      .filter(asset => asset !== null)
      .map(asset => asset!.type);
    
    // Determine if we should show asset info or status
    const isGeneratingOrPending = status === 'generating' || status === 'pending';
    
    return (
      <StyledCard>
        {/* Top-right status indicator for the card */}
        {status === 'completed' && engagementScore !== undefined && (
          <Tooltip title={`Engagement Score: ${Math.round(engagementScore * 100)}%`}>
            <ScoreChip
              score={engagementScore}
              label={`${Math.round(engagementScore * 100)}%`}
              size="small"
              icon={<BarChartIcon />}
              sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            />
          </Tooltip>
        )}
        
        {/* Favourite indicator */}
        {isFavourite && (
          <Tooltip title="Favourite">
            <Chip
              icon={<FavoriteIcon fontSize="small" />}
              size="small"
              color="secondary"
              sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}
            />
          </Tooltip>
        )}
        
        {/* Media preview */}
        <StyledCardMedia
          className={getAspectRatioClass()}
          image={previewUrl}
          onClick={() => status === 'completed' && handleOpenPreview(combination)}
          sx={{ cursor: status === 'completed' ? 'pointer' : 'default' }}
        >
          {isGeneratingOrPending && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.4)'
              }}
            >
              <CircularProgress
                variant={status === 'generating' ? 'determinate' : 'indeterminate'}
                value={progress}
                color="primary"
                size={60}
              />
              {status === 'generating' && (
                <Typography
                  variant="body2"
                  sx={{
                    position: 'absolute',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  {Math.round(progress)}%
                </Typography>
              )}
            </Box>
          )}
          
          {status === 'failed' && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 0, 0, 0.3)'
              }}
            >
              <Typography variant="body1" color="error">
                Generation Failed
              </Typography>
            </Box>
          )}
        </StyledCardMedia>
        
        {/* Content area */}
        <CardContent sx={{ flexGrow: 1, p: 1 }}>
          <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
            {assetTypes.map((type, index) => (
              <Tooltip key={`${id}-${type}-${index}`} title={type}>
                <Box sx={{ display: 'flex' }}>
                  {getAssetTypeIcon(type)}
                </Box>
              </Tooltip>
            ))}
          </Stack>
          
          <Typography variant="body2" color="text.secondary">
            {Object.keys(assets).length} variable{Object.keys(assets).length > 1 ? 's' : ''}
          </Typography>
        </CardContent>
        
        {/* Actions */}
        <CardActions sx={{ p: 1, pt: 0 }}>
          {status === 'completed' && (
            <>
              <IconButton 
                size="small" 
                color={isFavourite ? "secondary" : "default"}
                onClick={() => onToggleFavourite(id)}
              >
                {isFavourite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
              
              <IconButton 
                size="small"
                onClick={() => onExportCombination(id)}
              >
                <CloudDownloadIcon />
              </IconButton>
            </>
          )}
          
          {status === 'failed' && (
            <Button 
              size="small" 
              onClick={() => onRegenerateCombination(id)}
              startIcon={<RefreshIcon />}
              color="primary"
              variant="outlined"
            >
              Retry
            </Button>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          <IconButton 
            size="small"
            onClick={(e) => handleOpenMenu(e, id)}
          >
            <MoreVertIcon />
          </IconButton>
        </CardActions>
      </StyledCard>
    );
  };
  
  // Cell renderer for the virtualized grid
  const CellRenderer = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    
    if (index >= sortedCombinations.length) {
      return <div style={style} />;
    }
    
    const combination = sortedCombinations[index];
    
    return (
      <div style={{
        ...style,
        padding: 8,
      }}>
        {renderCombinationCard(combination)}
      </div>
    );
  };
  
  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      {/* Actions toolbar */}
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={isGenerating ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          onClick={onGenerateAll}
          disabled={isGenerating || combinations.length === 0}
        >
          {isGenerating ? 'Generating...' : 'Generate All'}
        </Button>
        
        <Button
          variant="outlined"
          color="primary"
          startIcon={isOptimizing ? <CircularProgress size={20} /> : <AnalyticsIcon />}
          onClick={onOptimizeRecommendations}
          disabled={isOptimizing || combinations.filter(c => c.status === 'completed').length === 0}
        >
          {isOptimizing ? 'Optimizing...' : 'Optimize'}
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<CloudDownloadIcon />}
          onClick={onExportAll}
          disabled={combinations.filter(c => c.status === 'completed').length === 0}
        >
          Export All
        </Button>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Tooltip title="Sort by">
          <IconButton onClick={() => {
            // Cycle through sort options
            if (sortOrder === 'score') setSortOrder('favourite');
            else if (sortOrder === 'favourite') setSortOrder('date');
            else setSortOrder('score');
          }}>
            <SortIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Main grid display */}
      {combinations.length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
          No combinations yet. Select assets and generate combinations.
        </Typography>
      ) : (
        <Box sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
          <AutoSizer>
            {({ height, width }) => {
              const rowCount = Math.ceil(sortedCombinations.length / columnCount);
              
              return (
                <Grid2
                  columnCount={columnCount}
                  columnWidth={width / columnCount}
                  height={height}
                  rowCount={rowCount}
                  rowHeight={itemSize}
                  width={width}
                >
                  {CellRenderer}
                </Grid2>
              );
            }}
          </AutoSizer>
        </Box>
      )}
      
      {/* Preview dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedCombination && (
          <>
            <DialogTitle>
              Combination Preview
              
              {selectedCombination.engagementScore !== undefined && (
                <Chip
                  label={`Engagement: ${Math.round(selectedCombination.engagementScore * 100)}%`}
                  color="primary"
                  size="small"
                  icon={<BarChartIcon />}
                  sx={{ ml: 2 }}
                />
              )}
            </DialogTitle>
            
            <DialogContent>
              <Box sx={{ width: '100%', textAlign: 'center' }}>
                {selectedCombination.previewUrl ? (
                  // If video, use video player, otherwise show image
                  <Box
                    component={Object.values(selectedCombination.assets).some(a => a?.type === 'video') ? 'video' : 'img'}
                    src={selectedCombination.previewUrl}
                    controls={Object.values(selectedCombination.assets).some(a => a?.type === 'video')}
                    sx={{ 
                      maxWidth: '100%', 
                      maxHeight: '60vh',
                      display: 'block', 
                      margin: '0 auto' 
                    }}
                  />
                ) : (
                  <Skeleton variant="rectangular" width="100%" height={400} />
                )}
              </Box>
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Assets
              </Typography>
              
              <Grid container spacing={2}>
                {Object.entries(selectedCombination.assets).map(([variableName, asset]) => (
                  asset && (
                    <Grid item xs={6} sm={4} key={`${selectedCombination.id}-${variableName}`}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 1 }}>
                          <Typography variant="subtitle2" noWrap>
                            {variableName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {asset.name}
                          </Typography>
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                            <Chip
                              icon={getAssetTypeIcon(asset.type)}
                              label={asset.type}
                              size="small"
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                ))}
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button
                onClick={() => onExportCombination(selectedCombination.id)}
                startIcon={<CloudDownloadIcon />}
                variant="outlined"
              >
                Export
              </Button>
              
              {onViewAnalytics && (
                <Button
                  onClick={() => {
                    onViewAnalytics(selectedCombination.id);
                    setPreviewOpen(false);
                  }}
                  startIcon={<AnalyticsIcon />}
                  variant="outlined"
                >
                  View Analytics
                </Button>
              )}
              
              <Button
                onClick={() => setPreviewOpen(false)}
                variant="contained"
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Options menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => handleMenuAction('favourite')}>
          <ListItemIcon>
            {sortedCombinations.find(c => c.id === menuCombinationId)?.isFavourite
              ? <FavoriteIcon fontSize="small" />
              : <FavoriteBorderIcon fontSize="small" />
            }
          </ListItemIcon>
          {sortedCombinations.find(c => c.id === menuCombinationId)?.isFavourite
            ? 'Remove from Favourites'
            : 'Add to Favourites'
          }
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuAction('export')}>
          <ListItemIcon>
            <CloudDownloadIcon fontSize="small" />
          </ListItemIcon>
          Export
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuAction('regenerate')}>
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          Regenerate
        </MenuItem>
        
        {onViewAnalytics && (
          <MenuItem onClick={() => handleMenuAction('analytics')}>
            <ListItemIcon>
              <AnalyticsIcon fontSize="small" />
            </ListItemIcon>
            View Analytics
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};
