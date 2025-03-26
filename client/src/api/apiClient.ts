import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '../lib/supabase';

// Create a base axios instance with common configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL || 'http://localhost:3002',
  timeout: 30000, // Increased timeout for slower development environments
  headers: {
    'Content-Type': 'application/json',
  }
});

// Flag to detect if we're running with a mock server
const isUsingMockServer = process.env.REACT_APP_USE_MOCK_SERVER === 'true';

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response from ${response.config.url}:`, {
      status: response.status,
      statusText: response.statusText,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      dataPreview: typeof response.data === 'object' ? 
        (Array.isArray(response.data) ? 
          `Array with ${response.data.length} items` : 
          Object.keys(response.data).join(', ')
        ) : 
        String(response.data).substring(0, 100)
    });
    
    if (response.config.url?.includes('/clients')) {
      console.log('Client data structure:', response.data);
      if (Array.isArray(response.data)) {
        response.data.forEach((client, index) => {
          console.log(`Client ${index}:`, client);
        });
      } else if (response.data && typeof response.data === 'object') {
        console.log('Client response keys:', Object.keys(response.data));
      }
    }
    
    return response;
  },
  (error) => {
    console.error('API Request failed:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Add request interceptor to automatically add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    try {
      // Check for development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true';
      
      if (isDevelopment) {
        console.log('[DEV] Development mode detected in API client');
        
        // Get or create a development token
        const devToken = localStorage.getItem('airwave_auth_token') || `dev_token_${Date.now()}`;
        
        // Store token if it doesn't exist
        if (!localStorage.getItem('airwave_auth_token')) {
          localStorage.setItem('airwave_auth_token', devToken);
        }
        
        // Set authorization header with development token
        config.headers.set('Authorization', `Bearer ${devToken}`);
        console.log('[DEV] Using development token for request:', config.url);
        
        return config;
      }
      
      // Normal flow for production
      // Get the current session from Supabase
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      
      // Enhanced logging for debugging
      console.log(`API Request to: ${config.url}`);
      console.log('Auth session check:', session ? `Session exists (expires: ${new Date(session.expires_at || 0).toISOString()})` : 'No session found');
      
      // If there's a valid session, add the token to the request headers
      if (session?.access_token) {
        // Set the Authorization header
        config.headers.set('Authorization', `Bearer ${session.access_token}`);
        console.log('Using current session token');
        
        // Also store token in localStorage as a fallback
        localStorage.setItem('airwave_auth_token', session.access_token);
        
        // Store expiry time to check staleness
        if (session.expires_at) {
          localStorage.setItem('airwave_token_expires', session.expires_at.toString());
        }
      } else {
        // Try to get token from localStorage as fallback
        const storedToken = localStorage.getItem('airwave_auth_token');
        if (storedToken) {
          config.headers.set('Authorization', `Bearer ${storedToken}`);
          console.log('Using stored token as fallback');
          
          // Check if the stored token is likely expired
          const expiresAt = localStorage.getItem('airwave_token_expires');
          if (expiresAt && Date.now() > parseInt(expiresAt) * 1000) {
            console.warn('Using potentially expired token - this might fail');
          }
        } else {
          console.warn('No authentication token available for request');
        }
      }
      
      return config;
    } catch (error) {
      console.error('Error adding auth token to request:', error);
      
      // Try to use stored token as a last resort
      const storedToken = localStorage.getItem('airwave_auth_token');
      if (storedToken) {
        config.headers.set('Authorization', `Bearer ${storedToken}`);
      }
      
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.error('Authentication error - user may need to log in again');
      // Dispatch an event that can be captured by the application
      const authErrorEvent = new CustomEvent('auth:error', { 
        detail: { message: 'Authentication failed, please log in again' } 
      });
      window.dispatchEvent(authErrorEvent);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
