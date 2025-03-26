import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to your error reporting service
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
          p={3}
        >
          <Alert severity="error" sx={{ mb: 3, width: '100%', maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              We apologise for the inconvenience. Please try refreshing the page or contact support if the problem persists.
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Typography
                component="pre"
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  overflow: 'auto',
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </Typography>
            )}
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={this.handleRefresh}
          >
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
