import { PostgrestError } from '@supabase/supabase-js';
import { ErrorCategory, ErrorCode, ErrorMessages, statusCodeToErrorCategory, isTransientError } from './errorTypes';

interface ErrorDetails {
  message: string;
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  isOperational?: boolean;
  isRetryable?: boolean;
  retry?: {
    count: number;
    maxRetries: number;
    delay: number;
  };
}

export class AppError extends Error {
  public code: string;
  public statusCode?: number;
  public context?: Record<string, any>;
  public isOperational: boolean;
  public isRetryable: boolean;
  public retry?: {
    count: number;
    maxRetries: number;
    delay: number;
  };
  public category: ErrorCategory;
  public userMessage: string;

  constructor({
    message,
    code = ErrorCode.UNKNOWN_ERROR,
    statusCode,
    context,
    isOperational = true,
    isRetryable,
    retry,
  }: ErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = isOperational;
    this.isRetryable = isRetryable ?? isTransientError({ code, status: statusCode, message });
    this.retry = retry || (this.isRetryable ? { count: 0, maxRetries: 3, delay: 1000 } : undefined);
    
    // Determine error category from code prefix or status code
    this.category = this.determineCategory();
    
    // Get user-friendly message
    this.userMessage = ErrorMessages[code] || message;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
  
  private determineCategory(): ErrorCategory {
    // First try to determine from error code
    if (this.code) {
      const codePrefix = this.code.split('_')[0];
      const matchingCategory = Object.values(ErrorCategory).find(cat => codePrefix === cat);
      if (matchingCategory) return matchingCategory as ErrorCategory;
    }
    
    // Fall back to status code if available
    if (this.statusCode) {
      return statusCodeToErrorCategory(this.statusCode);
    }
    
    return ErrorCategory.UNKNOWN;
  }
  
  public shouldRetry(): boolean {
    if (!this.isRetryable || !this.retry) return false;
    return this.retry.count < this.retry.maxRetries;
  }
  
  public incrementRetryCount(): void {
    if (this.retry) {
      this.retry.count += 1;
    }
  }
  
  public getRetryDelay(): number {
    if (!this.retry) return 0;
    // Implement exponential backoff
    return this.retry.delay * Math.pow(2, this.retry.count - 1);
  }
}

export const handleSupabaseError = (error: PostgrestError): AppError => {
  // Map Supabase error codes to user-friendly messages
  const errorMap: Record<string, string> = {
    '23505': 'A record with this information already exists.',
    '23503': 'This operation cannot be completed due to related records.',
    '42501': 'You do not have permission to perform this action.',
    '23514': 'The provided data does not meet the required conditions.',
    'PGRST301': 'The resource you are trying to access does not exist.',
  };

  const message = errorMap[error.code] || error.message;
  return new AppError({
    message,
    code: error.code,
    context: {
      details: error.details,
      hint: error.hint,
    },
  });
};

export const handleAssetError = (error: any): AppError => {
  if (error instanceof AppError) return error;

  // Handle specific asset-related errors
  if (error.message?.includes('file size')) {
    return new AppError({
      message: 'The file size exceeds the maximum limit of 100MB.',
      code: 'ASSET_SIZE_ERROR',
      context: { maxSize: '100MB' },
    });
  }

  if (error.message?.includes('file type')) {
    return new AppError({
      message: 'This file type is not supported. Please use MP4, MOV, JPEG, PNG, GIF, or PDF.',
      code: 'ASSET_TYPE_ERROR',
      context: { 
        supportedTypes: ['MP4', 'MOV', 'JPEG', 'PNG', 'GIF', 'PDF'] 
      },
    });
  }

  return new AppError({
    message: 'An error occurred while processing the asset.',
    code: 'ASSET_ERROR',
    context: { originalError: error },
  });
};

export const handleAuthError = (error: any): AppError => {
  if (error instanceof AppError) return error;

  const authErrorMap: Record<string, string> = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-action-code': 'This link has expired or is invalid.',
  };

  return new AppError({
    message: authErrorMap[error.code] || 'An authentication error occurred.',
    code: error.code || 'AUTH_ERROR',
    context: { originalError: error },
  });
};

export const handleApiError = (error: any): AppError => {
  if (error instanceof AppError) return error;

  // Handle network errors
  if (error.name === 'NetworkError' || !navigator.onLine) {
    return new AppError({
      message: 'Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
    });
  }

  // Handle timeout errors
  if (error.name === 'TimeoutError') {
    return new AppError({
      message: 'The request timed out. Please try again.',
      code: 'TIMEOUT_ERROR',
    });
  }

  return new AppError({
    message: 'An unexpected error occurred. Please try again.',
    code: 'API_ERROR',
    context: { originalError: error },
  });
};

// Error logging service
export const errorLogger = {
  log: (error: Error | AppError, context?: Record<string, any>) => {
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', error);
      if (context) console.error('Context:', context);
      return;
    }

    // In production, send to error reporting service
    // TODO: Replace with your preferred error reporting service
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: {
        ...(error instanceof AppError ? error.context : {}),
        ...context,
      },
      environment: process.env.NODE_ENV,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Example: Send to error reporting service
    // await fetch('/api/log-error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData),
    // });
  },
};
