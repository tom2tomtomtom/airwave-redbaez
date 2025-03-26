import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  useTheme,
  Skeleton,
} from '@mui/material';

interface LoadingStateProps {
  variant?: 'circular' | 'skeleton';
  message?: string;
  height?: number | string;
  width?: number | string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'circular',
  message = 'Loading...',
  height = 400,
  width = '100%',
}) => {
  const theme = useTheme();

  if (variant === 'skeleton') {
    return (
      <Box sx={{ width, height }}>
        <Skeleton
          variant="rectangular"
          width={width}
          height={height}
          animation="wave"
        />
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        width,
        height,
        bgcolor: 'background.paper',
        borderRadius: 1,
      }}
    >
      <CircularProgress size={40} thickness={4} />
      <Typography
        variant="body2"
        color="textSecondary"
        sx={{ mt: 2 }}
      >
        {message}
      </Typography>
    </Box>
  );
};
