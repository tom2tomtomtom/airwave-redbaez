/**
 * Centralized error handling middleware
 * Provides consistent error responses across all routes
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: any[]
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Not found error handler - call when route doesn't exist
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new ApiError(404, `Resource not found - ${req.originalUrl}`);
  next(error);
};

// Global error handler middleware
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get status code and message
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const message = err.message || 'Internal server error';
  
  // Log the error (with appropriate log level based on status)
  if (statusCode >= 500) {
    logger.error('Server error', { 
      statusCode, 
      message, 
      path: req.path, 
      method: req.method,
      error: err.stack
    });
  } else {
    logger.warn('Client error', { 
      statusCode, 
      message, 
      path: req.path, 
      method: req.method 
    });
  }

  // Standardized error response format
  res.status(statusCode).json({
    success: false,
    message,
    errors: 'errors' in err ? err.errors : undefined,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
};
