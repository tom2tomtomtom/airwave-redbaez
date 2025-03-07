import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Get the API URL from environment variables, defaulting to localhost:3001
const baseURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
const apiURL = `${baseURL}/api`;

const api = axios.create({
  baseURL: apiURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase timeout for video uploads and generations
  timeout: 60000, // 60 seconds
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      // If we get a 401 response, the token might be invalid or expired
      localStorage.removeItem('token');
      
      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Log error responses in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error.response ? error.response.data : error.message);
    }
    
    return Promise.reject(error);
  }
);

// API wrapper functions with better TypeScript support
export const apiClient = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string): Promise<AxiosResponse> => 
      api.post('/auth/login', { email, password }),
    
    register: (email: string, password: string, name: string): Promise<AxiosResponse> => 
      api.post('/auth/register', { email, password, name }),
    
    getProfile: (): Promise<AxiosResponse> => 
      api.get('/auth/me'),
  },
  
  // Assets endpoints
  assets: {
    /**
     * Get all assets with optional filtering
     * @param filters Optional filters including type, tags, search terms
     */
    getAll: (filters?: Record<string, any>): Promise<AxiosResponse> => 
      api.get('/assets', { params: filters }),
    
    /**
     * Get a single asset by ID
     * @param id Asset ID
     */
    getById: (id: string): Promise<AxiosResponse> => 
      api.get(`/assets/${id}`),
    
    /**
     * Upload a new asset
     * @param formData Form data containing the asset file and metadata
     */
    upload: (formData: FormData): Promise<AxiosResponse> => {
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Longer timeout for uploads
        timeout: 300000, // 5 minutes
      };
      return api.post('/assets/upload', formData, config);
    },
    
    /**
     * Update an existing asset
     * @param id Asset ID
     * @param data Updated asset data
     */
    update: (id: string, data: Record<string, any>): Promise<AxiosResponse> => 
      api.put(`/assets/${id}`, data),
    
    /**
     * Delete an asset
     * @param id Asset ID
     */
    delete: (id: string): Promise<AxiosResponse> => 
      api.delete(`/assets/${id}`),
    
    /**
     * Toggle the favourite status of an asset
     * @param id Asset ID
     * @param isFavourite New favourite status
     */
    updateFavourite: (id: string, isFavourite: boolean): Promise<AxiosResponse> => 
      api.put(`/assets/${id}/favourite`, { isFavourite }),
    
    /**
     * Download an asset file
     * @param id Asset ID
     */
    download: (id: string): Promise<AxiosResponse> => 
      api.get(`/assets/${id}/download`, { responseType: 'blob' }),
  },
  
  // Templates endpoints
  templates: {
    getAll: (filters?: Record<string, any>): Promise<AxiosResponse> => 
      api.get('/templates', { params: filters }),
    
    getById: (id: string): Promise<AxiosResponse> => 
      api.get(`/templates/${id}`),
    
    getFromCreatomate: (): Promise<AxiosResponse> => 
      api.get('/creatomate/templates'),
  },
  
  // Campaigns endpoints
  campaigns: {
    getAll: (filters?: Record<string, any>): Promise<AxiosResponse> => 
      api.get('/campaigns', { params: filters }),
    
    getById: (id: string): Promise<AxiosResponse> => 
      api.get(`/campaigns/${id}`),
    
    create: (data: Record<string, any>): Promise<AxiosResponse> => 
      api.post('/campaigns', data),
    
    update: (id: string, data: Record<string, any>): Promise<AxiosResponse> => 
      api.put(`/campaigns/${id}`, data),
    
    delete: (id: string): Promise<AxiosResponse> => 
      api.delete(`/campaigns/${id}`),
    
    addExecution: (campaignId: string, data: Record<string, any>): Promise<AxiosResponse> => 
      api.post(`/campaigns/${campaignId}/executions`, data),
  },
  
  // Executions endpoints
  executions: {
    getById: (id: string): Promise<AxiosResponse> => 
      api.get(`/executions/${id}`),
    
    update: (id: string, data: Record<string, any>): Promise<AxiosResponse> => 
      api.put(`/executions/${id}`, data),
    
    delete: (id: string): Promise<AxiosResponse> => 
      api.delete(`/executions/${id}`),
  },
  
  // Creatomate endpoints
  creatomate: {
    generateVideo: (data: Record<string, any>): Promise<AxiosResponse> => 
      api.post('/creatomate/generate', data),
    
    generatePreview: (data: Record<string, any>): Promise<AxiosResponse> => 
      api.post('/creatomate/preview', data),
    
    checkRenderStatus: (jobId: string): Promise<AxiosResponse> => 
      api.get(`/creatomate/render/${jobId}`),
    
    batchGenerate: (data: Record<string, any>): Promise<AxiosResponse> => 
      api.post('/creatomate/batch', data),
    
    generatePlatformFormats: (data: Record<string, any>): Promise<AxiosResponse> => 
      api.post('/creatomate/platform-formats', data),
  },
  
  // Exports endpoints
  exports: {
    getPlatformSpecs: (): Promise<AxiosResponse> => 
      api.get('/exports/platform-specs'),
    
    exportCampaign: (campaignId: string, data: Record<string, any>): Promise<AxiosResponse> => 
      api.post(`/exports/campaign/${campaignId}`, data),
    
    downloadExport: (campaignId: string): Promise<AxiosResponse> => 
      api.get(`/exports/campaign/${campaignId}/download`, {
        responseType: 'blob', // Important for file downloads
      }),
  },
  
  // LLM/Strategy endpoints
  llm: {
    /**
     * Parse a client brief to generate motivations
     * @param briefData The client brief data
     */
    parseBrief: (briefData: {
      clientName: string;
      projectName: string;
      productDescription: string;
      targetAudience: string;
      competitiveContext: string;
      campaignObjectives: string;
      keyMessages: string;
      mandatories: string;
      additionalInfo?: string;
      tonePreference?: string;
    }): Promise<AxiosResponse> =>
      api.post('/llm/parse-brief', briefData),
      
    /**
     * Regenerate motivations based on user feedback
     * @param briefData The original brief data
     * @param feedback User feedback for regeneration
     */
    regenerateMotivations: (
      briefData: {
        clientName: string;
        projectName: string;
        productDescription: string;
        targetAudience: string;
        competitiveContext: string;
        campaignObjectives: string;
        keyMessages: string;
        mandatories: string;
        additionalInfo?: string;
        tonePreference?: string;
      }, 
      feedback: string
    ): Promise<AxiosResponse> =>
      api.post('/llm/regenerate-motivations', { briefData, feedback }),
      
    /**
     * Generate ad copy based on selected motivations
     * @param copyRequest Copy generation parameters
     * @param briefData The brief data
     * @param motivations Selected motivations
     */
    generateCopy: (
      copyRequest: {
        motivationIds: string[];
        tone: string;
        style: string;
        frameCount: number;
        length: 'short' | 'medium' | 'long';
        includeCallToAction: boolean;
        callToActionText?: string;
      }, 
      briefData: {
        clientName: string;
        projectName: string;
        productDescription: string;
        targetAudience: string;
        competitiveContext: string;
        campaignObjectives: string;
        keyMessages: string;
        mandatories: string;
        additionalInfo?: string;
        tonePreference?: string;
      }, 
      motivations: Array<{
        id: string;
        title: string;
        description: string;
        explanation: string;
        selected: boolean;
      }>
    ): Promise<AxiosResponse> =>
      api.post('/llm/generate-copy', { copyRequest, briefData, motivations }),
  },
  
  // Sign-off endpoints
  signoff: {
    create: (data: Record<string, any>): Promise<AxiosResponse> =>
      api.post('/signoff', data),
      
    getCampaignItems: (campaignId: string): Promise<AxiosResponse> =>
      api.get(`/signoff/campaign/${campaignId}`),
      
    getById: (id: string): Promise<AxiosResponse> =>
      api.get(`/signoff/${id}`),
      
    updateStatus: (id: string, status: string, comments?: string): Promise<AxiosResponse> =>
      api.put(`/signoff/${id}/status`, { status, comments }),
      
    createNewVersion: (id: string, content: any, title?: string): Promise<AxiosResponse> =>
      api.post(`/signoff/${id}/versions`, { content, title }),
      
    // Client portal (no auth required)
    getClientItem: (token: string): Promise<AxiosResponse> =>
      api.get(`/signoff/client/${token}`),
      
    clientRespond: (token: string, status: string, comments?: string): Promise<AxiosResponse> =>
      api.put(`/signoff/client/${token}/respond`, { status, comments }),
  },
  
  // Matrix endpoints
  matrix: {
    create: (data: Record<string, any>): Promise<AxiosResponse> =>
      api.post('/matrix', data),
      
    getCampaignMatrices: (campaignId: string): Promise<AxiosResponse> =>
      api.get(`/matrix/campaign/${campaignId}`),
      
    getById: (id: string): Promise<AxiosResponse> =>
      api.get(`/matrix/${id}`),
      
    update: (id: string, data: Record<string, any>): Promise<AxiosResponse> =>
      api.put(`/matrix/${id}`, data),
      
    generateCombinations: (id: string, options: Record<string, any>): Promise<AxiosResponse> =>
      api.post(`/matrix/${id}/combinations`, { options }),
      
    renderRow: (id: string, rowId: string): Promise<AxiosResponse> =>
      api.post(`/matrix/${id}/rows/${rowId}/render`),
      
    toggleRowLock: (id: string, rowId: string, locked: boolean): Promise<AxiosResponse> =>
      api.put(`/matrix/${id}/rows/${rowId}/lock`, { locked }),
      
    toggleSlotLock: (id: string, slotId: string, locked: boolean): Promise<AxiosResponse> =>
      api.put(`/matrix/${id}/slots/${slotId}/lock`, { locked }),
      
    renderAll: (id: string): Promise<AxiosResponse> =>
      api.post(`/matrix/${id}/render-all`),
  },
};

export default api;