import { logger } from '../utils/logger';
/**
 * Response standardization middleware
 * Ensures consistent response formats across all API endpoints
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Extends Express Response with success and error utility methods
 */
declare global {
  namespace Express {
    interface Response {
      success: (data?: any, message?: string, statusCode?: number) => void;
      error: (message: string, statusCode?: number, errors?: any[]) => void;
    }
  }
}

/**
 * Middleware that adds standardized response methods to the Response object
 */
export const responseHandler = (req: Request, res: Response, next: NextFunction): void => {
  /**
   * Send a standardized success response
   * 
   * @param data - Data to include in the response
   * @param message - Success message
   * @param statusCode - HTTP status code (defaults to 200)
   */
  res.success = function(data = null, message = 'Success', statusCode = 200): void {
    this.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Send a standardized error response
   * 
   * @param message - Error message
   * @param statusCode - HTTP status code (defaults to 400)
   * @param errors - Additional error details
   */
  res.error = function(message = 'Error', statusCode = 400, errors?: any[]): void {
    this.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  };

  next();
};

/**
 * Middleware to log API requests with timing information
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Skip logging for certain paths (like health checks)
  if (req.path === '/health' || req.path === '/websocket-status') {
    return next();
  }

  const start = Date.now();
  const { method, originalUrl, ip } = req;
  
  // Log on response finish
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    const { statusCode } = res;
    
    // Format: [METHOD] /path - Status: 200 - 123ms (IP: 127.0.0.1)
    console.log(
      `[${method}] ${originalUrl} - Status: ${statusCode} - ${responseTime}ms (IP: ${ip})`
    );
  });
  
  next();
};
