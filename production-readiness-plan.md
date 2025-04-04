# Production Readiness Plan for Airwave-Redbaez

Based on a comprehensive code audit of the airwave-redbaez repository, this document outlines the necessary changes and improvements to prepare the application for production deployment. The plan is organized by priority, with critical security fixes that must be implemented first, followed by important improvements and suggested enhancements.

## 1. Critical Security Fixes

### 1.1 Implement Helmet for HTTP Security Headers

**Issue:** Helmet is included in package.json but not actually implemented in the server code.

**Solution:**
- Add Helmet middleware to the Express application in `server/src/index.ts`
- Configure appropriate security headers for production environment

**Implementation:**
```typescript
// Add import at the top of server/src/index.ts
import helmet from 'helmet';

// Add before other middleware (after express.json() and cors)
app.use(helmet());
```

### 1.2 Implement Rate Limiting

**Issue:** Express rate-limiting package is included in package.json but not implemented in the code.

**Solution:**
- Add rate limiting middleware to protect against brute force attacks and DoS
- Apply rate limiting to authentication endpoints and other sensitive routes

**Implementation:**
```typescript
// Add import at the top of server/src/index.ts
import rateLimit from 'express-rate-limit';

// Add before routes are registered
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to all routes that begin with /api/
app.use('/api/', apiLimiter);

// More strict rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts, please try again after an hour'
});

// Apply stricter rate limiting to auth routes
app.use('/api/auth/', authLimiter);
```

### 1.3 Disable Development and Mock Services in Production

**Issue:** Development shortcuts and mock services may be enabled in production.

**Solution:**
- Ensure all development shortcuts are disabled in production
- Force real services (Redis, Supabase) in production environment
- Add validation to prevent prototype mode in production

**Implementation:**
```typescript
// In server/src/db/redisClient.ts and server/src/db/supabaseClient.ts
// Add validation to force real services in production

if (process.env.NODE_ENV === 'production' && process.env.USE_REAL_REDIS !== 'true') {
  throw new Error('Production environment requires USE_REAL_REDIS to be set to true');
}

if (process.env.NODE_ENV === 'production' && process.env.USE_REAL_SUPABASE !== 'true') {
  throw new Error('Production environment requires USE_REAL_SUPABASE to be set to true');
}
```

### 1.4 Enhance Docker Security

**Issue:** Docker configurations are minimal and lack security hardening.

**Solution:**
- Implement multi-stage builds for server Dockerfile
- Run containers as non-root user
- Add security scanning to Docker build process

**Implementation:**
```dockerfile
# Updated server/Dockerfile with multi-stage build and security improvements
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
# Create app directory
WORKDIR /app
# Create a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
# Copy only production dependencies and built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
# Use the non-root user
USER nodejs
# Set environment variables
ENV NODE_ENV=production
ENV USE_REAL_REDIS=true
ENV USE_REAL_SUPABASE=true
# Expose port
EXPOSE 3001
# Start the server
CMD ["node", "dist/index.js"]
```

## 2. Important Performance Improvements

### 2.1 Implement Caching Strategy

**Issue:** Redis is configured but not optimally used for caching.

**Solution:**
- Implement a comprehensive caching strategy
- Cache frequently accessed data and API responses
- Add cache invalidation mechanisms

**Implementation:**
```typescript
// Create a new file: server/src/utils/cacheMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../db/redisClient';

export const cacheMiddleware = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      const cachedResponse = await redisClient.get(key);
      
      if (cachedResponse) {
        const parsedResponse = JSON.parse(cachedResponse);
        return res.status(200).json(parsedResponse);
      }
      
      // Store the original send function
      const originalSend = res.send;
      
      // Override the send function
      res.send = function(body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setEx(key, duration, body);
        }
        
        // Call the original send function
        return originalSend.call(this, body);
      };
      
      next();
    } catch (error) {
      // If Redis fails, just continue without caching
      next();
    }
  };
};
```

### 2.2 Optimize Media Processing

**Issue:** Heavy media processing operations lack queuing or throttling mechanisms.

