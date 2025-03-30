import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  CircularProgress
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchAssets } from '../../store/slices/assetsSlice';
import AssetList from '../../components/assets/AssetList';
import { Asset as AppAsset, AssetType } from '../../types/assets';
import ClientSelector from '../../components/clients/ClientSelector';
import TabPanel from '../../components/common/TabPanel';
import AssetUploadHandler from '../../components/assets/AssetUploadHandler';

// Fallback client ID might still be needed for initial load or if no client selected
const FALLBACK_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

const AssetsPage: React.FC<{}> = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  // Reference to asset list component for refresh actions
  const assetListRef = useRef<{ loadAssets: () => void } | null>(null); 
  
  // Get the selected client ID from Redux store
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  
  const [tabValue, setTabValue] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<AppAsset | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAssetSelect = (asset: AppAsset | null) => {
    setSelectedAsset(asset);
  };
  
  useEffect(() => {
    const clientIdToUse = selectedClientId || FALLBACK_CLIENT_ID;
    if (clientIdToUse) {
      console.log(`🔄 Dispatching fetchAssets for client ID: ${clientIdToUse}`);
      dispatch(fetchAssets({ clientId: clientIdToUse })); 
    } else {
      console.warn('⚠️ No client ID selected, cannot fetch assets.');
    }
  }, [selectedClientId, dispatch]);

  const handleAssetUploaded = () => {
    const clientIdToUse = selectedClientId || FALLBACK_CLIENT_ID;
    if (clientIdToUse) {
      console.log('✅ Asset uploaded, refreshing list via fetchAssets...');
      dispatch(fetchAssets({ clientId: clientIdToUse }));
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Asset Management
        </Typography>
      </Box>

      <AssetUploadHandler 
        onAssetUploaded={handleAssetUploaded} 
        clientId={selectedClientId || FALLBACK_CLIENT_ID} 
      />
      
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
        
        <Box sx={{ p: 2, mb: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter by Client
          </Typography>
          <ClientSelector />
        </Box>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <AssetList 
          ref={assetListRef} 
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

    </Box>
  );
};

export default AssetsPage;