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
    
    console.log(`Request to ${config.url}, token:`, token ? 'Found token' : 'No token');
    
    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Added Authorization header with token');
    } else {
      // Log warning only for authenticated endpoints (not login/register)
      const isAuthEndpoint = config.url && !['/auth/login', '/auth/register'].includes(config.url);
      
      if (isAuthEndpoint) {
        console.warn(`No authentication token available for request to ${config.url}`);
      }
    }
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log('Request headers:', config.headers);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.status} ${response.config.url}`);
      console.log('Response data:', response.data);
    }
    return response;
  },
  (error) => {
    // Handle authentication errors
    if (error.response) {
      console.error(`API Error ${error.response.status}:`, error.response.data);
      
      if (error.response.status === 401) {
        // If we get a 401 response, the token might be invalid or expired
        console.warn('Unauthorized access - clearing token');
        localStorage.removeItem('token');
        
        // Redirect to login page if not already there
        if (window.location.pathname !== '/login') {
          console.log('Redirecting to login page...');
          window.location.href = '/login';
        }
      } else if (error.response.status === 403) {
        console.error('Forbidden access - permissions issue:', error.response.data);
      }
    } else {
      // Network error or other issue
      console.error('API Error (non-response):', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Define the API client interface types
interface AssetAPI {
  getAll: (filters?: Record<string, any>) => Promise<AxiosResponse>;
  getById: (id: string) => Promise<AxiosResponse>;
  upload: (formData: FormData) => Promise<AxiosResponse>;
  update: (id: string, data: Record<string, any>) => Promise<AxiosResponse>;
  delete: (id: string) => Promise<AxiosResponse>;
  search: (query: string, filters?: Record<string, any>) => Promise<AxiosResponse>;
  getTags: () => Promise<AxiosResponse>;
  generateAssetLabel: (assetType: string, projectData?: Record<string, any>) => Promise<AxiosResponse>;
  updateFavourite: (id: string, isFavourite: boolean) => Promise<AxiosResponse>;
  download: (id: string) => Promise<AxiosResponse>;
}

interface CampaignAPI {
  getAll: (filters?: Record<string, any>) => Promise<AxiosResponse>;
  getById: (id: string) => Promise<AxiosResponse>;
  create: (data: Record<string, any>) => Promise<AxiosResponse>;
  update: (id: string, data: Record<string, any>) => Promise<AxiosResponse>;
  delete: (id: string) => Promise<AxiosResponse>;
  getActivities: (id: string) => Promise<AxiosResponse>;
  addExecution: (id: string, data: Record<string, any>) => Promise<AxiosResponse>;
}

interface CopyRequestType {
  motivationIds: string[];
  tone: string;
  style: string;
  frameCount: number;
  length: "short" | "medium" | "long";
  includeCallToAction: boolean;
  callToActionText?: string;
}

interface BriefDataType {
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
}

interface MotivationType {
  id: string;
  title: string;
  description: string;
  explanation: string;
  selected: boolean;
}

interface LLMAPI {
  processBrief: (briefData: Record<string, any>) => Promise<AxiosResponse>;
  generateMotivations: (briefData: Record<string, any>) => Promise<AxiosResponse>;
  generateCopy: (
    copyRequest: CopyRequestType,
    briefData: BriefDataType,
    motivations: MotivationType[]
  ) => Promise<AxiosResponse>;
  parseBrief: (briefData: Record<string, any>) => Promise<AxiosResponse>;
  regenerateMotivations: (
    briefData: Record<string, any>,
    feedback: string
  ) => Promise<AxiosResponse>;
}

interface StrategyAPI {
  processBrief: (formData: FormData) => Promise<AxiosResponse>;
  generateStrategy: (briefData: Record<string, any>) => Promise<AxiosResponse>;
}

interface ApiClient {
  // Allow access to Axios defaults for backwards compatibility
  defaults?: any;
  
  // Matrix methods (used for both direct access and via matrix.x)
  createMatrix: (data: Record<string, any>) => Promise<AxiosResponse>;
  getCampaignMatrices: (campaignId: string) => Promise<AxiosResponse>;
  getMatrixById: (id: string) => Promise<AxiosResponse>;
  generateCombinations: (id: string, options: Record<string, any>) => Promise<AxiosResponse>;
  renderRow: (id: string, rowId: string) => Promise<AxiosResponse>;
  toggleRowLock: (id: string, rowId: string, locked: boolean) => Promise<AxiosResponse>;
  toggleSlotLock: (id: string, slotId: string, locked: boolean) => Promise<AxiosResponse>;
  renderAll: (id: string) => Promise<AxiosResponse>;
  // Auth section
  auth: {
    login: (email: string, password: string) => Promise<AxiosResponse>;
    register: (email: string, password: string, name: string) => Promise<AxiosResponse>;
    getProfile: () => Promise<AxiosResponse>;
  };
  
  // Direct access to auth endpoints (deprecated)
  login: (email: string, password: string) => Promise<AxiosResponse>;
  register: (email: string, password: string, name: string) => Promise<AxiosResponse>;
  getProfile: () => Promise<AxiosResponse>;
  
  // Assets section
  assets: AssetAPI;
  
  // Campaigns section
  campaigns: CampaignAPI;
  
  // Templates section
  templates: {
    getAll: (filters?: Record<string, any>) => Promise<AxiosResponse>;
    getById: (id: string) => Promise<AxiosResponse>;
    getFromCreatomate: () => Promise<AxiosResponse>;
  };
  
  // Executions section
  executions: {
    getById: (id: string) => Promise<AxiosResponse>;
    update: (id: string, data: Record<string, any>) => Promise<AxiosResponse>;
    delete: (id: string) => Promise<AxiosResponse>;
  };
  
  // Creatomate section
  creatomate: {
    generateVideo: (data: Record<string, any>) => Promise<AxiosResponse>;
    generatePreview: (data: Record<string, any>) => Promise<AxiosResponse>;
    checkRenderStatus: (jobId: string) => Promise<AxiosResponse>;
    batchGenerate: (data: Record<string, any>) => Promise<AxiosResponse>;
    generatePlatformFormats: (data: Record<string, any>) => Promise<AxiosResponse>;
  };
  
  // Exports section
  exports: {
    getPlatformSpecs: () => Promise<AxiosResponse>;
    exportCampaign: (campaignId: string, data: Record<string, any>) => Promise<AxiosResponse>;
    downloadExport: (campaignId: string) => Promise<AxiosResponse>;
  };
  
  // Users section
  users: {
    getAll: () => Promise<AxiosResponse>;
    getById: (id: string) => Promise<AxiosResponse>;
    create: (data: Record<string, any>) => Promise<AxiosResponse>;
    update: (id: string, data: Record<string, any>) => Promise<AxiosResponse>;
    delete: (id: string) => Promise<AxiosResponse>;
  };
  
  // Direct access to users endpoints (deprecated)
  getAll: () => Promise<AxiosResponse>;
  getById: (id: string) => Promise<AxiosResponse>;
  create: (data: Record<string, any>) => Promise<AxiosResponse>;
  update: (id: string, data: Record<string, any>) => Promise<AxiosResponse>;
  delete: (id: string) => Promise<AxiosResponse>;
  
  // Workflow section
  workflow: {
    getTasks: (filters?: Record<string, any>) => Promise<AxiosResponse>;
    getTaskById: (id: string) => Promise<AxiosResponse>;
    createTask: (data: Record<string, any>) => Promise<AxiosResponse>;
    updateTask: (id: string, data: Record<string, any>) => Promise<AxiosResponse>;
    deleteTask: (id: string) => Promise<AxiosResponse>;
    assignTask: (id: string, userId: string) => Promise<AxiosResponse>;
    completeTask: (id: string, data?: Record<string, any>) => Promise<AxiosResponse>;
  };
  
  // Direct access to workflow endpoints (deprecated)
  getTasks: (filters?: Record<string, any>) => Promise<AxiosResponse>;
  getTaskById: (id: string) => Promise<AxiosResponse>;
  createTask: (data: Record<string, any>) => Promise<AxiosResponse>;
  updateTask: (id: string, data: Record<string, any>) => Promise<AxiosResponse>;
  deleteTask: (id: string) => Promise<AxiosResponse>;
  assignTask: (id: string, userId: string) => Promise<AxiosResponse>;
  completeTask: (id: string, data?: Record<string, any>) => Promise<AxiosResponse>;
  
  // LLM section
  llm: {
    processBrief: (briefData: Record<string, any>) => Promise<AxiosResponse>;
    generateMotivations: (briefData: Record<string, any>) => Promise<AxiosResponse>;
    generateCopy: (
      copyRequest: CopyRequestType,
      briefData: BriefDataType,
      motivations: MotivationType[]
    ) => Promise<AxiosResponse>;
    parseBrief: (briefData: Record<string, any>) => Promise<AxiosResponse>;
    regenerateMotivations: (
      briefData: Record<string, any>,
      feedback: string
    ) => Promise<AxiosResponse>;
  };
  
  // Signoff section
  signoff: {
    create: (data: Record<string, any>) => Promise<AxiosResponse>;
    getCampaignItems: (campaignId: string) => Promise<AxiosResponse>;
    getSignoffById: (id: string) => Promise<AxiosResponse>;
    updateStatus: (id: string, status: string, comments?: string) => Promise<AxiosResponse>;
    createNewVersion: (id: string, content: any, title?: string) => Promise<AxiosResponse>;
    getClientItem: (token: string) => Promise<AxiosResponse>;
    clientRespond: (token: string, status: string, comments?: string) => Promise<AxiosResponse>;
  };
  
  // Direct access to signoff endpoints (deprecated)
  getCampaignItems: (campaignId: string) => Promise<AxiosResponse>;
  getSignoffById: (id: string) => Promise<AxiosResponse>;
  updateStatus: (id: string, status: string, comments?: string) => Promise<AxiosResponse>;
  createNewVersion: (id: string, content: any, title?: string) => Promise<AxiosResponse>;
  getClientItem: (token: string) => Promise<AxiosResponse>;
  clientRespond: (token: string, status: string, comments?: string) => Promise<AxiosResponse>;
  
  // Matrix section
  matrix: {
    create: (data: Record<string, any>) => Promise<AxiosResponse>;
    getCampaignMatrices: (campaignId: string) => Promise<AxiosResponse>;
    getMatrixById: (id: string) => Promise<AxiosResponse>;
    update: (id: string, data: Record<string, any>) => Promise<AxiosResponse>;
    generateCombinations: (id: string, options: Record<string, any>) => Promise<AxiosResponse>;
    renderRow: (id: string, rowId: string) => Promise<AxiosResponse>;
    toggleRowLock: (id: string, rowId: string, locked: boolean) => Promise<AxiosResponse>;
    toggleSlotLock: (id: string, slotId: string, locked: boolean) => Promise<AxiosResponse>;
    renderAll: (id: string) => Promise<AxiosResponse>;
  };
  

  
  // Strategy section
  strategy: {
    processBrief: (formData: FormData) => Promise<AxiosResponse>;
    generateStrategy: (briefData: Record<string, any>) => Promise<AxiosResponse>;
  };
}

// Removing LegacyApiClient interface to avoid duplicate identifiers

// API wrapper functions with better TypeScript support
// Implement the ApiClient interface
const apiClient: ApiClient = {
  // Add matrix direct access methods (these will be accessed via the matrix section as well)
  createMatrix: (data: Record<string, any>): Promise<AxiosResponse> =>
    api.post('/matrix', data),
    
  getCampaignMatrices: (campaignId: string): Promise<AxiosResponse> =>
    api.get(`/matrix/campaign/${campaignId}`),
    
  getMatrixById: (id: string): Promise<AxiosResponse> =>
    api.get(`/matrix/${id}`),
    
  generateCombinations: (id: string, options: Record<string, any>): Promise<AxiosResponse> =>
    api.post(`/matrix/${id}/generate`, options),
    
  renderRow: (id: string, rowId: string): Promise<AxiosResponse> =>
    api.post(`/matrix/${id}/render/${rowId}`),
    
  toggleRowLock: (id: string, rowId: string, locked: boolean): Promise<AxiosResponse> =>
    api.post(`/matrix/${id}/lock-row/${rowId}`, { locked }),
    
  toggleSlotLock: (id: string, slotId: string, locked: boolean): Promise<AxiosResponse> =>
    api.post(`/matrix/${id}/lock-slot/${slotId}`, { locked }),
    
  renderAll: (id: string): Promise<AxiosResponse> =>
    api.post(`/matrix/${id}/render-all`),
  // Auth endpoints
  auth: {
    login: (email: string, password: string): Promise<AxiosResponse> => 
      api.post('/auth/login', { email, password }),
    
    register: (email: string, password: string, name: string): Promise<AxiosResponse> => 
      api.post('/auth/register', { email, password, name }),
    
    getProfile: (): Promise<AxiosResponse> => 
      api.get('/auth/me'),
  },

  // Direct access to auth endpoints (deprecated, use auth.x instead)
  login: (email: string, password: string): Promise<AxiosResponse> => 
    api.post('/auth/login', { email, password }),
    
  register: (email: string, password: string, name: string): Promise<AxiosResponse> => 
    api.post('/auth/register', { email, password, name }),
    
  getProfile: (): Promise<AxiosResponse> => 
    api.get('/auth/me'),
  
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
     * Search for assets by query string and optional filters
     * @param query Search query
     * @param filters Optional filters
     */
    search: (query: string, filters?: Record<string, any>): Promise<AxiosResponse> => 
      api.get('/assets/search', { params: { query, ...filters } }),
      
    /**
     * Get all available asset tags
     */
    getTags: (): Promise<AxiosResponse> => 
      api.get('/assets/tags'),
      
    /**
     * Generate a label for an asset based on its type
     * @param assetType Type of asset
     * @param projectData Optional project data for context
     */
    generateAssetLabel: (assetType: string, projectData?: Record<string, any>): Promise<AxiosResponse> => 
      api.post('/assets/generate-label', { assetType, projectData }),
    
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
      
    getActivities: (id: string): Promise<AxiosResponse> => 
      api.get(`/campaigns/${id}/activities`),
    
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
  
  // LLM endpoints
  llm: {
    /**
     * Process a client brief
     * @param briefData The client brief data
     */
    processBrief: (briefData: Record<string, any>): Promise<AxiosResponse> =>
      api.post('/llm/process-brief', briefData),
      
    /**
     * Generate motivations from brief data
     * @param briefData The brief data
     */
    generateMotivations: (briefData: Record<string, any>): Promise<AxiosResponse> =>
      api.post('/llm/generate-motivations', briefData),
      
    /**
     * Parse a client brief to generate motivations
     * @param briefData The client brief data
     */
    parseBrief: (briefData: Record<string, any>): Promise<AxiosResponse> =>
      api.post('/llm/parse-brief', briefData),
      
    /**
     * Regenerate motivations based on user feedback
     * @param briefData The original brief data
     * @param feedback User feedback for regeneration
     */
    regenerateMotivations: (
      briefData: Record<string, any>, 
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
      
    getSignoffById: (id: string): Promise<AxiosResponse> =>
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
  
  // Direct access to signoff endpoints (deprecated, use signoff.x instead)
  getCampaignItems: (campaignId: string): Promise<AxiosResponse> =>
    api.get(`/signoff/campaign/${campaignId}`),
    
  getSignoffById: (id: string): Promise<AxiosResponse> =>
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
    
  // Direct access to workflow endpoints (deprecated, use workflow.x instead)
  getTasks: (filters?: Record<string, any>): Promise<AxiosResponse> =>
    api.get('/workflow/tasks', { params: filters }),
    
  getTaskById: (id: string): Promise<AxiosResponse> =>
    api.get(`/workflow/tasks/${id}`),
    
  createTask: (data: Record<string, any>): Promise<AxiosResponse> =>
    api.post('/workflow/tasks', data),
    
  updateTask: (id: string, data: Record<string, any>): Promise<AxiosResponse> =>
    api.put(`/workflow/tasks/${id}`, data),
    
  deleteTask: (id: string): Promise<AxiosResponse> =>
    api.delete(`/workflow/tasks/${id}`),
    
  assignTask: (id: string, userId: string): Promise<AxiosResponse> =>
    api.put(`/workflow/tasks/${id}/assign`, { userId }),
    
  completeTask: (id: string, data?: Record<string, any>): Promise<AxiosResponse> =>
    api.put(`/workflow/tasks/${id}/complete`, data),
  
  // Direct access to users endpoints (deprecated, use users.x instead)
  getAll: (): Promise<AxiosResponse> => 
    api.get('/users'),
  
  getById: (id: string): Promise<AxiosResponse> => 
    api.get(`/users/${id}`),
    
  create: (data: Record<string, any>): Promise<AxiosResponse> => 
    api.post('/users', data),
  
  update: (id: string, data: Record<string, any>): Promise<AxiosResponse> => 
    api.put(`/users/${id}`, data),
  
  delete: (id: string): Promise<AxiosResponse> => 
    api.delete(`/users/${id}`),
  
  // Users endpoints
  users: {
    getAll: (): Promise<AxiosResponse> =>
      api.get('/users'),
      
    getById: (id: string): Promise<AxiosResponse> =>
      api.get(`/users/${id}`),
      
    create: (data: Record<string, any>): Promise<AxiosResponse> => 
      api.post('/users', data),
    
    update: (id: string, data: Record<string, any>): Promise<AxiosResponse> => 
      api.put(`/users/${id}`, data),
    
    delete: (id: string): Promise<AxiosResponse> => 
      api.delete(`/users/${id}`),
  },
  
  // Matrix endpoints
  matrix: {
    create: (data: Record<string, any>): Promise<AxiosResponse> =>
      api.post('/matrix', data),
      
    getCampaignMatrices: (campaignId: string): Promise<AxiosResponse> =>
      api.get(`/matrix/campaign/${campaignId}`),
      
    getMatrixById: (id: string): Promise<AxiosResponse> =>
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
  
  // Strategy endpoints
  strategy: {
    /**
     * Process a brief file and extract structured data
     * @param formData Form data containing the brief file
     */
    processBrief: (formData: FormData): Promise<AxiosResponse> => {
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      return api.post('/strategy/process-brief', formData, config);
    },

    /**
     * Generate a strategy from brief data
     * @param briefData The brief data used to generate the strategy
     */
    generateStrategy: (briefData: Record<string, any>): Promise<AxiosResponse> => 
      api.post('/strategy/generate', briefData)
  },
  
  // Workflow section
  workflow: {
    getTasks: (filters?: Record<string, any>): Promise<AxiosResponse> =>
      api.get('/workflow/tasks', { params: filters }),
      
    getTaskById: (id: string): Promise<AxiosResponse> =>
      api.get(`/workflow/tasks/${id}`),
      
    createTask: (data: Record<string, any>): Promise<AxiosResponse> =>
      api.post('/workflow/tasks', data),
      
    updateTask: (id: string, data: Record<string, any>): Promise<AxiosResponse> =>
      api.put(`/workflow/tasks/${id}`, data),
      
    deleteTask: (id: string): Promise<AxiosResponse> =>
      api.delete(`/workflow/tasks/${id}`),
      
    assignTask: (id: string, userId: string): Promise<AxiosResponse> =>
      api.put(`/workflow/tasks/${id}/assign`, { userId }),
      
    completeTask: (id: string, data?: Record<string, any>): Promise<AxiosResponse> =>
      api.put(`/workflow/tasks/${id}/complete`, data),
  },
};

// Set axios defaults to use on the api object
apiClient.defaults = api.defaults;

// Export both as default and named export for backward compatibility
export default apiClient;
export { apiClient };