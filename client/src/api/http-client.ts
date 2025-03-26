import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Standard API response format to ensure consistency
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * Configuration for HTTP client
 */
interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Centralised HTTP client with error handling and authentication
 */
class HttpClient {
  private client: AxiosInstance;
  private static instance: HttpClient;

  private constructor(config: HttpClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      },
    });

    this.setupInterceptors();
  }

  /**
   * Get singleton instance of HttpClient
   */
  public static getInstance(config?: HttpClientConfig): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient(
        config || { baseURL: '/api/v2' }
      );
    }
    return HttpClient.instance;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Get auth token from localStorage
        const token = localStorage.getItem('token');
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Get client ID from localStorage for client-specific endpoints
        const clientId = localStorage.getItem('selectedClientId');
        if (clientId && !config.params?.clientId) {
          config.params = {
            ...(config.params || {}),
            clientId,
          };
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Handle auth errors
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return Promise.reject(new Error('Authentication failed'));
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          return Promise.reject(new Error('Rate limit exceeded. Please try again later.'));
        }

        // Standard error logging
        console.error('API Error:', {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Generic request method with typed response
   */
  public async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse = await this.client(config);
      
      // Handle various response formats from the API
      if (response.data) {
        // Format 1: { success, data, message }
        if (typeof response.data === 'object' && 'success' in response.data) {
          const apiResponse = response.data as ApiResponse<T>;
          if (apiResponse.success) {
            return apiResponse.data;
          } else {
            throw new Error(apiResponse.error || apiResponse.message || 'Unknown API error');
          }
        }
        
        // Format 2: { data: [...] }
        if (typeof response.data === 'object' && 'data' in response.data) {
          return response.data.data as T;
        }
        
        // Format 3: direct data
        return response.data as T;
      }
      
      throw new Error('Empty response from server');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * HTTP GET request
   */
  public async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>({
      method: 'get',
      url,
      params: {
        ...params,
        _t: Date.now(), // Prevent caching
      },
    });
  }

  /**
   * HTTP POST request
   */
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'post',
      url,
      data,
      ...config,
    });
  }

  /**
   * HTTP PUT request
   */
  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'put',
      url,
      data,
      ...config,
    });
  }

  /**
   * HTTP DELETE request
   */
  public async delete<T>(url: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>({
      method: 'delete',
      url,
      params,
    });
  }

  /**
   * HTTP PATCH request
   */
  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'patch',
      url,
      data,
      ...config,
    });
  }
}

// Export singleton instance
export const httpClient = HttpClient.getInstance();

// Export default for convenience
export default httpClient;
