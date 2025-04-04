import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Interface for API timeout options
interface TimeoutOptions {
  timeout: number;        // Timeout in milliseconds
  message?: string;       // Custom timeout message
  errorCode?: string;     // Custom error code
}

/**
 * Middleware to add timeout handling to API requests
 * Prevents long-running requests from blocking the event loop
 * 
 * @param options Timeout configuration options
 * @returns Express middleware function
 */
export const timeoutMiddleware = (options: TimeoutOptions) => {
  const { 
    timeout = 30000,      // Default 30 seconds
    message = 'Request timeout exceeded',
    errorCode = 'REQUEST_TIMEOUT'
  } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for long-polling endpoints or streaming responses
    if (req.path.includes('/stream') || req.path.includes('/events')) {
      return next();
    }
    
    // Set a timeout for the request
    const timeoutId = setTimeout(() => {
      logger.warn(`Request timeout (${timeout}ms) exceeded for ${req.method} ${req.originalUrl}`);
      
      // Only send response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: {
            code: errorCode,
            message
          }
        });
      }
    }, timeout);
    
    // Clear the timeout when the response is sent
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });
    
    // Clear the timeout if there's an error
    res.on('error', () => {
      clearTimeout(timeoutId);
    });
    
    next();
  };
};

/**
 * Utility function to add timeout to async functions
 * Useful for external API calls
 * 
 * @param promise The promise to add timeout to
 * @param ms Timeout in milliseconds
 * @param errorMessage Custom error message
 * @returns Promise with timeout
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number = 10000,
  errorMessage: string = 'Operation timed out'
): Promise<T> => {
  // Create a timeout promise that rejects after the specified time
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(new Error(errorMessage));
    }, ms);
  });
  
  // Race the original promise against the timeout
  return Promise.race([promise, timeoutPromise]);
};

/**
 * Utility function to retry failed operations with exponential backoff
 * 
 * @param operation Function that returns a promise
 * @param retries Maximum number of retries
 * @param delay Initial delay in milliseconds
 * @param backoffFactor Factor to increase delay by on each retry
 * @returns Promise that resolves with the operation result or rejects after all retries fail
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
  backoffFactor: number = 2
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retries) {
        const waitTime = delay * Math.pow(backoffFactor, attempt);
        logger.warn(`Operation failed, retrying in ${waitTime}ms (attempt ${attempt + 1}/${retries})`, error);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
};
