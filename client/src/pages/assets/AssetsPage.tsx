import React, { useState, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  CircularProgress,
  Alert
} from '@mui/material';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store';
import AssetList from '../../components/assets/AssetList';
import { Asset as AppAsset, AssetType } from '../../types/assets';
import ClientSelector from '../../components/clients/ClientSelector';
import TabPanel from '../../components/common/TabPanel';
import AssetUploadHandler from '../../components/assets/AssetUploadHandler';
import { useGetAssetsByClientIdQuery } from '../../store/api/assetsApi';

// Fallback client ID might still be needed for initial load or if no client selected
const FALLBACK_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

const AssetsPage: React.FC<{}> = () => {
  const navigate = useNavigate();
  
  // Reference to asset list component for refresh actions - may become redundant with RTK Query
  const assetListRef = useRef<{ loadAssets: () => void } | null>(null); 
  
  // Get the selected client ID from Redux store
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  const clientIdToUse = selectedClientId || FALLBACK_CLIENT_ID;

  // Use the RTK Query hook to fetch assets
  const {
    data: assets, // Rename data to assets for clarity
    error,
    isLoading,
    isFetching, // Use isFetching for loading indicators during refetch
    // refetch // Can be used for manual refresh if needed
  } = useGetAssetsByClientIdQuery(
    { clientId: clientIdToUse }, 
    { skip: !clientIdToUse } // Skip query if no client ID is available
  );
  
  const [tabValue, setTabValue] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<AppAsset | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAssetSelect = (asset: AppAsset | null) => {
    setSelectedAsset(asset);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Asset Management
        </Typography>
      </Box>

      <AssetUploadHandler clientId={clientIdToUse} /> 
      
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

      {/* Display loading or error state */}
      {isLoading && <CircularProgress sx={{ display: 'block', margin: 'auto' }} />}
      {error && <Alert severity="error">Failed to load assets: {JSON.stringify(error)}</Alert>}

      <TabPanel value={tabValue} index={0}>
        <AssetList 
          assets={assets || []} // Pass fetched assets or empty array
          isLoading={isFetching} // Indicate loading during fetch/refetch
          ref={assetListRef} 
          initialType="all" 
          onAssetSelect={handleAssetSelect} 
          selectedAssetId={selectedAsset?.id}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <AssetList 
          assets={assets || []} // Pass fetched assets or empty array
          isLoading={isFetching} // Indicate loading during fetch/refetch
          initialType="all" 
          showFilters={false}
          sortDirection="desc"
          onAssetSelect={handleAssetSelect}
          selectedAssetId={selectedAsset?.id}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <AssetList 
          assets={assets || []} // Pass fetched assets or empty array
          isLoading={isFetching} // Indicate loading during fetch/refetch
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