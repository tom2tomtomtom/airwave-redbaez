import React, { useEffect } from 'react';
import { 
  Grid, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  InputAdornment,
  IconButton,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { Asset, AssetType } from '../../types/assets';
import AssetCard from './AssetCard';
import { useAssetSelectionState } from '../../hooks/useAssetSelectionState';

interface AssetListProps {
  initialType?: AssetType | 'all';
  showFilters?: boolean;
  onAssetSelect?: (asset: Asset | null) => void;
  selectedAssetId?: string;
  initialFavourite?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Component for displaying and filtering a list of assets
 */
const AssetList: React.FC<AssetListProps> = ({ 
  initialType = 'all', 
  showFilters = true,
  onAssetSelect,
  selectedAssetId,
  initialFavourite = false,
  sortBy = 'date',
  sortDirection = 'desc'
}) => {
  const {
    assets,
    loading,
    error,
    filters,
    updateFilters,
    loadAssets,
    handleAssetChanged,
    selectAsset,
    showFilters: displayFilters
  } = useAssetSelectionState(
    initialType,
    initialFavourite,
    sortBy,
    sortDirection,
    showFilters
  );
  
  // No need for the useEffect to load assets - it's now handled in the hook
  
  // Set initial type filter - now handled in the hook via props
  
  // Update selection when selectedAssetId prop changes
  useEffect(() => {
    if (selectedAssetId !== undefined) {
      selectAsset(selectedAssetId);
    }
  }, [selectedAssetId, selectAsset]);
  
  // Handle asset selection
  const handleAssetClick = (asset: Asset) => {
    if (onAssetSelect) {
      // If the same asset is clicked again, deselect it
      if (selectedAssetId === asset.id) {
        onAssetSelect(null);
        selectAsset(null);
      } else {
        onAssetSelect(asset);
        selectAsset(asset.id);
      }
    }
  };
  
  // Clear search input
  const handleClearSearch = () => {
    updateFilters({ search: '' });
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search assets"
                value={filters.search || ''}
                onChange={(e) => updateFilters({ search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: filters.search ? (
                    <InputAdornment position="end">
                      <IconButton onClick={handleClearSearch} edge="end" size="small">
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="asset-type-label">Asset Type</InputLabel>
                <Select
                  labelId="asset-type-label"
                  id="asset-type-select"
                  value={filters.type || 'all'}
                  label="Asset Type"
                  onChange={(e) => updateFilters({ type: e.target.value as AssetType | 'all' })}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="image">Images</MenuItem>
                  <MenuItem value="video">Videos</MenuItem>
                  <MenuItem value="audio">Voice Overs</MenuItem>
                  <MenuItem value="text">Copy Texts</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="asset-favourite-label">Favourites</InputLabel>
                <Select
                  labelId="asset-favourite-label"
                  id="asset-favourite-select"
                  value={filters.favourite ? 'true' : 'false'}
                  label="Favourites"
                  onChange={(e) => updateFilters({ favourite: e.target.value === 'true' })}
                >
                  <MenuItem value="false">All Assets</MenuItem>
                  <MenuItem value="true">Favourites Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="asset-sort-label">Sort By</InputLabel>
                <Select
                  labelId="asset-sort-label"
                  id="asset-sort-select"
                  value={`${filters.sortBy || 'date'}-${filters.sortDirection || 'desc'}`}
                  label="Sort By"
                  onChange={(e) => {
                    const [sortBy, sortDirection] = e.target.value.split('-');
                    updateFilters({ 
                      sortBy: sortBy as string,
                      sortDirection: sortDirection as 'asc' | 'desc'
                    });
                  }}
                >
                  <MenuItem value="date-desc">Newest First</MenuItem>
                  <MenuItem value="date-asc">Oldest First</MenuItem>
                  <MenuItem value="name-asc">Name (A-Z)</MenuItem>
                  <MenuItem value="name-desc">Name (Z-A)</MenuItem>
                  <MenuItem value="type-asc">Type (A-Z)</MenuItem>
                  <MenuItem value="type-desc">Type (Z-A)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {filters.type !== 'all' && (
              <Grid item xs={12}>
                <Chip 
                  label={`Type: ${filters.type}`}
                  onDelete={() => updateFilters({ type: 'all' })}
                  sx={{ mr: 1 }}
                />
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : assets.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No assets found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {filters.search || filters.type !== 'all' 
              ? 'Try adjusting your filters'
              : 'Upload assets to get started'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {assets.map((asset) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={asset.id}>
              <Box
                onClick={() => handleAssetClick(asset)}
                sx={{ 
                  cursor: onAssetSelect ? 'pointer' : 'default',
                  transform: 'scale(1)',
                  transition: 'transform 0.2s',
                  '&:hover': onAssetSelect ? { transform: 'scale(1.02)' } : {},
                  border: selectedAssetId === asset.id ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  borderRadius: '4px'
                }}
              >
                <AssetCard 
                  asset={asset} 
                  onAssetChanged={handleAssetChanged} 
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default AssetList;
