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

/**
 * Wrapper function for service calls with retry and circuit breaker
 * @param serviceName Name of the service being called (for logging and circuit breaker)
 * @param serviceFunction Function that makes the actual service call
 * @param retryConfig Optional retry configuration
 * @param circuitBreakerConfig Optional circuit breaker configuration
 * @returns Result of the service call
 */
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

/**
 * Get the current state of a service's circuit breaker
 * @param serviceName Name of the service
 * @returns Circuit breaker state or null if not initialized
 */
export function getCircuitBreakerState(serviceName: string): CircuitBreakerState | null {
  return circuitBreakers[serviceName] || null;
}

/**
 * Reset a service's circuit breaker to closed state
 * @param serviceName Name of the service
 */
export function resetCircuitBreaker(serviceName: string): void {
  circuitBreakers[serviceName] = {
    failures: 0,
    lastFailure: 0,
    status: 'CLOSED'
  };
  logger.info(`Circuit for ${serviceName} has been manually reset to CLOSED`);
}

/**
 * Get the state of all circuit breakers
 * @returns Object with service names as keys and circuit breaker states as values
 */
export function getAllCircuitBreakerStates(): Record<string, CircuitBreakerState> {
  return { ...circuitBreakers };
}
