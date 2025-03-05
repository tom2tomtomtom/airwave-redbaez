import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Chip,
  Button,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  CollectionsBookmark as CollectionsBookmarkIcon
} from '@mui/icons-material';
import { fetchAssets } from '../../store/slices/assetsSlice';
import { RootState, AppDispatch } from '../../store';
import { Asset } from '../../types/assets';

interface AssetSelectionStepProps {
  selectedAssets: string[];
  onChange: (selectedAssets: string[]) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`asset-tabpanel-${index}`}
      aria-labelledby={`asset-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AssetTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'video', label: 'Videos' },
  { value: 'image', label: 'Images' },
  { value: 'audio', label: 'Voice Overs' },
  { value: 'text', label: 'Copy Text' },
];

const AssetSelectionStep: React.FC<AssetSelectionStepProps> = ({
  selectedAssets,
  onChange
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { assets, loading, error } = useSelector((state: RootState) => state.assets);
  
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [assetType, setAssetType] = useState('all');
  const [selectedAssetsMap, setSelectedAssetsMap] = useState<Record<string, boolean>>({});
  
  // Initialize selected assets map from props
  useEffect(() => {
    const initialMap: Record<string, boolean> = {};
    selectedAssets.forEach(id => {
      initialMap[id] = true;
    });
    setSelectedAssetsMap(initialMap);
  }, []);
  
  // Fetch assets if not already loaded
  useEffect(() => {
    if (assets.length === 0 && !loading && !error) {
      dispatch(fetchAssets());
    }
  }, [dispatch, assets.length, loading, error]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handleAssetTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAssetType(event.target.value);
  };
  
  const handleAssetSelect = (assetId: string) => {
    const newSelectedAssetsMap = {
      ...selectedAssetsMap,
      [assetId]: !selectedAssetsMap[assetId]
    };
    
    setSelectedAssetsMap(newSelectedAssetsMap);
    
    // Convert the map back to an array of selected asset IDs
    const newSelectedAssets = Object.keys(newSelectedAssetsMap).filter(
      id => newSelectedAssetsMap[id]
    );
    
    onChange(newSelectedAssets);
  };
  
  const handleSelectAll = (selected: boolean) => {
    const newSelectedAssetsMap: Record<string, boolean> = {};
    
    filteredAssets.forEach(asset => {
      newSelectedAssetsMap[asset.id] = selected;
    });
    
    // Keep previously selected assets that aren't in the current filtered view
    Object.keys(selectedAssetsMap).forEach(id => {
      if (!filteredAssets.some(asset => asset.id === id) && selectedAssetsMap[id]) {
        newSelectedAssetsMap[id] = true;
      }
    });
    
    setSelectedAssetsMap(newSelectedAssetsMap);
    
    // Convert the map back to an array of selected asset IDs
    const newSelectedAssets = Object.keys(newSelectedAssetsMap).filter(
      id => newSelectedAssetsMap[id]
    );
    
    onChange(newSelectedAssets);
  };
  
  // Filter assets based on search query, type, and tab
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = assetType === 'all' || asset.type === assetType;
    const matchesTab = tabValue === 0 || // All assets tab
      (tabValue === 1 && asset.isFavorite); // Favorites tab
    
    return matchesSearch && matchesType && matchesTab;
  });
  
  // Check if all filtered assets are selected
  const allSelected = filteredAssets.length > 0 && 
    filteredAssets.every(asset => selectedAssetsMap[asset.id]);
  
  // Count the total number of selected assets
  const selectedCount = Object.values(selectedAssetsMap).filter(Boolean).length;
  
  // Get asset thumbnail based on type
  const getAssetThumbnail = (asset: Asset) => {
    if (asset.type === 'image' && asset.url) {
      return asset.url;
    } else if (asset.type === 'video' && asset.thumbnailUrl) {
      return asset.thumbnailUrl;
    } else if (asset.type === 'audio') {
      return '/assets/audio-placeholder.png'; // Replace with actual placeholder
    } else if (asset.type === 'text') {
      return '/assets/text-placeholder.png'; // Replace with actual placeholder
    }
    return '/assets/generic-placeholder.png'; // Replace with actual placeholder
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Select assets for your campaign
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<AddIcon />}
          onClick={() => window.location.href = '/assets'}
        >
          Upload New Assets
        </Button>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="asset selection tabs"
        >
          <Tab label="All Assets" />
          <Tab label="Favorites" />
        </Tabs>
        
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            placeholder="Search assets..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
            sx={{ flexGrow: 1 }}
          />
          <TextField
            select
            label="Asset Type"
            value={assetType}
            onChange={handleAssetTypeChange}
            size="small"
            sx={{ minWidth: 150 }}
          >
            {AssetTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <IconButton aria-label="filter">
            <FilterIcon />
          </IconButton>
        </Box>
        
        <Divider />
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={allSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                indeterminate={selectedCount > 0 && !allSelected}
              />
            }
            label={`Select All${selectedCount > 0 ? ` (${selectedCount} selected)` : ''}`}
          />
          
          <Chip
            icon={<CollectionsBookmarkIcon />}
            label={`${selectedCount} assets selected`}
            color="primary"
            variant={selectedCount > 0 ? 'filled' : 'outlined'}
          />
        </Box>
      </Paper>
      
      <TabPanel value={tabValue} index={0}>
        <AssetGrid
          assets={filteredAssets}
          selectedAssetsMap={selectedAssetsMap}
          onAssetSelect={handleAssetSelect}
          loading={loading}
          error={error}
          getAssetThumbnail={getAssetThumbnail}
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <AssetGrid
          assets={filteredAssets}
          selectedAssetsMap={selectedAssetsMap}
          onAssetSelect={handleAssetSelect}
          loading={loading}
          error={error}
          getAssetThumbnail={getAssetThumbnail}
        />
      </TabPanel>
    </Box>
  );
};

interface AssetGridProps {
  assets: Asset[];
  selectedAssetsMap: Record<string, boolean>;
  onAssetSelect: (assetId: string) => void;
  loading: boolean;
  error: string | null;
  getAssetThumbnail: (asset: Asset) => string;
}

const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  selectedAssetsMap,
  onAssetSelect,
  loading,
  error,
  getAssetThumbnail
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Error loading assets: {error}</Typography>
      </Box>
    );
  }
  
  if (assets.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1">No assets found matching your criteria.</Typography>
      </Box>
    );
  }
  
  return (
    <Grid container spacing={2}>
      {assets.map((asset) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={asset.id}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              cursor: 'pointer',
              border: selectedAssetsMap[asset.id] ? '2px solid' : '1px solid',
              borderColor: selectedAssetsMap[asset.id] ? 'primary.main' : 'divider',
              '&:hover': {
                borderColor: selectedAssetsMap[asset.id] ? 'primary.main' : 'primary.light',
                boxShadow: 2
              }
            }}
            onClick={() => onAssetSelect(asset.id)}
          >
            {selectedAssetsMap[asset.id] && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  bgcolor: 'primary.main',
                  borderRadius: '50%',
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CheckCircleIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
            )}
            
            <CardMedia
              component="img"
              height="120"
              image={getAssetThumbnail(asset)}
              alt={asset.name}
              sx={{ 
                objectFit: 'cover',
                bgcolor: asset.type === 'text' ? 'grey.100' : 'black'
              }}
            />
            
            <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
              <Typography variant="subtitle2" noWrap title={asset.name}>
                {asset.name}
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                <Chip
                  label={asset.type}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
                
                {asset.type === 'text' && (
                  <Typography variant="caption" color="text.secondary">
                    {asset.content && asset.content.length > 0 
                      ? `${asset.content.slice(0, 20)}${asset.content.length > 20 ? '...' : ''}`
                      : 'No content'}
                  </Typography>
                )}
                
                {asset.type === 'image' && asset.metadata?.width && asset.metadata?.height && (
                  <Typography variant="caption" color="text.secondary">
                    {`${asset.metadata.width}×${asset.metadata.height}`}
                  </Typography>
                )}
                
                {asset.type === 'video' && asset.metadata?.duration && (
                  <Typography variant="caption" color="text.secondary">
                    {asset.metadata.duration}
                  </Typography>
                )}
                
                {asset.type === 'audio' && asset.metadata?.duration && (
                  <Typography variant="caption" color="text.secondary">
                    {asset.metadata.duration}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default AssetSelectionStep;