import React from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Alert, 
  Paper, 
  Link,
  CircularProgress
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  WifiOff as WifiOffIcon,
  Error as ErrorIcon,
  VpnKey as VpnKeyIcon,
  Lock as LockIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import { AppError } from '../../utils/errorHandling';
import { ErrorCategory } from '../../utils/errorTypes';

interface ErrorFallbackProps {
  error: Error | AppError;
  resetErrorBoundary?: () => void;
}

// Base fallback component with common functionality
const BaseFallback: React.FC<ErrorFallbackProps & { 
  title: string; 
  message: string;
  icon: React.ReactNode;
  showRefresh?: boolean;
  showDetails?: boolean;
  extraActions?: React.ReactNode;
}> = ({ 
  error, 
  title, 
  message, 
  icon, 
  resetErrorBoundary, 
  showRefresh = true,
  showDetails = false,
  extraActions
}) => {
  const handleRefresh = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  const isAppError = error instanceof AppError;
  const errorDetails = isAppError 
    ? `${error.userMessage || error.message} (Code: ${error.code})`
    : error.message;

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="400px"
      p={3}
    >
      <Paper 
        elevation={3}
        sx={{ 
          p: 4, 
          maxWidth: 600, 
          width: '100%', 
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Box mb={2} display="flex" justifyContent="center">
          {icon}
        </Box>
        
        <Typography variant="h5" gutterBottom align="center">
          {title}
        </Typography>
        
        <Typography variant="body1" align="center" sx={{ mb: 3 }}>
          {message}
        </Typography>
        
        {showDetails && (process.env.NODE_ENV === 'development' || isAppError) && (
          <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
            <Typography variant="body2">
              {errorDetails}
            </Typography>
            {process.env.NODE_ENV === 'development' && !isAppError && (
              <Typography
                component="pre"
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  maxHeight: '200px'
                }}
              >
                {error.stack}
              </Typography>
            )}
          </Alert>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          {showRefresh && (
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Try Again
            </Button>
          )}
          {extraActions}
        </Box>
      </Paper>
    </Box>
  );
};

// Network Error Fallback
export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <BaseFallback
    {...props}
    title="Network Error"
    message="We're having trouble connecting to our servers. Please check your internet connection and try again."
    icon={<WifiOffIcon sx={{ fontSize: 60, color: 'error.main' }} />}
    showDetails
    extraActions={
      <Button
        variant="outlined"
        onClick={() => window.location.reload()}
      >
        Refresh Page
      </Button>
    }
  />
);

// Authentication Error Fallback
export const AuthErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <BaseFallback
    {...props}
    title="Authentication Error"
    message="Your session has expired or you're not authenticated. Please sign in again."
    icon={<VpnKeyIcon sx={{ fontSize: 60, color: 'warning.main' }} />}
    showRefresh={false}
    showDetails={false}
    extraActions={
      <Button
        variant="contained"
        onClick={() => window.location.href = '/login'}
      >
        Sign In
      </Button>
    }
  />
);

// Authorization Error Fallback
export const AuthorizationErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <BaseFallback
    {...props}
    title="Access Denied"
    message="You don't have permission to access this resource. If you believe this is an error, please contact your administrator."
    icon={<LockIcon sx={{ fontSize: 60, color: 'error.main' }} />}
    showRefresh={false}
    showDetails={process.env.NODE_ENV === 'development'}
    extraActions={
      <Button
        variant="outlined"
        onClick={() => window.history.back()}
      >
        Go Back
      </Button>
    }
  />
);

// Server Error Fallback
export const ServerErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <BaseFallback
    {...props}
    title="Server Error"
    message="We're experiencing some technical difficulties. Our team has been notified and is working to fix the issue."
    icon={<ErrorIcon sx={{ fontSize: 60, color: 'error.main' }} />}
    showDetails
  />
);

// Application Error Fallback
export const ApplicationErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
  <BaseFallback
    {...props}
    title="Application Error"
    message="Something went wrong in the application. Please try again or contact support if the problem persists."
    icon={<BugReportIcon sx={{ fontSize: 60, color: 'error.main' }} />}
    showDetails
    extraActions={
      <Button
        variant="outlined"
        onClick={() => window.location.href = '/'}
      >
        Go to Home
      </Button>
    }
  />
);

// Retry Loading Fallback - when a request is being retried
export const RetryLoadingFallback: React.FC<ErrorFallbackProps & { retryCount: number, maxRetries: number }> = 
  ({ error, retryCount, maxRetries }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    p={3}
    minHeight="200px"
  >
    <CircularProgress size={40} sx={{ mb: 2 }} />
    <Typography variant="body1" sx={{ mb: 1 }}>
      Connection issue detected. Retrying...
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Attempt {retryCount} of {maxRetries}
    </Typography>
  </Box>
);

// Selects appropriate fallback based on error category
export const getErrorFallback = (error: Error | AppError, resetErrorBoundary?: () => void) => {
  // Handle non-AppError instances
  if (!(error instanceof AppError)) {
    return <ApplicationErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />;
  }
  
  // Select fallback based on error category
  switch (error.category) {
    case ErrorCategory.NETWORK:
      return <NetworkErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />;
    case ErrorCategory.AUTHENTICATION:
      return <AuthErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />;
    case ErrorCategory.AUTHORIZATION:
      return <AuthorizationErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />;
    case ErrorCategory.SERVER:
      return <ServerErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />;
    case ErrorCategory.CLIENT:
    case ErrorCategory.VALIDATION:
    case ErrorCategory.CONFLICT:
    case ErrorCategory.NOT_FOUND:
    default:
      return <ApplicationErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />;
  }
};
