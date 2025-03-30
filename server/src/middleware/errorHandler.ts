/**
 * Centralized error handling middleware
 * Provides consistent error responses across all routes
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ErrorCategory, ErrorCode, getStatusCode, getUserFriendlyMessage, isRetryableError } from '../types/errorTypes';

/**
 * Custom error class for API errors with detailed classification
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: any[];
  public readonly context?: Record<string, any>;
  public readonly isOperational: boolean;
  public readonly isRetryable: boolean;
  public readonly userMessage: string;

  constructor({
    statusCode,
    message,
    code = ErrorCode.INTERNAL_ERROR,
    errors,
    context,
    isOperational = true
  }: {
    statusCode?: number;
    message: string;
    code?: string;
    errors?: any[];
    context?: Record<string, any>;
    isOperational?: boolean;
  }) {
    super(message);
    
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode || getStatusCode(code);
    this.errors = errors;
    this.context = context;
    this.isOperational = isOperational;
    this.isRetryable = isRetryableError(code);
    this.userMessage = getUserFriendlyMessage(code);
    
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a validation error
   */
  static validation(message: string, errors?: any[], context?: Record<string, any>): ApiError {
    return new ApiError({
      message,
      code: ErrorCode.VALIDATION_FAILED,
      errors,
      context
    });
  }

  /**
   * Create a not found error
   */
  static notFound(message: string, context?: Record<string, any>): ApiError {
    return new ApiError({
      message,
      code: ErrorCode.RESOURCE_NOT_FOUND,
      context
    });
  }

  /**
   * Create an unauthorized error
   */
  static unauthorized(message: string, context?: Record<string, any>): ApiError {
    return new ApiError({
      message,
      code: ErrorCode.INVALID_CREDENTIALS,
      context
    });
  }

  /**
   * Create a forbidden error
   */
  static forbidden(message: string, context?: Record<string, any>): ApiError {
    return new ApiError({
      message,
      code: ErrorCode.INSUFFICIENT_PERMISSIONS,
      context
    });
  }

  /**
   * Create a conflict error
   */
  static conflict(message: string, context?: Record<string, any>): ApiError {
    return new ApiError({
      message,
      code: ErrorCode.RESOURCE_ALREADY_EXISTS,
      context
    });
  }

  /**
   * Create a server error
   */
  static internal(message: string, context?: Record<string, any>): ApiError {
    return new ApiError({
      message,
      code: ErrorCode.INTERNAL_ERROR,
      context,
      isOperational: false
    });
  }
}

/**
 * Not found error handler - call when route doesn't exist
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = ApiError.notFound(`Resource not found - ${req.originalUrl}`, { path: req.originalUrl });
  next(error);
};

/**
 * Global error handler middleware
 * Processes all errors through a standardized pipeline
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Transform non-ApiError instances to ApiError
  let error: ApiError;
  if (!(err instanceof ApiError)) {
    error = new ApiError({
      message: err.message || 'Internal server error',
      code: ErrorCode.INTERNAL_ERROR,
      isOperational: false
    });
  } else {
    error = err;
  }

  // Extract error details
  const statusCode = error.statusCode;
  const message = error.message;
  const errorCode = error.code;
  const userMessage = error.userMessage;
  const isRetryable = error.isRetryable;
  
  // Add request context to error for logging
  const requestContext = {
    path: req.path,
    method: req.method,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    clientId: req.headers['client-id'] || req.query.clientId || 'unknown',
    userId: req.user?.id || 'unauthenticated',
    requestId: req.headers['x-request-id'] || crypto.randomUUID()
  };
  
  // Log the error with appropriate level and context
  if (statusCode >= 500) {
    logger.error('Server error', { 
      statusCode, 
      message, 
      errorCode,
      ...requestContext,
      isRetryable,
      stack: err.stack,
      context: error.context
    });
    
    // Optional: Send critical errors to external monitoring service
    // errorMonitoring.captureException(error);
  } else {
    logger.warn('Client error', { 
      statusCode, 
      message, 
      errorCode,
      ...requestContext,
      isRetryable
    });
  }

  // Standardized error response format
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? userMessage : message,
    code: errorCode,
    errors: error.errors,
    retryable: isRetryable,
    requestId: requestContext.requestId,
    // Only include stack traces in development
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};
