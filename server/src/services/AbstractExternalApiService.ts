/**
 * Abstract External API Service Class
 * Provides common functionality for services that integrate with external APIs
 */
import { ExternalApiService, ServiceStatus } from '../types/serviceInterfaces';
import { AbstractBaseService } from './AbstractBaseService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';

export abstract class AbstractExternalApiService extends AbstractBaseService implements ExternalApiService {
  protected apiKey: string | null = null;
  protected baseUrl: string;
  protected connectionTestResult: boolean = false;
  protected lastConnectionTest: Date | null = null;
  
  constructor(serviceName: string, baseUrl: string) {
    super(serviceName);
    this.baseUrl = baseUrl;
    
    // Try to load API key from environment variables
    this.loadApiKey();
  }
  
  /**
   * Load API key from environment variables
   * Should be overridden by implementing services with specific API key loading logic
   */
  protected abstract loadApiKey(): void;
  
  /**
   * Test the connection to the external API
   */
  public async testConnection(): Promise<boolean> {
    try {
      this.validateInitialized();
      
      if (!this.hasValidCredentials()) {
        logger.warn(`${this.serviceName} service has no valid credentials for connection test`);
        this.connectionTestResult = false;
        this.lastConnectionTest = new Date();
        return false;
      }
      
      // Implement actual connection test in derived classes
      const result = await this.performConnectionTest();
      
      this.connectionTestResult = result;
      this.lastConnectionTest = new Date();
      
      if (result) {
        logger.info(`${this.serviceName} connection test successful`);
      } else {
        logger.warn(`${this.serviceName} connection test failed`);
      }
      
      return result;
    } catch (error) {
      logger.error(`${this.serviceName} connection test error:`, error);
      this.connectionTestResult = false;
      this.lastConnectionTest = new Date();
      return false;
    }
  }
  
  /**
   * Perform the actual connection test
   * Should be implemented by derived classes
   */
  protected abstract performConnectionTest(): Promise<boolean>;
  
  /**
   * Get the API key
   */
  public getApiKey(): string | null {
    return this.apiKey;
  }
  
  /**
   * Check if the service has valid credentials
   */
  public hasValidCredentials(): boolean {
    return !!this.apiKey;
  }
  
  /**
   * Get the current status of the service
   * Extends the base implementation with API-specific status information
   */
  public async getStatus(): Promise<ServiceStatus> {
    const baseStatus = await super.getStatus();
    
    // Add API-specific status information
    return {
      ...baseStatus,
      isAvailable: baseStatus.isAvailable && this.hasValidCredentials(),
      metrics: {
        ...baseStatus.metrics,
        hasCredentials: this.hasValidCredentials(),
        lastConnectionTest: this.lastConnectionTest,
        connectionTestResult: this.connectionTestResult
      }
    };
  }
  
  /**
   * Make an authenticated request to the external API
   * @param endpoint The API endpoint to call
   * @param options Request options
   * @returns The API response
   */
  protected async makeApiRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    this.validateInitialized();
    
    if (!this.hasValidCredentials()) {
      throw new ApiError(
        ErrorCode.EXTERNAL_API_ERROR,
        `${this.serviceName} has no valid credentials`
      );
    }
    
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new ApiError(
          ErrorCode.EXTERNAL_API_ERROR,
          `${this.serviceName} API request failed: ${response.status} ${response.statusText}`,
          { status: response.status, endpoint }
        );
      }
      
      return await response.json() as T;
    } catch (error) {
      logger.error(`${this.serviceName} API request error:`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.EXTERNAL_API_ERROR,
        `${this.serviceName} API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { endpoint }
      );
    }
  }
  
  /**
   * Get authentication headers for API requests
   * Should be overridden by implementing services with specific auth header logic
   */
  protected abstract getAuthHeaders(): Record<string, string>;
}
