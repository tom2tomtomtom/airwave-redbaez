import React, { useState, useEffect } from 'react';
import { 
  Snackbar, 
  Alert, 
  AlertTitle, 
  Button, 
  Slide,
  SlideProps 
} from '@mui/material';
import { AppError } from '../../utils/errorHandling';
import { ErrorCategory } from '../../utils/errorTypes';

interface ErrorNotificationProps {
  error: AppError | null;
  onClose: () => void;
  onRetry?: () => void;
  autoHideDuration?: number;
}

// Custom transition for the Snackbar
function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onClose,
  onRetry,
  autoHideDuration = 6000
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (error) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [error]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
    onClose();
  };

  if (!error) return null;

  // Determine alert severity based on error category
  const getSeverity = () => {
    switch (error.category) {
      case ErrorCategory.VALIDATION:
        return 'warning';
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return 'warning';
      case ErrorCategory.SERVER:
      case ErrorCategory.NETWORK:
        return 'error';
      case ErrorCategory.NOT_FOUND:
        return 'info';
      default:
        return 'error';
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={getSeverity()}
        variant="filled"
        onClose={handleClose}
        action={
          error.isRetryable && onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          ) : null
        }
        sx={{ width: '100%', maxWidth: 500 }}
      >
        <AlertTitle>
          {error.category === ErrorCategory.VALIDATION ? 'Please Check Your Input' :
           error.category === ErrorCategory.NETWORK ? 'Connection Issue' : 
           error.category === ErrorCategory.AUTHENTICATION ? 'Authentication Required' :
           error.category === ErrorCategory.AUTHORIZATION ? 'Access Denied' :
           error.category === ErrorCategory.SERVER ? 'Server Error' :
           error.category === ErrorCategory.NOT_FOUND ? 'Not Found' :
           'Error'}
        </AlertTitle>
        {error.userMessage || error.message}
      </Alert>
    </Snackbar>
  );
};

// Context and Provider for global error notifications
import { createContext, useContext } from 'react';

interface ErrorNotificationContextValue {
  showError: (error: Error | AppError | string) => void;
  clearError: () => void;
  error: AppError | null;
}

const ErrorNotificationContext = createContext<ErrorNotificationContextValue | undefined>(undefined);

export const useErrorNotification = () => {
  const context = useContext(ErrorNotificationContext);
  if (!context) {
    throw new Error('useErrorNotification must be used within an ErrorNotificationProvider');
  }
  return context;
};

interface ErrorNotificationProviderProps {
  children: React.ReactNode;
}

export const ErrorNotificationProvider: React.FC<ErrorNotificationProviderProps> = ({ children }) => {
  const [error, setError] = useState<AppError | null>(null);

  const showError = (err: Error | AppError | string) => {
    // Convert to AppError if not already
    if (typeof err === 'string') {
      setError(new AppError({ message: err }));
    } else if (err instanceof AppError) {
      setError(err);
    } else {
      setError(new AppError({ message: err.message }));
    }
  };

  const clearError = () => setError(null);

  const handleRetry = () => {
    if (error?.shouldRetry()) {
      // Clear error and let component handle retry logic
      clearError();
    }
  };

  return (
    <ErrorNotificationContext.Provider value={{ showError, clearError, error }}>
      {children}
      <ErrorNotification
        error={error}
        onClose={clearError}
        onRetry={handleRetry}
      />
    </ErrorNotificationContext.Provider>
  );
};
