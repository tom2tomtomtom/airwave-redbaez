import { createClient } from 'redis';

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
const redisClient = createClient(redisOptions);

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

// Export Redis client
export const redis = redisClient;
