import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Create base axios instance with common configuration
const httpClient = axios.create({
  baseURL: '/api/v2',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to inject auth token
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle auth errors
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Log all errors with consistent format
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message: error.message,
      response: error.response?.data
    });
    
    return Promise.reject(error);
  }
);

// Type for API responses to enforce consistency
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Helper function to make API calls with proper typing
export async function apiCall<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response: AxiosResponse<ApiResponse<T> | T> = await httpClient(config);
    
    // Handle different response formats
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      // Response is in ApiResponse format
      const apiResponse = response.data as ApiResponse<T>;
      if (apiResponse.success) {
        return apiResponse.data;
      } else {
        throw new Error(apiResponse.error || apiResponse.message || 'Unknown API error');
      }
    } else {
      // Response is direct data
      return response.data as T;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}

export default httpClient;
