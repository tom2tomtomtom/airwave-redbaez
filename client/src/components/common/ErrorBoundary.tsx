import React, { Component, ErrorInfo, ReactNode } from 'react';
import { monitoring } from '../../services/monitoring';
import { AppError } from '../../utils/errorHandling';
import { ErrorCode } from '../../utils/errorTypes';
import { getErrorFallback } from './ErrorFallbacks';

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

    // Transform standard error to AppError if needed
    const appError = error instanceof AppError
      ? error
      : new AppError({
          message: error.message || 'An unexpected error occurred',
          code: ErrorCode.RENDER_ERROR,
          isOperational: false,
          context: {
            componentStack: errorInfo.componentStack,
            name: error.name,
            stack: error.stack
          }
        });

    // Log error using our monitoring service
    monitoring.logError(appError, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      context: { componentStack: errorInfo.componentStack }
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Use our error fallback system to display appropriate UI
      if (this.state.error) {
        return getErrorFallback(this.state.error, this.handleReset);
      }
    }

    return this.props.children;
  }
}
