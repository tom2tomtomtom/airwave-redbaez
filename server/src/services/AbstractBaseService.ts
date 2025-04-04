/**
 * Abstract Base Service Class
 * Provides common functionality for all services
 */
import { BaseService, ServiceStatus } from '../types/serviceInterfaces';
import { logger } from '../utils/logger';

export abstract class AbstractBaseService implements BaseService {
  protected serviceName: string;
  protected isInitialized: boolean = false;
  protected lastHealthCheck: Date | null = null;
  protected healthCheckStatus: boolean = false;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
    logger.info(`Initializing ${this.serviceName} service`);
  }
  
  /**
   * Initialize the service
   * Should be overridden by implementing services with specific initialization logic
   */
  public async initialize(): Promise<void> {
    logger.info(`${this.serviceName} service initialized`);
    this.isInitialized = true;
  }
  
  /**
   * Check if the service is healthy and available
   * Should be overridden by implementing services with specific health check logic
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Basic health check - override in specific services
      this.lastHealthCheck = new Date();
      this.healthCheckStatus = true;
      return true;
    } catch (error) {
      logger.error(`Health check failed for ${this.serviceName}:`, error);
      this.healthCheckStatus = false;
      return false;
    }
  }
  
  /**
   * Get the current status of the service
   */
  public async getStatus(): Promise<ServiceStatus> {
    // Perform a health check if one hasn't been done recently
    if (!this.lastHealthCheck || Date.now() - this.lastHealthCheck.getTime() > 60000) {
      await this.healthCheck();
    }
    
    return {
      isAvailable: this.healthCheckStatus,
      lastChecked: this.lastHealthCheck || new Date(),
    };
  }
  
  /**
   * Validate that the service is initialized before use
   * @throws Error if the service is not initialized
   */
  protected validateInitialized(): void {
    if (!this.isInitialized) {
      const error = new Error(`${this.serviceName} service is not initialized`);
      logger.error(error.message);
      throw error;
    }
  }
}
