import React, { useState, ReactNode } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  AudioFile as AudioIcon,
  VideoFile as VideoIcon,
  Description as TextIcon
} from '@mui/icons-material';
import { Asset as ApiAsset } from '../../api/types/asset.types';
import { DirectAssetLoader } from './DirectAssetLoader';

interface DirectAssetDisplayProps {
  clientId?: string;
  filterByType?: string;
  renderAsset: (asset: ApiAsset) => ReactNode;
  noAssetsMessage?: string;
  layout?: 'grid' | 'list';
  limit?: number;
}

/**
 * A component that loads and displays assets using the DirectAssetLoader
 * This bypasses the complex hook chain and directly calls the API
 */
const DirectAssetDisplay: React.FC<DirectAssetDisplayProps> = ({
  clientId,
  filterByType,
  renderAsset,
  noAssetsMessage = 'No assets found',
  layout = 'grid',
  limit
}) => {
  // State to store loaded assets
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  
  // Function to handle assets loaded from DirectAssetLoader
  const handleAssetsLoaded = (loadedAssets: ApiAsset[]) => {
    // Apply limit if specified
    const limitedAssets = limit ? loadedAssets.slice(0, limit) : loadedAssets;
    setAssets(limitedAssets);
  };

  // Helper function to choose appropriate icon based on asset type
  const getAssetIcon = (assetType: string) => {
    switch (assetType) {
      case 'image':
        return <ImageIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
      case 'audio':
        return <AudioIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
      case 'video':
        return <VideoIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
      case 'text':
        return <TextIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
      default:
        return <FileIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
    }
  };

  return (
    <>
      {/* Use DirectAssetLoader to load assets */}
      <DirectAssetLoader
        clientId={clientId}
        filterByType={filterByType}
        onAssetsLoaded={handleAssetsLoaded}
        showLoadingUI={true}
        showErrorUI={true}
      />
      
      {/* Display loaded assets */}
      {assets.length === 0 ? (
        <Box sx={{ p: 2, mb: 3 }}>
          <Typography variant="body1" color="text.secondary">
            {noAssetsMessage}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          {layout === 'grid' ? (
            <Grid container spacing={2}>
              {assets.map((asset) => (
                <Grid item xs={12} sm={6} md={4} key={asset.id}>
                  {renderAsset(asset)}
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {assets.map((asset) => (
                <Box key={asset.id}>
                  {renderAsset(asset)}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </>
  );
};

export default DirectAssetDisplay;
