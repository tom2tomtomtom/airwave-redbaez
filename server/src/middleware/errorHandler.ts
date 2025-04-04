import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';
import { logger } from '../utils/logger';

/**
 * Global error handler middleware
 * Standardizes error responses across the application
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error(`Error in ${req.method} ${req.path}:`, err);
  
  // If it's already an ApiError, use its properties
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(err.toResponse());
  }
  
  // For other errors, create a generic server error
  const statusCode = 500;
  const apiError = new ApiError(
    ErrorCode.INTERNAL_SERVER_ERROR,
    err.message || 'An unexpected error occurred',
    {
      path: req.path,
      method: req.method,
      originalError: process.env.NODE_ENV === 'production' ? undefined : err.stack
    }
  );
  
  return res.status(statusCode).json(apiError.toResponse());
};

/**
 * Not found handler middleware
 * Handles requests to non-existent routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiError = new ApiError(
    ErrorCode.RESOURCE_NOT_FOUND,
    `Route not found: ${req.method} ${req.path}`,
    {
      path: req.path,
      method: req.method
    }
  );
  
  return res.status(404).json(apiError.toResponse());
};
