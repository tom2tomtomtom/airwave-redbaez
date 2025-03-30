/**
 * Centralized error handling middleware
 * Provides consistent error responses across all routes
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { ErrorCode } from '../types/errorTypes';

/**
 * Not found error handler - call when route doesn't exist
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new ApiError(ErrorCode.RESOURCE_NOT_FOUND, `Not Found - ${req.originalUrl}`);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // Log the error details
  if (err instanceof ApiError) {
    // Log ApiError specifics
    logger.error(`ApiError caught: ${err.errorCode} - ${err.message}`, {
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      details: err.details,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      internalDetails: err.internalDetails // Log internal details if present
    });
  } else {
    // Log generic Error specifics
    logger.error(`Unhandled Error caught: ${err.message}`, {
      name: err.name,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  }

  // Prevent sending multiple responses
  if (res.headersSent) {
    logger.warn('Headers already sent, skipping error response generation.');
    return; 
  }

  // Use ApiResponse.error to send the standardized response
  // It handles both ApiError instances and generic Errors
  ApiResponse.error(res, err);
};
