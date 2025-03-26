import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Container, Typography, Box, Card, CardContent, Button } from '@mui/material';
import AssetCard from '../../components/assets/AssetCard';
import { Asset } from '../../types/assets';

// This is the verified client ID from our database check
const JUNIPER_CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';

const JuniperDebugPage: React.FC = () => {
  const { assets, loading: assetsLoading } = useSelector((state: RootState) => state.assets);
  const { templates, loading: templatesLoading } = useSelector((state: RootState) => state.templates);
  const { clients, loading: clientsLoading } = useSelector((state: RootState) => state.clients);
  
  const [juniperAssets, setJuniperAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [showAllAssets, setShowAllAssets] = useState(false);
  
  // Get the Juniper client details
  const juniperClient = clients.find(client => client.id === JUNIPER_CLIENT_ID);
  
  useEffect(() => {
    // Try different filtering methods
    const directlyFiltered = assets.filter(asset => asset.clientId === JUNIPER_CLIENT_ID);
    console.log('Directly filtered Juniper assets:', directlyFiltered.length);
    
    // UUID format normalization approach
    const normalizeUuid = (id: string | null | undefined): string => {
      if (!id) return '';
      // Remove any whitespace, dashes and convert to lowercase
      return id.toString().replace(/[\\s-]/g, '').toLowerCase();
    };
    
    const normalizedJuniperId = normalizeUuid(JUNIPER_CLIENT_ID);
    const normalizedFiltered = assets.filter(asset => {
      const normalizedAssetId = normalizeUuid(asset.clientId);
      return normalizedAssetId === normalizedJuniperId;
    });
    console.log('Normalized filtered Juniper assets:', normalizedFiltered.length);
    
    // Set the assets using the best method
    setJuniperAssets(directlyFiltered.length > 0 ? directlyFiltered : normalizedFiltered);
    
    // Also store all assets for debugging
    setFilteredAssets(assets.slice(0, 10)); // Just show the first 10 for debugging
  }, [assets]);
  
  if (assetsLoading || templatesLoading || clientsLoading) {
    return <Typography>Loading...</Typography>;
  }
  
  return (
    <Container>
      <Typography variant="h4" gutterBottom>Juniper Client Debug Page</Typography>
      <Box my={2}>
        <Typography variant="body1">
          This page is specifically for debugging the Juniper client assets.
        </Typography>
        <Typography variant="body2" color="primary">
          Juniper Client ID: {JUNIPER_CLIENT_ID}
        </Typography>
        <Typography variant="body2">
          Juniper Client Name: {juniperClient?.name || 'Not found in clients'}
        </Typography>
        <Typography variant="body2">
          Total Assets in Store: {assets.length}
        </Typography>
        <Typography variant="body2">
          Juniper Assets Found: {juniperAssets.length}
        </Typography>
      </Box>

      <Button 
        variant="outlined" 
        color="primary" 
        onClick={() => setShowAllAssets(!showAllAssets)}
        sx={{ mb: 2 }}
      >
        {showAllAssets ? "Show Only Juniper Assets" : "Show First 10 Assets"}
      </Button>
      
      <Typography variant="h5" gutterBottom>
        {showAllAssets ? "First 10 Assets (for Debugging)" : "Juniper Assets"}
      </Typography>
      
      <Box display="flex" flexWrap="wrap" gap={2}>
        {(showAllAssets ? filteredAssets : juniperAssets).map((asset) => (
          <Card key={asset.id} sx={{ width: 300, mb: 2 }}>
            <CardContent>
              <Typography variant="h6" noWrap title={asset.name}>
                {asset.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ID: {asset.id}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Client ID: {asset.clientId}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Type: {asset.type}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      
      {(showAllAssets ? filteredAssets : juniperAssets).length === 0 && (
        <Typography color="error">
          No assets found for {showAllAssets ? 'debugging' : 'Juniper client'}.
        </Typography>
      )}
    </Container>
  );
};

export default JuniperDebugPage;
