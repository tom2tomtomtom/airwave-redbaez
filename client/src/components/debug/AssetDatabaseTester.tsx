import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  TextField, 
  CircularProgress, 
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import axios from 'axios';
import assetService from '../../services/assetService';

// Known client and asset IDs from the database SQL
const KNOWN_CLIENT_IDS = [
  'fe418478-806e-411a-ad0b-1b9a537a8081', // Confirmed from SQL - both assets use this client ID
];

// Known asset details for verification
const KNOWN_ASSETS = [
  {
    id: '3feaa091-bd0b-4501-8c67-a5f96c767e1a',
    name: 'Juniper Brainfog Colour@2x',
    type: 'image',
    clientId: 'fe418478-806e-411a-ad0b-1b9a537a8081',
  },
  {
    id: '919ab7fc-71fc-4a76-9662-c1349bd7023c',
    name: 'Admin Test Asset',
    type: 'document',
    clientId: 'fe418478-806e-411a-ad0b-1b9a537a8081',
  },
];

/**
 * Component for testing asset retrieval with specific client IDs
 */
const AssetDatabaseTester: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});
  const [customClientId, setCustomClientId] = useState('');
  
  // Test a specific client ID
  const testClientId = useCallback(async (clientId: string) => {
    try {
      setLoading(true);
      
      const response = await axios.get('/api/v2/assets', {
        params: {
          clientId,
          debug: true,
          _timestamp: Date.now()
        }
      });
      
      // Check if the known assets are in the response
      const assets = response.data?.assets || [];
      const foundKnownAssets = KNOWN_ASSETS.filter(knownAsset => 
        assets.some((asset: any) => asset.id === knownAsset.id)
      );
      
      return {
        success: true,
        data: response.data,
        assetCount: assets.length,
        foundKnownAssets: foundKnownAssets,
        knownAssetsFound: foundKnownAssets.length,
        missingKnownAssets: KNOWN_ASSETS.length - foundKnownAssets.length
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        assetCount: 0,
        foundKnownAssets: [],
        knownAssetsFound: 0,
        missingKnownAssets: KNOWN_ASSETS.length
      };
    }
  }, []);
  
  // Test all known client IDs
  const testAllClientIds = async () => {
    setLoading(true);
    const newResults: Record<string, any> = {};
    
    // Test all known client IDs
    for (const clientId of KNOWN_CLIENT_IDS) {
      newResults[clientId] = await testClientId(clientId);
    }
    
    // Test custom client ID if provided
    if (customClientId && !KNOWN_CLIENT_IDS.includes(customClientId)) {
      newResults[customClientId] = await testClientId(customClientId);
    }
    
    setResults(newResults);
    setLoading(false);
  };
  
  // Test just the custom client ID
  const testCustomClientId = async () => {
    if (!customClientId) return;
    
    setLoading(true);
    const result = await testClientId(customClientId);
    setResults({ [customClientId]: result });
    setLoading(false);
  };
  
  // Count total assets found
  const totalAssetsFound = Object.values(results).reduce(
    (total, result) => total + (result.assetCount || 0), 
    0
  );

  return (
    <Paper sx={{ p: 3, mb: 3, maxWidth: '800px', mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Asset Database Tester
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2 }}>
        This tool helps identify which client IDs have assets in the database.
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Custom Client ID"
          value={customClientId}
          onChange={(e) => setCustomClientId(e.target.value)}
          placeholder="Enter a client ID to test"
          margin="normal"
        />
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={testAllClientIds}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Test All Client IDs'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={testCustomClientId}
            disabled={loading || !customClientId}
          >
            Test Custom ID Only
          </Button>
        </Box>
      </Box>
      
      {Object.keys(results).length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1">
            Results: {totalAssetsFound} total assets found
          </Typography>
          
          <List sx={{ bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
            {Object.entries(results).map(([clientId, result]) => (
              <ListItem key={clientId} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {clientId}
                      </Typography>
                      
                      <Chip 
                        size="small"
                        color={result.assetCount > 0 ? "success" : "error"}
                        label={result.assetCount > 0 
                          ? `${result.assetCount} assets found` 
                          : "No assets"
                        }
                      />
                      
                      {result.knownAssetsFound > 0 && (
                        <Chip
                          size="small"
                          color="primary"
                          label={`${result.knownAssetsFound}/${KNOWN_ASSETS.length} known assets found`}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      {result.success 
                        ? `Success: ${result.data?.success === true ? 'true' : 'false'}`
                        : `Error: ${result.error}`}
                      
                      {result.foundKnownAssets?.length > 0 && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Found known assets: {result.foundKnownAssets.map((asset: any) => asset.name).join(', ')}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
          
          {totalAssetsFound > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button 
                variant="contained" 
                color="success"
                onClick={() => {
                  // Find the first clientId with assets
                  const workingClientId = Object.entries(results).find(
                    ([_, result]) => result.assetCount > 0
                  )?.[0];
                  
                  if (workingClientId) {
                    // Store this ID in localStorage for future use
                    localStorage.setItem('selectedClientId', workingClientId);
                    localStorage.setItem('workingClientId', workingClientId);
                    alert(`Saved working client ID: ${workingClientId} to localStorage`);
                  }
                }}
              >
                Save Working Client ID to localStorage
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  // Try to directly fetch the Admin Test Asset
                  const assetId = '919ab7fc-71fc-4a76-9662-c1349bd7023c';
                  const clientId = 'fe418478-806e-411a-ad0b-1b9a537a8081';
                  
                  axios.get(`/api/v2/assets/${assetId}`, {
                    params: {
                      clientId,
                      debug: true
                    }
                  }).then(response => {
                    alert(`Successfully retrieved Admin Test Asset: ${JSON.stringify(response.data)}`);
                  }).catch(error => {
                    alert(`Failed to get Admin Test Asset: ${error.message}`);
                  });
                }}
              >
                Test Direct Asset Retrieval
              </Button>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default AssetDatabaseTester;
