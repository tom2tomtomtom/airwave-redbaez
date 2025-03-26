import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, TextField, CircularProgress, Divider } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import assetService from '../../services/assetService';
import axios from 'axios';

/**
 * Debug tool component for diagnosing asset retrieval issues
 */
const AssetDebugTool: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>('');
  
  // Get the selected client ID from Redux
  const selectedClientId = useSelector((state: RootState) => state.clients.selectedClientId);
  
  useEffect(() => {
    // Initialize with the selected client ID if available
    if (selectedClientId) {
      setClientId(selectedClientId);
    } else {
      // Try to get from localStorage as fallback
      const storedClientId = localStorage.getItem('selectedClientId');
      if (storedClientId) {
        setClientId(storedClientId);
      }
    }
  }, [selectedClientId]);

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);
      setResults(null);
      
      console.log('Running asset diagnostics for client:', clientId);
      
      // Run the asset verification
      const diagnosticResult = await assetService.verifyAssetStorage(clientId);
      
      // Also check direct connection to API endpoint
      const apiResponse = await axios.get('/api/v2/assets', {
        params: {
          clientId,
          debug: true,
          _timestamp: Date.now()
        }
      });
      
      setResults({
        diagnosticResult,
        apiResponse: apiResponse.data
      });
      
    } catch (err: any) {
      console.error('Diagnostic error:', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Asset Diagnostic Tool
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Client ID"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          helperText="Enter the client ID to test asset retrieval"
          margin="normal"
        />
      </Box>
      
      <Button
        variant="contained"
        color="primary"
        onClick={runDiagnostics}
        disabled={loading || !clientId}
      >
        {loading ? <CircularProgress size={24} /> : 'Run Diagnostics'}
      </Button>
      
      {error && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      
      {results && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Results:</Typography>
          
          <Typography variant="body2" component="pre" sx={{ 
            bgcolor: '#f5f5f5', 
            p: 2, 
            borderRadius: 1,
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(results, null, 2)}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default AssetDebugTool;
