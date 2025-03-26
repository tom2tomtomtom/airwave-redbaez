import React from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent, CardMedia, Chip } from '@mui/material';
import { Asset as ApiAsset } from '../../api/types/asset.types';
import { DirectAssetDisplay } from '../assets/DirectAssetLoader';

interface ClientAssetListProps {
  selectedClientId: string | null;
  loading?: boolean;
  useDirectLoading?: boolean;
}

/**
 * Component to display and filter assets by client
 * Uses DirectAssetLoader to handle asset loading and display reliably
 */
export const ClientAssetList: React.FC<ClientAssetListProps> = ({
  selectedClientId,
  loading = false,
  useDirectLoading = true
}) => {
  if (!selectedClientId) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Please select a client to view assets</Typography>
      </Box>
    );
  }

  // Render the asset card component
  const renderAsset = (asset: ApiAsset) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {asset.thumbnailUrl && (
        <CardMedia
          component="img"
          image={asset.thumbnailUrl}
          alt={asset.name}
          sx={{ height: 140, objectFit: 'contain', backgroundColor: '#f5f5f5' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom noWrap>
          {asset.name}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          <Chip size="small" label={asset.type} color="primary" />
          {asset.metadata?.tags?.map((tag: string) => (
            <Chip key={tag} size="small" label={tag} variant="outlined" />
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {asset.description || 'No description'}
        </Typography>
      </CardContent>
    </Card>
  );

  // Use the DirectAssetDisplay component which handles asset loading internally
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Assets for Client
      </Typography>
      
      <DirectAssetDisplay
        clientId={selectedClientId}
        renderAsset={renderAsset}
        noAssetsMessage="No assets found for this client"
        layout="grid"
      />
    </Box>
  );
};

export default ClientAssetList;