**Solution:**
- Implement a job queue for media processing tasks
- Add throttling for concurrent processing
- Implement graceful degradation for high load

**Implementation:**
```typescript
// Create a new file: server/src/utils/jobQueue.ts
import Queue from 'bull';
import { logger } from './logger';

// Create Redis connection for Bull
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create queues for different job types
export const mediaProcessingQueue = new Queue('media-processing', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

// Process media jobs with concurrency limit
mediaProcessingQueue.process(5, async (job) => {
  const { type, data } = job.data;
  
  logger.info(`Processing ${type} job`, { jobId: job.id });
  
  try {
    // Process different job types
    switch (type) {
      case 'image-to-video':
        // Call the actual processing function
        // return await processImageToVideo(data);
        break;
      case 'generate-subtitles':
        // return await generateSubtitles(data);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  } catch (error) {
    logger.error(`Error processing ${type} job`, { 
      jobId: job.id, 
      error: error.message 
    });
    throw error;
  }
});

// Add event listeners for monitoring
mediaProcessingQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

mediaProcessingQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed`, { error: error.message });
});

// Export function to add jobs to the queue
export const addMediaProcessingJob = async (type, data, options = {}) => {
  const job = await mediaProcessingQueue.add({ type, data }, options);
  logger.info(`Added ${type} job to queue`, { jobId: job.id });
  return job;
};
```

### 2.3 Implement Proper Error Recovery

**Issue:** Error recovery strategies are inconsistent across different parts of the application.

**Solution:**
- Implement consistent error handling across all services
- Add retry mechanisms for external API calls
- Implement circuit breakers for external dependencies

**Implementation:**
```typescript
// Create a new file: server/src/utils/serviceWrapper.ts
import { logger } from './logger';

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  backoffFactor: number;
}

// Default retry configuration
const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  backoffFactor: 2
};

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// Circuit breaker configuration
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
}

// Default circuit breaker configuration
const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000 // 30 seconds
};

// Circuit breaker state for each service
const circuitBreakers: Record<string, CircuitBreakerState> = {};

