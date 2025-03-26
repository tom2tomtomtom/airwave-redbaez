import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
import { uploadAsset } from '../../store/slices/assetsSlice';
import AssetList from '../../components/assets/AssetList';
import DirectAssetDisplay from '../../components/assets/DirectAssetDisplay';
import { Asset as ApiAsset } from '../../api/types/asset.types';
import { Asset as AppAsset, AssetType } from '../../types/assets';
import ClientSelector from '../../components/clients/ClientSelector';
import TabPanel from '../../components/common/TabPanel';
import DirectAssetLoader from '../../components/assets/DirectAssetLoader';
import AssetUploadHandler from '../../components/assets/AssetUploadHandler';
import { convertApiAssetToAppAsset } from '../../utils/asset-type-converters';

// Fallback client ID only used when no client is selected
const FALLBACK_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

const AssetsPage: React.FC<{}> = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  // Reference to asset list component for refresh actions
  const assetListRef = useRef<any>(null);
  
  // Get the selected client ID from Redux store
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  
  // Direct assets state - this uses API types directly to avoid conversion issues
  const [directAssets, setDirectAssets] = useState<ApiAsset[]>([]);
  const [isDirectLoading, setIsDirectLoading] = useState(false);
  
  const [tabValue, setTabValue] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<AppAsset | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // This adapter handles converting between asset types
  const handleAssetSelect = (asset: ApiAsset | null) => {
    // Convert API asset to application asset before setting
    setSelectedAsset(convertApiAssetToAppAsset(asset));
  };
  
  // Create a wrapper function for components that expect AppAsset
  const handleAppAssetSelect = (asset: AppAsset | null) => {
    setSelectedAsset(asset);
  };

  // Load assets directly using the API to bypass service chain issues
  const loadAssetsDirectly = async () => {
    setIsDirectLoading(true);
    try {
      // Use the selected client ID from Redux, or fallback if none selected
      const clientIdToUse = selectedClientId || FALLBACK_CLIENT_ID;
      console.log(`🔄 Loading assets for client ID: ${clientIdToUse}`);
      
      // Direct API call with the selected or fallback client ID
      const response = await axios.get(`/api/assets?clientId=${clientIdToUse}`);
      console.log('Direct API call result:', response.data);
      
      // Set the API assets directly without type conversion
      // Ensure we're always setting an array to avoid "map is not a function" errors
      const assetsData = response.data;
      const assetsArray: ApiAsset[] = Array.isArray(assetsData) ? assetsData : 
                         (assetsData && typeof assetsData === 'object' && 'data' in assetsData && Array.isArray(assetsData.data)) ? assetsData.data : [];
      
      console.log('Processed assets array:', assetsArray);
      setDirectAssets(assetsArray);
    } catch (error) {
      console.error('Error loading assets directly:', error);
    } finally {
      setIsDirectLoading(false);
    }
  };

  // Load assets when component mounts or when selected client changes
  useEffect(() => {
    console.log('💡 Loading assets - client ID changed or component mounted');
    loadAssetsDirectly();
  }, [selectedClientId]);

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Asset Management
        </Typography>
      </Box>

      {/* Asset upload handler */}
      <AssetUploadHandler 
        onAssetUploaded={loadAssetsDirectly}
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
        {/* Success message if assets loaded directly */}
        {directAssets.length > 0 && (
          <Box sx={{ mb: 2, p: 1, bgcolor: '#e8f5e9', borderRadius: 1 }}>
            <Typography variant="body2" color="success.main">
              ✅ Successfully loaded {directAssets.length} assets directly
            </Typography>
          </Box>
        )}
        
        {/* Direct display of assets using the simplified component */}
        <DirectAssetDisplay 
          assets={directAssets} 
          selectedAssetId={selectedAsset?.id}
          onAssetSelect={handleAssetSelect}
        />
        
        {/* Original asset list component as fallback */}
        <AssetList 
          ref={assetListRef}
          initialType="all" 
          onAssetSelect={handleAppAssetSelect} 
          selectedAssetId={selectedAsset?.id}
          initialClientId={selectedClientId || FALLBACK_CLIENT_ID}
          // @ts-ignore - Adding custom prop to pass direct assets
          directlyLoadedAssets={directAssets}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <AssetList 
          initialType="all" 
          showFilters={false}
          sortBy="date"
          sortDirection="desc"
          onAssetSelect={handleAppAssetSelect}
          selectedAssetId={selectedAsset?.id}
          initialClientId={selectedClientId || FALLBACK_CLIENT_ID}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <AssetList 
          initialType="all" 
          showFilters={false}
          initialFavourite={true}
          onAssetSelect={handleAppAssetSelect}
          selectedAssetId={selectedAsset?.id}
          initialClientId={selectedClientId || FALLBACK_CLIENT_ID}
        />
      </TabPanel>


    </Box>
  );
};

export default AssetsPage;