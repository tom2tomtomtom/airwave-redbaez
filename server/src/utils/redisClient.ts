/**
 * Redis client for caching and performance optimization
 * Provides a singleton Redis client with connection management
 */
import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType | null = null;
  private isConnected = false;
  private connectionPromise: Promise<RedisClientType> | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Get the Redis client, connecting if not already connected
   */
  public async getClient(): Promise<RedisClientType> {
    // If we already have a connection promise, return it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If we already have a connected client, return it
    if (this.client && this.isConnected) {
      return this.client;
    }

    // Otherwise, initialize the connection
    const isDevelopment = process.env.NODE_ENV !== 'production';
    try {
      this.connectionPromise = this.initializeClient();
      const client = await this.connectionPromise;
      return client;
    } catch (error) {
      if (isDevelopment) {
        logger.warn('Using mock Redis client for development as Redis connection failed');
        this.isConnected = true;
        return this.createMockClient();
      } else {
        logger.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  /**
   * Initialize the Redis client and connect
   */
  private async initializeClient(): Promise<RedisClientType> {
    // Check if Redis is enabled or if we're in development mode
    const redisEnabled = process.env.REDIS_ENABLED === 'true';
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // If Redis is explicitly disabled or we're in development, use a mock client
    if (!redisEnabled) {
      logger.warn('Redis is disabled by configuration. Using mock Redis client.');
      this.client = this.createMockClient();
      this.isConnected = true;
      return this.client;
    }

    // Get Redis connection details from environment
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    logger.info(`Connecting to Redis at ${redisUrl.replace(/\/\/[^@]*@/, '//***@')}`);
    
    // Create the Redis client
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          // Exponential backoff with jitter
          const delay = Math.min(Math.pow(2, retries) * 100, 30000);
          const jitter = Math.random() * 100;
          return delay + jitter;
        }
      }
    });

    // Set up event handlers
    this.client.on('error', (err) => {
      logger.error('Redis error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.info('Redis connection closed');
      this.isConnected = false;
      this.connectionPromise = null;
    });

    // Connect to Redis with timeout
    try {
      // Create a timeout promise that rejects after 5 seconds
      const connectWithTimeout = Promise.race([
        this.client.connect(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
        })
      ]);
      
      await connectWithTimeout;
      this.isConnected = true;
      logger.info('Successfully connected to Redis');
      return this.client;
    } catch (error) {
      // In development mode, fallback to mock client if connection fails
      if (isDevelopment) {
        logger.warn(`Redis connection failed in development mode, using mock client: ${error instanceof Error ? error.message : String(error)}`);
        // Clean up any partial connection
        try {
          if (this.client) await this.client.quit().catch(() => {});
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        
        // Create and return mock client
        this.client = this.createMockClient();
        this.isConnected = true;
        // Need to cast here to ensure type compatibility
        this.connectionPromise = Promise.resolve(this.client as RedisClientType);
        return this.client;
      }
      
      // In production, we should still throw the error
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Create a mock Redis client for use when Redis is disabled
   * This maintains the same interface but stores data in memory
   */
  /**
   * Create a mock Redis client for use when Redis is disabled or unavailable
   * This maintains the same interface but stores data in memory
   * @returns A mock Redis client that implements the basic Redis functions
   */
  private createMockClient(): RedisClientType {
    // Using any here because we're creating a minimal mock that doesn't implement the entire interface
    // but will be cast to RedisClientType
    const cache = new Map<string, { value: string, expireAt?: number }>();
    
    // Basic interval to check for expired items
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of cache.entries()) {
        if (data.expireAt && data.expireAt < now) {
          cache.delete(key);
        }
      }
    }, 60000);

    // Create a partial implementation and cast to the required type
    const mockClient = {
      isReady: true,
      
      // Basic operations
      set: async (key: string, value: string, options?: { EX?: number }) => {
        const expireAt = options?.EX ? Date.now() + (options.EX * 1000) : undefined;
        cache.set(key, { value, expireAt });
        return 'OK';
      },
      
      get: async (key: string) => {
        const data = cache.get(key);
        if (!data) return null;
        if (data.expireAt && data.expireAt < Date.now()) {
          cache.delete(key);
          return null;
        }
        return data.value;
      },
      
      del: async (key: string) => {
        return cache.delete(key) ? 1 : 0;
      },
      
      exists: async (key: string) => {
        const data = cache.get(key);
        if (!data) return 0;
        if (data.expireAt && data.expireAt < Date.now()) {
          cache.delete(key);
          return 0;
        }
        return 1;
      },
      
      flushAll: async () => {
        cache.clear();
        return 'OK';
      },

      // Add other Redis operations as needed for compatibility
      connect: async () => {
        logger.debug('Mock Redis client: connect called');
        return true;
      },
      quit: async () => {
        logger.debug('Mock Redis client: quit called');
        return true;
      },
      // SCAN operation for pattern matching (simplified implementation)
      scan: async (cursor: number, options: { MATCH?: string, COUNT?: number }) => {
        const pattern = options.MATCH ? new RegExp(options.MATCH.replace('*', '.*')) : null;
        const limit = options.COUNT || 10;
        const keys: string[] = [];
        
        let i = 0;
        for (const key of cache.keys()) {
          if (!pattern || pattern.test(key)) {
            keys.push(key);
            if (keys.length >= limit) break;
          }
          i++;
        }
        
        // Return [nextCursor, keys]
        return [0, keys]; // Always return cursor 0 to indicate completion
      },
      on: (event: string, callback: (...args: any[]) => void) => {
        // Mock event handling
        if (event === 'ready' || event === 'connect') {
          setTimeout(() => callback(), 0);
        }
        return this;
      }
    };
    
    // Cast our mock to RedisClientType to satisfy TypeScript
    return mockClient as unknown as RedisClientType;
  }

  /**
   * Gracefully shut down the Redis client
   */
  public async shutdown(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }
}

export default RedisClient.getInstance();
