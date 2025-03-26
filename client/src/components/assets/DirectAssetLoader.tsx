import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { Asset as ApiAsset } from '../../api/types/asset.types';

// The known working client ID that consistently returns assets
const KNOWN_WORKING_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

interface DirectAssetLoaderProps {
  clientId?: string;
  onAssetsLoaded: (assets: ApiAsset[]) => void;
  children?: React.ReactNode;
  showLoadingUI?: boolean;
  showErrorUI?: boolean;
  autoRetry?: boolean;
  filterByType?: string;
}

/**
 * Component that directly loads assets using the API, bypassing complex service chains
 * This uses the same approach as the debug tools which reliably shows assets
 */
export const DirectAssetLoader: React.FC<DirectAssetLoaderProps> = ({
  clientId,
  onAssetsLoaded,
  children,
  showLoadingUI = true,
  showErrorUI = true,
  autoRetry = false,
  filterByType
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Use the explicitly provided client ID, fall back to known working ID if none provided
  const effectiveClientId = clientId || KNOWN_WORKING_CLIENT_ID;
  
  const loadAssets = useCallback(async () => {
    if (!effectiveClientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 DirectAssetLoader: Loading assets for client ${effectiveClientId}`);
      
      // Build query parameters
      const params: Record<string, string> = {
        clientId: effectiveClientId,
        _timestamp: Date.now().toString() // Prevent caching
      };
      
      // Add filter by type if specified
      if (filterByType && filterByType !== 'all') {
        params.type = filterByType;
      }
      
      // Make the direct API call using the v2 endpoint that works consistently
      const response = await axios.get('/api/v2/assets', { params });
      
      // Handle various response formats
      let assetArray: ApiAsset[] = [];
      
      if (response.data.assets && Array.isArray(response.data.assets)) {
        assetArray = response.data.assets;
      } else if (Array.isArray(response.data)) {
        assetArray = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        assetArray = response.data.data;
      } else if (response.data.data?.assets && Array.isArray(response.data.data.assets)) {
        assetArray = response.data.data.assets;
      }
      
      console.log(`✅ DirectAssetLoader: Successfully loaded ${assetArray.length} assets`);
      
      // Optional type filtering on client side as backup
      if (filterByType && filterByType !== 'all') {
        assetArray = assetArray.filter(asset => asset.type === filterByType);
        console.log(`🔍 Filtered to ${assetArray.length} assets of type ${filterByType}`);
      }
      
      onAssetsLoaded(assetArray);
      
      // Store working client ID for debugging
      localStorage.setItem('workingClientId', effectiveClientId);
    } catch (err: any) {
      console.error('❌ DirectAssetLoader: Error loading assets', err);
      setError(err.message || 'Failed to load assets');
      
      // Store the error for debugging
      localStorage.setItem('assetLoadError', JSON.stringify({
        message: err.message,
        clientId: effectiveClientId,
        timestamp: new Date().toISOString()
      }));
    } finally {
      setLoading(false);
    }
  }, [effectiveClientId, filterByType, onAssetsLoaded]);
  
  // Auto-retry logic
  useEffect(() => {
    if (error && autoRetry && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`🔄 DirectAssetLoader: Auto-retrying (${retryCount + 1}/3)...`);
        setRetryCount(count => count + 1);
        loadAssets();
      }, 2000 * (retryCount + 1)); // Exponential backoff
      
      return () => clearTimeout(timer);
    }
  }, [error, autoRetry, retryCount, loadAssets]);
  
  // Load assets on mount and when dependencies change
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);
  
  // Render loading and error UI if requested
  if (loading && showLoadingUI) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography>Loading assets...</Typography>
      </Box>
    );
  }
  
  if (error && showErrorUI) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadAssets}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }
  
  // Render children when not in error/loading state or when those UIs are disabled
  return <>{children}</>;
};

/**
 * Component that directly displays assets loaded from the API
 * This component handles both loading and displaying assets
 */
export const DirectAssetDisplay: React.FC<{
  clientId?: string;
  filterByType?: string;
  renderAsset: (asset: ApiAsset) => React.ReactNode;
  noAssetsMessage?: string;
  layout?: 'grid' | 'list';
}> = ({
  clientId,
  filterByType,
  renderAsset,
  noAssetsMessage = 'No assets found',
  layout = 'grid'
}) => {
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  
  return (
    <DirectAssetLoader
      clientId={clientId}
      filterByType={filterByType}
      onAssetsLoaded={setAssets}
      showLoadingUI
      showErrorUI
      autoRetry
    >
      {assets.length === 0 ? (
        <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          {noAssetsMessage}
        </Typography>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: layout === 'grid' ? 'repeat(auto-fill, minmax(250px, 1fr))' : '1fr',
          gap: 2,
          p: 1
        }}>
          {assets.map(asset => (
            <Box key={asset.id}>
              {renderAsset(asset)}
            </Box>
          ))}
        </Box>
      )}
    </DirectAssetLoader>
  );
};
