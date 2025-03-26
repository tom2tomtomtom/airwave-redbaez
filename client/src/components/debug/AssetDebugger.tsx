import React, { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import { useAssetOperations } from '../../hooks/useAssetOperations';

/**
 * A temporary debug component to help diagnose asset issues
 */
const AssetDebugger: React.FC = () => {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { debugAssetsTable } = useAssetOperations();

  const runDatabaseCheck = async () => {
    try {
      setLoading(true);
      const data = await debugAssetsTable();
      setDebugData(data);
      console.log('Asset table debug data:', data);
    } catch (error) {
      console.error('Error running debug:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2, my: 2, maxWidth: '100%', overflow: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Asset Database Debugger
      </Typography>
      
      <Button 
        variant="contained" 
        color="primary" 
        onClick={runDatabaseCheck}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Check Database'}
      </Button>
      
      {debugData && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6">Database Schema:</Typography>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '8px', 
            borderRadius: '4px',
            overflowX: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(debugData.schema, null, 2)}
          </pre>
          
          <Typography variant="h6" sx={{ mt: 2 }}>Sample Data:</Typography>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '8px', 
            borderRadius: '4px',
            overflowX: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(debugData.sampleData, null, 2)}
          </pre>
        </Box>
      )}
    </Paper>
  );
};

export default AssetDebugger;
