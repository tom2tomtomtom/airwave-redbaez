import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingScreenProps {
  message?: string;
}

/**
 * A full-screen loading indicator with an optional message
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: 'background.default',
        zIndex: 9999,
      }}
    >
      <CircularProgress size={60} thickness={4} />
      
      <Typography
        variant="h6"
        sx={{ mt: 4, fontWeight: 500 }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingScreen;