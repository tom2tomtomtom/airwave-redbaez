import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Button, 
  Paper, 
  Tabs, 
  Tab, 
  TextField, 
  MenuItem, 
  IconButton,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardMedia,
  CardContent,
  CardActions
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchAssets, uploadAsset } from '../../store/slices/assetsSlice';
import AssetUploadForm from '../../components/assets/AssetUploadForm';
import AssetCard from '../../components/assets/AssetCard';

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
      id={`assets-tabpanel-${index}`}
      aria-labelledby={`assets-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
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

const AssetsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { assets, loading, error } = useSelector((state: RootState) => state.assets);
  
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [assetType, setAssetType] = useState('all');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  
  useEffect(() => {
    dispatch(fetchAssets());
  }, [dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleAssetTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAssetType(event.target.value);
  };

  const handleOpenUploadDialog = () => {
    setOpenUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
  };

  const handleAssetUpload = (assetData: FormData) => {
    dispatch(uploadAsset(assetData));
    setOpenUploadDialog(false);
  };

  // Filter assets based on search query and type
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = assetType === 'all' || asset.type === assetType;
    return matchesSearch && matchesType;
  });

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Asset Management
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleOpenUploadDialog}
        >
          Upload Asset
        </Button>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="asset tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All Assets" />
          <Tab label="Recent" />
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
      </Paper>

      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Typography>Loading assets...</Typography>
        ) : error ? (
          <Typography color="error">Error loading assets: {error}</Typography>
        ) : filteredAssets.length === 0 ? (
          <Box 
            sx={{ 
              p: 4, 
              textAlign: 'center', 
              bgcolor: 'background.paper', 
              borderRadius: 1 
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No assets found
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {searchQuery || assetType !== 'all' 
                ? 'No assets match your current filters. Try adjusting your search criteria.' 
                : 'Upload your first asset to get started.'}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleOpenUploadDialog}
              sx={{ mt: 2 }}
            >
              Upload Asset
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredAssets.map((asset) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={asset.id}>
                <AssetCard asset={asset} />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography>Recent assets will appear here</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography>Favorite assets will appear here</Typography>
      </TabPanel>

      {/* Upload Asset Dialog */}
      <Dialog open={openUploadDialog} onClose={handleCloseUploadDialog} maxWidth="md" fullWidth>
        <DialogTitle>Upload New Asset</DialogTitle>
        <DialogContent>
          <AssetUploadForm onSubmit={handleAssetUpload} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetsPage;