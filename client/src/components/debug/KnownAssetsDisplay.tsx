import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress, 
  Card, 
  CardContent, 
  CardMedia,
  CardActions,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import axios from 'axios';

// Known asset details from SQL
const KNOWN_ASSETS = [
  {
    id: '3feaa091-bd0b-4501-8c67-a5f96c767e1a',
    name: 'Juniper Brainfog Colour@2x',
    type: 'image',
    url: '/uploads/asset-Juniper-Brainfog-Colour-2x-3feaa091-bd0b-4501-8c67-a5f96c767e1a.png',
    thumbnail_url: '/uploads/thumb-3feaa091-bd0b-4501-8c67-a5f96c767e1a.png'
  },
  {
    id: '919ab7fc-71fc-4a76-9662-c1349bd7023c',
    name: 'Admin Test Asset',
    type: 'document',
    url: '/uploads/clients/fe418478-806e-411a-ad0b-1b9a537a8081/assets/document/919ab7fc-71fc-4a76-9662-c1349bd7023c/original.txt'
  }
];

// The client ID both assets belong to
const CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

// Component to display known assets from the database
const KnownAssetsDisplay: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [directResults, setDirectResults] = useState<Record<string, any>>({});

  // Function to fetch all assets using the known client ID
  const fetchAllAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching all assets for client ID:', CLIENT_ID);
      
      const response = await axios.get('/api/v2/assets', {
        params: {
          clientId: CLIENT_ID,
          debug: true,
          _timestamp: Date.now()
        }
      });
      
      console.log('Response:', response.data);
      
      // Handle various response formats
      let assetArray: any[] = [];
      
      if (response.data.assets && Array.isArray(response.data.assets)) {
        assetArray = response.data.assets;
      } else if (Array.isArray(response.data)) {
        assetArray = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        assetArray = response.data.data;
      } else if (response.data.data?.assets && Array.isArray(response.data.data.assets)) {
        assetArray = response.data.data.assets;
      }
      
      setAssets(assetArray);
      
      // Save working client ID to localStorage
      localStorage.setItem('selectedClientId', CLIENT_ID);
      localStorage.setItem('workingClientId', CLIENT_ID);
      
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  // Function to try direct retrieval of specific assets
  const tryDirectRetrieval = async () => {
    try {
      setLoading(true);
      const results: Record<string, any> = {};
      
      // Try each asset directly
      for (const asset of KNOWN_ASSETS) {
        try {
          const response = await axios.get(`/api/v2/assets/${asset.id}`, {
            params: {
              clientId: CLIENT_ID,
              debug: true,
              _timestamp: Date.now()
            }
          });
          
          results[asset.id] = {
            success: true,
            data: response.data,
            name: asset.name
          };
          
        } catch (err: any) {
          results[asset.id] = {
            success: false,
            error: err.message,
            name: asset.name
          };
        }
      }
      
      setDirectResults(results);
      
    } catch (err: any) {
      setError(err.message || 'Failed direct asset retrieval');
    } finally {
      setLoading(false);
    }
  };

  // Render asset card based on asset type
  const renderAssetCard = (asset: any) => {
    const isImage = asset.type === 'image';
    
    return (
      <Card sx={{ maxWidth: 345, m: 2 }}>
        {isImage && asset.thumbnail_url && (
          <CardMedia
            component="img"
            height="140"
            image={asset.thumbnail_url}
            alt={asset.name}
            sx={{ objectFit: 'contain', bgcolor: '#f5f5f5' }}
          />
        )}
        
        <CardContent>
          <Typography variant="h6" gutterBottom noWrap>
            {asset.name}
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            <Chip size="small" label={asset.type} color="primary" />
            {asset.meta?.tags?.map((tag: string) => (
              <Chip key={tag} size="small" label={tag} variant="outlined" />
            ))}
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            ID: {asset.id}
          </Typography>
        </CardContent>
        
        <CardActions>
          <Button 
            size="small" 
            href={asset.url} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            View
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Known Database Assets
      </Typography>
      
      <Typography variant="body2" paragraph>
        This tool specifically displays assets from SQL insert statement using client ID: <code>{CLIENT_ID}</code>
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={fetchAllAssets}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Fetch All Assets for Client'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={tryDirectRetrieval}
          disabled={loading}
        >
          Try Direct Asset Retrieval
        </Button>
      </Box>
      
      {error && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      
      {assets.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            Found {assets.length} Assets
          </Typography>
          
          <Grid container>
            {assets.map(asset => (
              <Grid item key={asset.id} xs={12} sm={6} md={4}>
                {renderAssetCard(asset)}
              </Grid>
            ))}
          </Grid>
        </>
      )}
      
      {Object.keys(directResults).length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            Direct Asset Retrieval Results
          </Typography>
          
          <Grid container spacing={2}>
            {Object.entries(directResults).map(([assetId, result]) => (
              <Grid item key={assetId} xs={12}>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="subtitle1">
                    {result.name} ({assetId})
                  </Typography>
                  
                  <Chip 
                    size="small"
                    color={result.success ? "success" : "error"}
                    label={result.success ? "Successfully Retrieved" : "Failed"}
                    sx={{ maxWidth: 'fit-content' }}
                  />
                  
                  {result.success ? (
                    <Box sx={{ 
                      bgcolor: '#f5f5f5', 
                      p: 2, 
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      <pre>{JSON.stringify(result.data, null, 2)}</pre>
                    </Box>
                  ) : (
                    <Typography color="error">{result.error}</Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Paper>
  );
};

export default KnownAssetsDisplay;