// Wrapper function for service calls with retry and circuit breaker
export async function callExternalService<T>(
  serviceName: string,
  serviceFunction: () => Promise<T>,
  retryConfig: Partial<RetryConfig> = {},
  circuitBreakerConfig: Partial<CircuitBreakerConfig> = {}
): Promise<T> {
  // Merge configurations with defaults
  const finalRetryConfig = { ...defaultRetryConfig, ...retryConfig };
  const finalCircuitBreakerConfig = { ...defaultCircuitBreakerConfig, ...circuitBreakerConfig };
  
  // Initialize circuit breaker if not exists
  if (!circuitBreakers[serviceName]) {
    circuitBreakers[serviceName] = {
      failures: 0,
      lastFailure: 0,
      status: 'CLOSED'
    };
  }
  
  const circuitBreaker = circuitBreakers[serviceName];
  
  // Check if circuit is open
  if (circuitBreaker.status === 'OPEN') {
    const now = Date.now();
    const timeElapsed = now - circuitBreaker.lastFailure;
    
    if (timeElapsed > finalCircuitBreakerConfig.resetTimeout) {
      // Move to half-open state
      circuitBreaker.status = 'HALF_OPEN';
      logger.info(`Circuit for ${serviceName} is now HALF_OPEN`);
    } else {
      // Circuit is still open
      logger.warn(`Circuit for ${serviceName} is OPEN, fast failing`);
      throw new Error(`Service ${serviceName} is unavailable (circuit open)`);
    }
  }
  
  // Retry logic
  let lastError: Error;
  for (let attempt = 0; attempt <= finalRetryConfig.maxRetries; attempt++) {
    try {
      // If not the first attempt, delay before retry
      if (attempt > 0) {
        const delay = finalRetryConfig.initialDelay * Math.pow(finalRetryConfig.backoffFactor, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        logger.info(`Retrying ${serviceName} (attempt ${attempt})`);
      }
      
      // Call the service
      const result = await serviceFunction();
      
      // If successful and in HALF_OPEN state, reset the circuit breaker
      if (circuitBreaker.status === 'HALF_OPEN') {
        circuitBreaker.failures = 0;
        circuitBreaker.status = 'CLOSED';
        logger.info(`Circuit for ${serviceName} is now CLOSED`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      logger.error(`Error calling ${serviceName}`, { 
        attempt, 
        error: error.message,
        circuitStatus: circuitBreaker.status
      });
      
      // Update circuit breaker state
      if (circuitBreaker.status === 'CLOSED' || circuitBreaker.status === 'HALF_OPEN') {
        circuitBreaker.failures++;
        circuitBreaker.lastFailure = Date.now();
        
        // Check if threshold is reached
        if (circuitBreaker.failures >= finalCircuitBreakerConfig.failureThreshold) {
          circuitBreaker.status = 'OPEN';
          logger.warn(`Circuit for ${serviceName} is now OPEN due to ${circuitBreaker.failures} failures`);
        }
      }
      
      // If circuit is now open, stop retrying
      if (circuitBreaker.status === 'OPEN') {
        break;
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}
```

## 3. Deployment Configuration Improvements

### 3.1 Create Database Migration Strategy

**Issue:** No clear migration strategy for Supabase schema changes was found.

**Solution:**
- Implement a database migration system
- Document the database schema
- Create scripts for schema initialization and updates

**Implementation:**
```typescript
// Create a new file: server/src/migrations/migrationRunner.ts
import fs from 'fs';
import path from 'path';
import { supabase } from '../db/supabaseClient';
import { logger } from '../utils/logger';

interface Migration {
  id: number;
  name: string;
  sql: string;
}

// Function to run migrations
export async function runMigrations() {
  // Skip migrations if using mock Supabase
  if (process.env.USE_REAL_SUPABASE !== 'true') {
    logger.info('Skipping migrations as mock Supabase is in use');
    return;
  }

  logger.info('Starting database migrations');

  try {
    // Create migrations table if it doesn't exist
    await supabase.rpc('create_migrations_table_if_not_exists');

    // Get list of applied migrations
    const { data: appliedMigrations, error: fetchError } = await supabase
      .from('migrations')
      .select('id, name')
      .order('id', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch applied migrations: ${fetchError.message}`);
    }

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'sql');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Convert to migration objects
    const migrations: Migration[] = migrationFiles.map((file, index) => {
      const id = index + 1;
      const name = file.replace('.sql', '');
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      return { id, name, sql };
    });

    // Find migrations that need to be applied
    const appliedIds = new Set(appliedMigrations.map(m => m.id));
    const pendingMigrations = migrations.filter(m => !appliedIds.has(m.id));

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations to apply');
      return;
    }

    logger.info(`Found ${pendingMigrations.length} pending migrations`);

    // Apply each pending migration
    for (const migration of pendingMigrations) {
      logger.info(`Applying migration ${migration.id}: ${migration.name}`);

      // Start a transaction
      const { error: txError } = await supabase.rpc('begin_transaction');
      if (txError) {
        throw new Error(`Failed to begin transaction: ${txError.message}`);
      }

      try {
        // Execute the migration SQL
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: migration.sql
        });

        if (sqlError) {
          throw new Error(`Failed to execute migration: ${sqlError.message}`);
        }

        // Record the migration
        const { error: insertError } = await supabase
          .from('migrations')
          .insert({
            id: migration.id,
            name: migration.name,
            applied_at: new Date().toISOString()
          });

        if (insertError) {
          throw new Error(`Failed to record migration: ${insertError.message}`);
        }

        // Commit the transaction
        const { error: commitError } = await supabase.rpc('commit_transaction');
        if (commitError) {
          throw new Error(`Failed to commit transaction: ${commitError.message}`);
        }

        logger.info(`Successfully applied migration ${migration.id}: ${migration.name}`);
      } catch (error) {
        // Rollback on error
        await supabase.rpc('rollback_transaction');
        logger.error(`Migration ${migration.id} failed: ${error.message}`);
        throw error;
      }
    }

    logger.info('All migrations applied successfully');
  } catch (error) {
    logger.error('Migration process failed', { error: error.message });
    throw error;
  }
}
```

### 3.2 Implement CI/CD Pipeline

**Issue:** No CI/CD configuration files were found.

**Solution:**
- Create GitHub Actions workflows for CI/CD
- Implement automated testing
- Set up deployment pipelines

**Implementation:**
```yaml
# Create a new file: .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, manus-fix ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd client && npm ci
        cd ../server && npm ci
    
    - name: Run linting
      run: |
        cd client && npm run lint
        cd ../server && npm run lint
    
    - name: Run tests
      run: |
        cd client && npm test
        cd ../server && npm test
    
    - name: Build
      run: |
        cd client && npm run build
        cd ../server && npm run build

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high

# Create a new file: .github/workflows/cd.yml
name: CD

on:
  push:
    branches: [ main ]
    
jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js 18.x
      uses: actions/setup-node@v3
      with:
        node-version: 18.x
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd client && npm ci
        cd ../server && npm ci
    
    - name: Build
      run: |
        cd client && npm run build
        cd ../server && npm run build
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push client
      uses: docker/build-push-action@v4
      with:
        context: ./client
        push: true
        tags: yourusername/airwave-redbaez-client:latest
    
    - name: Build and push server
      uses: docker/build-push-action@v4
      with:
        context: ./server
        push: true
        tags: yourusername/airwave-redbaez-server:latest
```

### 3.3 Create Production Environment Configuration

**Issue:** Production-specific configurations exist but need refinement.

**Solution:**
- Create comprehensive .env.production files
- Document all required environment variables
- Add validation for required variables

**Implementation:**
```
# Create server/.env.production
NODE_ENV=production
PORT=3001
ALTERNATE_PORT=3002

# API Keys (replace with actual keys in production)
OPENAI_API_KEY=your_openai_api_key
CREATOMATE_API_KEY=your_creatomate_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
MUBERT_API_KEY=your_mubert_api_key
RUNWAY_API_KEY=your_runway_api_key
SUNO_API_KEY=your_suno_api_key

# Service configuration
USE_REAL_REDIS=true
USE_REAL_SUPABASE=true
REDIS_URL=redis://your-redis-host:6379
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_KEY=your_supabase_key

# Security
JWT_SECRET=your_strong_jwt_secret_for_production
CORS_ORIGIN=https://your-production-domain.com
SESSION_SECRET=your_strong_session_secret

# Feature flags
ENABLE_RATE_LIMITING=true
ENABLE_CACHING=true
PROTOTYPE_MODE=false
MAX_CONCURRENT_RENDERS=10

# Logging
LOG_LEVEL=info
```

## 4. Implementation Plan

### Phase 1: Critical Security Fixes (1-2 days)
1. Implement Helmet for HTTP security headers
2. Add rate limiting to protect against abuse
3. Ensure development shortcuts are disabled in production
4. Enhance Docker security with multi-stage builds and non-root users

### Phase 2: Performance Improvements (2-3 days)
1. Implement caching strategy for frequently accessed data
2. Add job queue for media processing tasks
3. Implement consistent error handling with retry mechanisms
4. Add circuit breakers for external dependencies

### Phase 3: Deployment Configuration (2-3 days)
1. Create database migration system
2. Implement CI/CD pipeline with GitHub Actions
3. Refine production environment configuration
4. Add validation for required environment variables

### Phase 4: Testing and Verification (1-2 days)
1. Test all implemented changes
2. Verify security improvements
3. Load test with production-like data
4. Document all changes and deployment procedures

## 5. Conclusion

This production readiness plan addresses the critical issues identified in the code audit and provides a comprehensive approach to preparing the Airwave-Redbaez application for production deployment. By implementing these changes, the application will be more secure, performant, and maintainable in a production environment.

The implementation is organized into phases, with critical security fixes prioritized first, followed by performance improvements and deployment configurations. Each phase builds upon the previous one, ensuring a systematic approach to production readiness.
