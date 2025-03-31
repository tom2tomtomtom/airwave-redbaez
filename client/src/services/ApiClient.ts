/**
 * API Client service for the Image-to-Video feature
 * This provides a dedicated client for image-to-video operations
 */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { supabase } from '../lib/supabase';

// Get the API URL from environment variables, defaulting to localhost:3002
const baseURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
const apiURL = `${baseURL}/api`;

/**
 * Create a configured axios instance for API requests
 */
const api = axios.create({
  baseURL: apiURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase timeout for video generation processes
  timeout: 60000, // 60 seconds
});

// Add authorization token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      // Get the current Supabase session
      const { data } = await supabase.auth.getSession();
      
      if (data?.session?.access_token) {
        config.headers.Authorization = `Bearer ${data.session.access_token}`;
      } else {
        // Fall back to stored token if available
        const storedToken = localStorage.getItem('airwave_auth_token');
        
        if (storedToken) {
          config.headers.Authorization = `Bearer ${storedToken}`;
        }
      }
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Define the ApiClient with image-to-video endpoints
export const ApiClient = {
  // Image to Video endpoints
  post: (url: string, data: any): Promise<AxiosResponse> => 
    api.post(url, data),
    
  get: (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> => 
    api.get(url, config),
    
  put: (url: string, data: any): Promise<AxiosResponse> => 
    api.put(url, data),
    
  delete: (url: string): Promise<AxiosResponse> => 
    api.delete(url),
    
  // Specialized image-to-video endpoints
  imageToVideo: {
    generate: (options: Record<string, any>): Promise<AxiosResponse> => 
      api.post('/image-to-video/generate', options),
      
    getStatus: (jobId: string): Promise<AxiosResponse> => 
      api.get(`/image-to-video/status/${jobId}`),
      
    getJobs: (filters?: Record<string, any>): Promise<AxiosResponse> => 
      api.get('/image-to-video/jobs', { params: filters }),
      
    cancelJob: (jobId: string): Promise<AxiosResponse> => 
      api.post(`/image-to-video/cancel/${jobId}`),
  }
};

export default ApiClient;
