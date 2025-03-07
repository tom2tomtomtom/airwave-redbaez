import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Tabs, 
  Tab, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { uploadAsset } from '../../store/slices/assetsSlice';
import AssetUploadForm from '../../components/assets/AssetUploadForm';
import AssetList from '../../components/assets/AssetList';
import { Asset, AssetType } from '../../types/assets';

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



const AssetsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const [tabValue, setTabValue] = useState(0);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
  
  const handleAssetSelect = (asset: Asset | null) => {
    setSelectedAsset(asset);
  };

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
          <Tab label="Favourites" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <AssetList 
          initialType="all" 
          onAssetSelect={handleAssetSelect} 
          selectedAssetId={selectedAsset?.id}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <AssetList 
          initialType="all" 
          showFilters={false}
          sortBy="date"
          sortDirection="desc"
          onAssetSelect={handleAssetSelect}
          selectedAssetId={selectedAsset?.id}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <AssetList 
          initialType="all" 
          showFilters={false}
          initialFavourite={true}
          onAssetSelect={handleAssetSelect}
          selectedAssetId={selectedAsset?.id}
        />
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