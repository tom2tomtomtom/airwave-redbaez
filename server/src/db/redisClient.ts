import { createClient } from 'redis';

// Create a mock Redis client for environments without Redis
class MockRedisClient {
  private storage: Map<string, { value: string, expiry?: number }> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  private isConnected: boolean = true;

  async connect() {
    console.log('Mock Redis client connected');
    this.isConnected = true;
    return this;
  }

  get isOpen() {
    return this.isConnected;
  }

  async quit() {
    console.log('Mock Redis client disconnected');
    this.isConnected = false;
    return 'OK';
  }

  async set(key: string, value: string, options?: { EX?: number }) {
    this.storage.set(key, { 
      value, 
      expiry: options?.EX ? Date.now() + (options.EX * 1000) : undefined 
    });
    return 'OK';
  }

  async get(key: string) {
    const item = this.storage.get(key);
    if (!item) return null;
    
    // Check if expired
    if (item.expiry && item.expiry < Date.now()) {
      this.storage.delete(key);
      return null;
    }
    
    return item.value;
  }

  async del(key: string) {
    this.storage.delete(key);
    return 1;
  }

  async sAdd(key: string, ...members: string[]) {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    
    const set = this.sets.get(key)!;
    let added = 0;
    
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    
    return added;
  }

  async sRem(key: string, ...members: string[]) {
    if (!this.sets.has(key)) return 0;
    
    const set = this.sets.get(key)!;
    let removed = 0;
    
    for (const member of members) {
      if (set.has(member)) {
        set.delete(member);
        removed++;
      }
    }
    
    return removed;
  }

  async sMembers(key: string) {
    if (!this.sets.has(key)) return [];
    return Array.from(this.sets.get(key)!);
  }

  async expire(key: string, seconds: number) {
    const item = this.storage.get(key);
    if (item) {
      item.expiry = Date.now() + (seconds * 1000);
      return 1;
    }
    
    if (this.sets.has(key)) {
      // For sets, we don't actually implement expiry, but return success
      return 1;
    }
    
    return 0;
  }

  on(event: string, callback: (...args: any[]) => void) {
    // Mock event handling
    if (event === 'connect') {
      // Immediately trigger connect event
      setTimeout(() => callback(), 0);
    }
    return this;
  }
}

// Determine whether to use real Redis or mock
const useRealRedis = process.env.USE_REAL_REDIS === 'true';
let redisClient;

if (useRealRedis) {
  // Configure Redis client options
  const redisOptions = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries: number) => {
        // Exponential backoff with max delay of 10 seconds
        const delay = Math.min(Math.pow(2, retries) * 100, 10000);
        return delay;
      }
    }
  };

  // Create and connect to Redis client
  redisClient = createClient(redisOptions);

  // Error handling
  redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  // Ensure we handle connection events
  redisClient.on('connect', () => {
    console.log('Connected to Redis server');
  });

  redisClient.on('reconnecting', () => {
    console.log('Reconnecting to Redis server...');
  });

  // Connect to Redis in a non-blocking way
  (async () => {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      // Continue execution - application can work without Redis,
      // but token revocation and session management will be limited
    }
  })();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing Redis connection...');
    await redisClient.quit();
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing Redis connection...');
    await redisClient.quit();
  });
} else {
  // Use mock Redis client
  console.log('Using mock Redis client for development/testing');
  redisClient = new MockRedisClient();
  redisClient.connect().catch(err => console.error('Error connecting mock Redis:', err));
}

// Export Redis client
export const redis = redisClient;
