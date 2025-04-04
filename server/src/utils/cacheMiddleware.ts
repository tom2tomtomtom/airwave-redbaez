import { Request, Response, NextFunction } from 'express';
import { redis } from '../db/redisClient';
import { logger } from './logger';

/**
 * Middleware for caching API responses
 * @param duration Cache duration in seconds
 * @returns Express middleware function
 */
export const cacheMiddleware = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if disabled in environment
    if (process.env.ENABLE_CACHING !== 'true') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      // Check if we have a cached response
      const cachedResponse = await redis.get(key);
      
      if (cachedResponse) {
        logger.debug(`Cache hit for ${req.originalUrl}`);
        const parsedResponse = JSON.parse(cachedResponse);
        return res.status(200).json(parsedResponse);
      }
      
      logger.debug(`Cache miss for ${req.originalUrl}`);
      
      // Store the original send function
      const originalSend = res.send;
      
      // Override the send function
      res.send = function(body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            redis.set(key, body, { EX: duration });
            logger.debug(`Cached response for ${req.originalUrl} for ${duration} seconds`);
          } catch (error) {
            logger.error(`Error caching response for ${req.originalUrl}:`, error);
          }
        }
        
        // Call the original send function
        return originalSend.call(this, body);
      };
      
      next();
    } catch (error) {
      // If Redis fails, just continue without caching
      logger.error(`Cache middleware error for ${req.originalUrl}:`, error);
      next();
    }
  };
};

/**
 * Clear cache for a specific route pattern
 * @param pattern Route pattern to clear (e.g., '/api/templates')
 */
export const clearCache = async (pattern: string): Promise<void> => {
  try {
    // In a real Redis implementation, we would use SCAN with pattern matching
    // For our mock Redis, we'll need a different approach
    // This is a simplified version that would need to be expanded for production
    
    const keys = await redis.keys(`cache:${pattern}*`);
    
    if (keys && keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Cleared ${keys.length} cache entries matching pattern: ${pattern}`);
    } else {
      logger.info(`No cache entries found matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Error clearing cache for pattern ${pattern}:`, error);
  }
};
