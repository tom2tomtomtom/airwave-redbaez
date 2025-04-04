import { redis } from '../db/redisClient';
import { logger } from '../utils/logger';

// Cache middleware for API responses
export const cacheMiddleware = (
  keyPrefix: string,
  expireTimeSeconds: number = 300 // Default 5 minutes
) => {
  return async (req: any, res: any, next: any) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create a unique cache key based on the route and query parameters
    const cacheKey = `${keyPrefix}:${req.originalUrl}`;
    
    try {
      // Check if we have a cached response
      const cachedResponse = await redis.get(cacheKey);
      
      if (cachedResponse) {
        logger.debug(`Cache hit for ${cacheKey}`);
        
        // Parse the cached response
        const parsedResponse = JSON.parse(cachedResponse);
        
        // Return the cached response
        return res.status(200).json({
          ...parsedResponse,
          _cached: true,
          _cachedAt: new Date().toISOString()
        });
      }
      
      // No cache hit, continue to the route handler
      logger.debug(`Cache miss for ${cacheKey}`);
      
      // Store the original json method
      const originalJson = res.json;
      
      // Override the json method to cache the response before sending
      res.json = function($1: unknown) {
        // Don't cache error responses
        if (res.statusCode >= 400) {
          return originalJson.call(this, body);
        }
        
        // Cache the response
        redis.set(cacheKey, JSON.stringify(body), {
          EX: expireTimeSeconds
        }).catch(err => {
          logger.error(`Error caching response for ${cacheKey}:`, err);
        });
        
        // Call the original json method
        return originalJson.call(this, body);
      };
      
      next();
    } catch (error) {
      logger.error(`Cache middleware error for ${cacheKey}:`, error);
      // Continue without caching in case of error
      next();
    }
  };
};

// Function to invalidate cache entries by pattern
export const invalidateCache = async (pattern: string): Promise<number> => {
  try {
    // Find all keys matching the pattern
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }
    
    // Delete all matching keys
    const result = await redis.del(keys);
    logger.info(`Invalidated ${result} cache entries matching pattern: ${pattern}`);
    
    return result;
  } catch (error) {
    logger.error(`Error invalidating cache for pattern ${pattern}:`, error);
    return 0;
  }
};

// Set a maximum size for the cache to prevent memory issues
export const setupCacheLimits = async (maxMemoryMB: number = 100): Promise<void> => {
  try {
    // Configure Redis to limit memory usage
    // This requires Redis server configuration, but we can monitor and manage it from the application
    
    // Get current memory usage
    const info = await redis.info('memory');
    logger.info(`Redis memory info: ${info}`);
    
    // Set up periodic cache cleanup
    setInterval(async () => {
      try {
        // Get current memory usage
        const info = await redis.info('memory');
        const memoryUsage = parseRedisMemoryInfo(info);
        
        if (memoryUsage > maxMemoryMB * 1024 * 1024) {
          logger.warn(`Redis memory usage (${memoryUsage} bytes) exceeds limit (${maxMemoryMB}MB), clearing oldest cache entries`);
          
          // Clear a percentage of the oldest keys
          // This is a simplified approach - in production, you would use Redis's built-in eviction policies
          const keys = await redis.keys('*');
          
          if (keys.length > 0) {
            // Sort keys by TTL (Time To Live)
            const keysWithTTL = await Promise.all(
              keys.map(async (key) => {
                const ttl = await redis.ttl(key);
                return { key, ttl };
              })
            );
            
            // Sort by TTL (ascending)
            keysWithTTL.sort((a, b) => a.ttl - b.ttl);
            
            // Delete the oldest 20% of keys
            const keysToDelete = keysWithTTL.slice(0, Math.ceil(keys.length * 0.2)).map(k => k.key);
            
            if (keysToDelete.length > 0) {
              const deleted = await redis.del(keysToDelete);
              logger.info(`Cleared ${deleted} oldest cache entries to free memory`);
            }
          }
        }
      } catch (error) {
        logger.error('Error in cache memory management:', error);
      }
    }, 60000); // Check every minute
    
    logger.info(`Cache memory limits set to ${maxMemoryMB}MB`);
  } catch (error) {
    logger.error('Error setting up cache limits:', error);
  }
};

// Helper function to parse Redis memory info
function parseRedisMemoryInfo(info: string): number {
  try {
    const match = info.match(/used_memory:(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return 0;
  } catch (error) {
    logger.error('Error parsing Redis memory info:', error);
    return 0;
  }
}
