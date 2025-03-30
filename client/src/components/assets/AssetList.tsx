import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
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
  Chip,
  Pagination,
  Skeleton,
  SelectChangeEvent
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import AssetCard from './AssetCard';
import { Asset, AssetType } from '../../api/types/asset.types';
import { Client } from '../../types/client';
import { AssetFilters as AssetFilterType } from '../../api/types/asset.types';

interface AssetListProps {
  assets: Asset[];
  isLoading: boolean;
  initialType?: AssetType | 'all';
  showFilters?: boolean;
  onAssetSelect?: (asset: Asset | null) => void;
  selectedAssetId?: string;
  initialFavourite?: boolean;
  sortBy?: keyof Asset;
  sortDirection?: 'asc' | 'desc';
}

export interface AssetListHandles {
  loadAssets: () => void;
}

const AssetList = forwardRef<AssetListHandles, AssetListProps>(({
  assets,
  isLoading,
  initialType = 'all',
  showFilters = true,
  onAssetSelect,
  selectedAssetId,
  initialFavourite = false,
  sortBy = 'date',
  sortDirection = 'desc',
}, ref) => {
  const [filters, setFilters] = useState<AssetFilterType>({
    type: initialType,
    favourite: initialFavourite,
    search: '',
    sortBy: sortBy as keyof Asset,
    sortDirection: sortDirection,
    page: 1,
    limit: 12,
  });

  useImperativeHandle(ref, () => ({ 
    loadAssets: () => {
      console.warn('loadAssets called via ref - should be handled by RTK Query now');
    }
  }));

  const filteredAssets = useMemo(() => {
    let result = [...assets];
    if (filters.type && filters.type !== 'all') {
      result = result.filter(asset => asset.type === filters.type);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(asset => 
        asset.name.toLowerCase().includes(searchLower) ||
        (asset.description && asset.description.toLowerCase().includes(searchLower)) ||
        (asset.metadata?.tags && asset.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }
    if (filters.favourite) {
      result = result.filter(asset => asset.favourite);
    }
    if (filters.sortBy) {
      result.sort((a, b) => {
        const key = filters.sortBy as keyof Asset;
        if (!key || a[key] === undefined || b[key] === undefined) {
          return 0; 
        }
        if (a[key] < b[key]) {
          return filters.sortDirection === 'asc' ? -1 : 1;
        }
        if (a[key] > b[key]) {
          return filters.sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    const limit = filters.limit || 12; 
    const page = filters.page || 1; 
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return result.slice(startIndex, endIndex);
  }, [assets, filters]);

  const totalPages = useMemo(() => {
    let countResult = [...assets];
    if (filters.type && filters.type !== 'all') {
      countResult = countResult.filter(asset => asset.type === filters.type);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      countResult = countResult.filter(asset => 
        asset.name.toLowerCase().includes(searchLower) ||
        (asset.description && asset.description.toLowerCase().includes(searchLower)) ||
        (asset.metadata?.tags && asset.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }
    if (filters.favourite) {
      countResult = countResult.filter(asset => asset.favourite);
    }
    const limit = filters.limit || 12; 
    return Math.ceil(countResult.length / limit);
  }, [assets, filters.type, filters.search, filters.favourite, filters.limit]);

  const handleFilterChange = (newFilters: Partial<AssetFilterType>) => {
    const resetPage = Object.keys(newFilters).some(key => key !== 'page');
    setFilters((prev: AssetFilterType) => ({
      ...prev, 
      ...newFilters, 
      page: resetPage ? 1 : prev.page
    }));
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setFilters((prev: AssetFilterType) => ({ ...prev, page: value }));
  };

  const handleAssetClick = (asset: Asset) => {
    if (onAssetSelect) {
      if (selectedAssetId === asset.id) {
        onAssetSelect(null);
      } else {
        onAssetSelect(asset);
      }
    }
  };

  const handleClearSearch = () => {
    handleFilterChange({ search: '' });
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
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
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
                value={filters.type}
                label="Asset Type"
                onChange={(e) => handleFilterChange({ type: e.target.value as AssetType | 'all' })}
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
                onChange={(e) => handleFilterChange({ favourite: e.target.value === 'true' })}
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
                value={`${filters.sortBy}-${filters.sortDirection}`}
                label="Sort By"
                onChange={(e: SelectChangeEvent<string>) => {
                  const [sortBy, sortDirection] = e.target.value.split('-');
                  handleFilterChange({ 
                    sortBy: sortBy as keyof Asset,
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
                onDelete={() => handleFilterChange({ type: 'all' })}
                sx={{ mr: 1 }}
              />
            </Grid>
          )}
        </Grid>
      </Paper>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {isLoading 
            ? Array.from(new Array(filters.limit || 12)).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Skeleton variant="rectangular" width="100%" height={180} />
                  <Skeleton width="60%" />
                  <Skeleton width="80%" />
                </Grid>
              ))
            : filteredAssets.map(asset => (
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
                    asset={asset as any} 
                  />
                </Box>
              </Grid>
            ))}
        </Grid>
      )}
      {!isLoading && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination 
            count={totalPages} 
            page={filters.page} 
            onChange={handlePageChange} 
          />
        </Box>
      )}
    </Box>
  );
});

export default AssetList;
