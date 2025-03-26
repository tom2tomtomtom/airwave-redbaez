import React from 'react';
import { Box, Typography, Divider, Paper } from '@mui/material';
import KnownAssetsDisplay from './KnownAssetsDisplay';
import AssetDatabaseTester from './AssetDatabaseTester';

/**
 * Asset Debug Helper - combines all debug tools into one component
 * 
 * Simply add this component to the AssetsPage.tsx file:
 * 
 * 1. Add the import:
 *    import AssetDebugHelper from '../../components/debug/AssetDebugHelper';
 * 
 * 2. Add the component to the JSX:
 *    <AssetDebugHelper />
 */
const AssetDebugHelper: React.FC = () => {
  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ color: '#e91e63' }}>
        Asset Management Debug Tools
      </Typography>
      
      <Typography variant="body2" paragraph>
        These tools can help diagnose why assets aren't appearing in the UI. The client ID
        from your database (fe418478-806e-411a-ad0b-1b9a537a8081) has been pre-configured.
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Quick Fix Actions
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <button 
            onClick={() => {
              const clientId = 'fe418478-806e-411a-ad0b-1b9a537a8081';
              localStorage.setItem('selectedClientId', clientId);
              localStorage.setItem('workingClientId', clientId);
              alert(`Set client ID (${clientId}) in localStorage. Try refreshing the page.`);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Set Correct Client ID in localStorage
          </button>
          
          <button
            onClick={() => {
              window.location.reload();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </Box>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <KnownAssetsDisplay />
      
      <Divider sx={{ my: 3 }} />
      
      <AssetDatabaseTester />
    </Paper>
  );
};

export default AssetDebugHelper;
