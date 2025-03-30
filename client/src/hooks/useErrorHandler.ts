import { useState, useCallback } from 'react';
import { AppError } from '../utils/errorHandling';
import { ErrorCode, ErrorCategory } from '../utils/errorTypes';
import { monitoring } from '../services/monitoring';

interface ErrorState {
  error: AppError | null;
  isLoading: boolean;
  retry: () => void;
}

interface ErrorHandlerOptions {
  context?: Record<string, unknown>;
  component?: string;
  action?: string;
  showNotification?: boolean;
  onError?: (error: AppError) => void;
}

/**
 * Custom hook for handling errors in React components
 * Provides a standardized way to handle errors, with retry functionality
 */
export const useErrorHandler = (options: ErrorHandlerOptions = {}): ErrorState & {
  handleError: (error: unknown) => void;
  clearError: () => void;
} => {
  const [state, setState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    retry: () => {},
  });

  // Convert any error to AppError and handle it
  const handleError = useCallback((error: unknown) => {
    // Convert to AppError if not already
    const appError = error instanceof AppError 
      ? error 
      : new AppError({
          message: error instanceof Error ? error.message : String(error),
          code: ErrorCode.RUNTIME_ERROR,
          context: { originalError: error }
        });

    // Log error to monitoring service
    monitoring.logError(appError, {
      component: options.component || 'unknown',
      action: options.action || 'unknown',
      context: options.context,
    });

    // Call onError if provided
    if (options.onError) {
      options.onError(appError);
    }

    // Create retry function
    const retry = () => {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Increment retry count
      appError.incrementRetryCount();
      
      // Reset error state after a short delay to show loading state
      setTimeout(() => {
        setState({
          error: null,
          isLoading: false,
          retry: () => {},
        });
      }, 500);
    };

    // Update state
    setState({
      error: appError,
      isLoading: false,
      retry,
    });
  }, [options]);

  // Clear error state
  const clearError = useCallback(() => {
    setState({
      error: null,
      isLoading: false,
      retry: () => {},
    });
  }, []);

  return {
    ...state,
    handleError,
    clearError,
  };
};

/**
 * Wraps an async function with error handling
 * @param asyncFn The async function to wrap
 * @param options Error handling options
 * @returns A tuple with the wrapped function and error handling state
 */
export const useAsyncErrorHandler = <T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  options: ErrorHandlerOptions = {}
): [(...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined>, ErrorState & { clearError: () => void }] => {
  const { handleError, clearError, ...errorState } = useErrorHandler(options);
  const [isLoading, setIsLoading] = useState(false);

  const wrappedFn = useCallback(async (...args: Parameters<T>) => {
    try {
      setIsLoading(true);
      clearError();
      return await asyncFn(...args);
    } catch (error) {
      handleError(error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn, handleError, clearError]);

  return [wrappedFn, { ...errorState, isLoading, clearError }];
};
