import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
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
 * Component for displaying and filtering a list of assets using the useAssetSelectionState hook.
 */
const AssetList = forwardRef<{ loadAssets: () => void }, AssetListProps>((props, ref) => {
  const { 
    initialType = 'all', 
    showFilters = true,
    onAssetSelect,
    selectedAssetId,
    initialFavourite = false,
    sortBy = 'date',
    sortDirection = 'desc',
  } = props;

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
  
  useEffect(() => {
    if (selectedAssetId !== undefined) {
      selectAsset(selectedAssetId);
    }
  }, [selectedAssetId, selectAsset]);
  
  const handleAssetClick = (asset: Asset) => {
    if (onAssetSelect) {
      if (selectedAssetId === asset.id) {
        onAssetSelect(null);
        selectAsset(null);
      } else {
        onAssetSelect(asset);
        selectAsset(asset.id);
      }
    }
  };
  
  const handleClearSearch = () => {
    updateFilters({ search: '' });
  };
  
  useImperativeHandle(ref, () => ({
    loadAssets: loadAssets,
  }));
  
  const displayAssets = assets;
  const isLoading = loading;
  const displayError = error;
  
  return (
    <Box sx={{ width: '100%' }}>
      {displayFilters && (
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
      
      {displayError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {displayError}
        </Alert>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : displayAssets.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No assets found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {filters.search || filters.type !== 'all' 
              ? 'Try adjusting your filters'
              : 'Please upload a brief to generate assets'}
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {displayAssets.length} assets{displayAssets.length >= 48 ? " (more may be available)" : ""}
            </Typography>
            {displayAssets.some(asset => asset.status === 'processing') && (
              <Typography variant="body2" color="secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={12} color="secondary" sx={{ mr: 1 }} />
                Some assets are still processing
              </Typography>
            )}
          </Box>
          
          <Grid container spacing={2}>
            {displayAssets.map((asset) => (
              <Grid item xs={6} sm={4} md={3} lg={2} xl={2} key={asset.id}>
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
        </>
      )}
    </Box>
  );
});

export default AssetList;
