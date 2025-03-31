import { supabase } from '../supabaseClient';
import { security } from './security';
import { monitoring } from './monitoring';
import { caching } from './caching';
import { AppError } from '../utils/errorHandling';
import { ErrorCode } from '../utils/errorTypes';
import {
  ApiResponse,
  PaginationParams,
  SortParams,
  Campaign,
  CampaignCreateData,
  Asset,
  AssetMetadata,
  AssetFilters,
  ApprovalRequest,
  ApprovalCreateData,
  ExportJob,
  ExportSpecs,
  PlatformSpec
} from '../types/api.types';

class ApiService {
  private static instance: ApiService;
  private readonly BASE_URL = process.env.REACT_APP_API_URL;
  private readonly DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
  };

  private constructor() {}

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryConfig?: {
      maxRetries?: number;
      initialDelay?: number;
      currentAttempt?: number;
    }
  ): Promise<ApiResponse<T>> {
    // Initialize retry configuration
    const maxRetries = retryConfig?.maxRetries || 3;
    const initialDelay = retryConfig?.initialDelay || 1000;
    const currentAttempt = retryConfig?.currentAttempt || 1;
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw new AppError({
          message: `Authentication error: ${error.message}`,
          code: ErrorCode.INVALID_TOKEN,
          statusCode: 401,
          context: { error }
        });
      }
      
      if (!data.session) {
        throw new AppError({
          message: 'No active session',
          code: ErrorCode.SESSION_EXPIRED,
          statusCode: 401
        });
      }
      
      const session = data.session;

      const headers = new Headers(this.DEFAULT_HEADERS);
      headers.append('Authorization', `Bearer ${session.access_token}`);

      try {
        // Track request start time for telemetry
        const startTime = performance.now();
        
        const response = await fetch(`${this.BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
        
        // Track request duration
        const duration = performance.now() - startTime;
        
        // Log successful requests for telemetry
        if (response.ok) {
          monitoring.logInfo('API request successful', {
            endpoint,
            method: options.method || 'GET',
            status: response.status,
            duration
          });
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new AppError({
            message: errorData.message || `HTTP error! status: ${response.status}`,
            code: errorData.code || this.mapStatusCodeToErrorCode(response.status),
            statusCode: response.status,
            context: { errorData, endpoint, method: options.method || 'GET' }
          });
        }

        const responseData = await response.json();
        return { data: responseData, status: response.status };
      } catch (fetchError) {
        // Handle network errors
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          throw new AppError({
            message: 'Network connection issue',
            code: ErrorCode.NETWORK_UNAVAILABLE,
            context: { originalError: fetchError.message },
            isRetryable: true
          });
        }
        throw fetchError;
      }
    } catch (error) {
      // Handle the error with proper logging and retry logic
      const appError = error instanceof AppError 
        ? error 
        : new AppError({
            message: (error as Error).message,
            code: ErrorCode.UNKNOWN_ERROR,
            statusCode: 500,
            context: { originalError: error }
          });
      
      // Log error with monitoring service
      monitoring.logError(appError, {
        action: 'apiRequest',
        context: { 
          endpoint, 
          options,
          attempt: currentAttempt,
          maxRetries
        },
      });
      
      // Determine if we should retry the request
      if (appError.shouldRetry() && currentAttempt < maxRetries) {
        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(2, currentAttempt - 1);
        
        // Log retry attempt
        monitoring.logInfo('Retrying failed request', {
          endpoint,
          attempt: currentAttempt,
          maxRetries,
          delay
        });
        
        // Wait for the calculated delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increment retry count on the error object
        appError.incrementRetryCount();
        
        // Retry the request
        return this.request<T>(endpoint, options, {
          maxRetries,
          initialDelay,
          currentAttempt: currentAttempt + 1
        });
      }
      
      // No more retries or not retryable, return error response
      return {
        error: appError.userMessage,
        status: appError.statusCode || 500,
      };
    }
  }
  
  // Map HTTP status codes to our error codes
  private mapStatusCodeToErrorCode(status: number): string {
    switch (status) {
      case 400: return ErrorCode.VALIDATION_FAILED;
      case 401: return ErrorCode.NOT_AUTHENTICATED;
      case 403: return ErrorCode.INSUFFICIENT_PERMISSIONS;
      case 404: return ErrorCode.RESOURCE_NOT_FOUND;
      case 409: return ErrorCode.RESOURCE_ALREADY_EXISTS;
      case 408: return ErrorCode.REQUEST_TIMEOUT;
      case 429: return ErrorCode.REQUEST_TIMEOUT; // Too many requests
      case 500: return ErrorCode.INTERNAL_SERVER_ERROR;
      case 502: return ErrorCode.EXTERNAL_SERVICE_ERROR;
      case 503: return ErrorCode.SERVICE_UNAVAILABLE;
      case 504: return ErrorCode.REQUEST_TIMEOUT; // Gateway timeout
      default: return ErrorCode.UNKNOWN_ERROR;
    }
  }

  /**
   * Performs a GET request to the specified endpoint
   * 
   * @param endpoint The API endpoint to request
   * @param options Additional request options
   * @returns Promise resolving to the API response
   */
  public async get<T>(endpoint: string, options: { params?: Record<string, any> } = {}): Promise<ApiResponse<T>> {
    const queryParams = options.params ? new URLSearchParams(this.prepareParams(options.params)).toString() : '';
    const url = queryParams ? `${endpoint}?${queryParams}` : endpoint;
    
    return this.request<T>(url, {
      method: 'GET',
    });
  }
  
  /**
   * Performs a POST request to the specified endpoint
   * 
   * @param endpoint The API endpoint to request
   * @param data The data to send in the request body
   * @param options Additional request options
   * @returns Promise resolving to the API response
   */
  public async post<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }
  
  /**
   * Prepares parameters for URL encoding by removing undefined values
   */
  private prepareParams(params: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null) {
        result[key] = String(params[key]);
      }
    }
    
    return result;
  }

  public async getCampaigns(
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<ApiResponse<Campaign[]>> {
    // Safely access organisationId with error handling
  let organisationId: string;
  try {
    const orgId = security.getOrganisationId();
    if (!orgId) {
      throw new Error('Organisation ID not found in security context');
    }
    organisationId = orgId;
  } catch (error) {
    throw new Error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
    const cacheKey = `campaigns:${JSON.stringify({ pagination, sort })}`;

    try {
      return await caching.get(cacheKey, async () => {
        let query = supabase
          .from('campaigns')
          .select('*')
          .eq('organisation_id', organisationId);

        if (sort) {
          query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        }

        if (pagination) {
          const { page, limit } = pagination;
          const start = (page - 1) * limit;
          const end = start + limit - 1;
          query = query.range(start, end);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { data, status: 200 };
      }, { organisationId });
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'getCampaigns',
        context: { pagination, sort },
      });
      return { error: (error as Error).message, status: 500 };
    }
  }

  public async createCampaign(campaignData: CampaignCreateData): Promise<ApiResponse<Campaign>> {
    // Safely access organisationId with error handling
  let organisationId;
  try {
    organisationId = security.getOrganisationId();
    if (!organisationId) {
      throw new Error('Organisation ID not found in security context');
    }
  } catch (error) {
    throw new Error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

    try {
      // Sanitise input
      const sanitisedData = security.sanitiseObject(campaignData);

      // Validate rate limit
      const canProceed = await security.enforceRateLimit('create_campaign', 10, 3600);
      if (!canProceed) {
        throw new Error('Rate limit exceeded for campaign creation');
      }

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...sanitisedData,
          organisation_id: organisationId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidate campaigns cache
      caching.invalidateByPrefix('campaigns:', organisationId);

      monitoring.logInfo('Campaign created', {
        action: 'createCampaign',
        context: { campaignId: data.id },
      });

      return { data, status: 201 };
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'createCampaign',
        context: { campaignData },
      });
      return { error: (error as Error).message, status: 500 };
    }
  }

  public async uploadAsset(file: File, metadata: AssetMetadata): Promise<ApiResponse<Asset>> {
    try {
      // Validate file
      await security.validateAsset({
        size: file.size,
        type: file.type,
        name: file.name,
      });

      // Create asset record
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert({
          ...security.sanitiseObject(metadata),
          organisation_id: security.getOrganisationId(),
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          status: 'uploading',
        })
        .select()
        .single();

      if (assetError) throw assetError;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(`${asset.id}/${file.name}`, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Update asset status
      const { data: updatedAsset, error: updateError } = await supabase
        .from('assets')
        .update({ status: 'ready' })
        .eq('id', asset.id)
        .select()
        .single();

      if (updateError) throw updateError;

      monitoring.logInfo('Asset uploaded', {
        action: 'uploadAsset',
        context: { assetId: asset.id, fileName: file.name },
      });

      return { data: updatedAsset, status: 201 };
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'uploadAsset',
        context: { fileName: file.name, fileType: file.type },
      });
      return { error: (error as Error).message, status: 500 };
    }
  }

  public async submitForApproval(
    campaignId: string,
    approvalData: ApprovalCreateData
  ): Promise<ApiResponse<ApprovalRequest>> {
    try {
      // Validate campaign access
      const hasAccess = await security.validateCampaignAccess(campaignId);
      if (!hasAccess) {
        throw new Error('Unauthorised access to campaign');
      }

      // Validate rate limit
      const canProceed = await security.enforceRateLimit('submit_approval', 5, 3600);
      if (!canProceed) {
        throw new Error('Rate limit exceeded for approval submissions');
      }

      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          ...security.sanitiseObject(approvalData),
          campaign_id: campaignId,
          organisation_id: security.getOrganisationId(),
          status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      monitoring.logInfo('Approval request submitted', {
        action: 'submitForApproval',
        context: { campaignId, approvalId: data.id },
      });

      return { data, status: 201 };
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'submitForApproval',
        context: { campaignId, approvalData },
      });
      return { error: (error as Error).message, status: 500 };
    }
  }

  public async exportCampaign(
    campaignId: string,
    platform: string,
    options: ExportSpecs
  ): Promise<ApiResponse<ExportJob>> {
    try {
      // Validate export permissions
      const canExport = await security.validateExportPermissions(campaignId, platform);
      if (!canExport) {
        throw new Error('Unauthorised export attempt');
      }

      // Validate rate limit
      const canProceed = await security.enforceRateLimit('export_campaign', 3, 3600);
      if (!canProceed) {
        throw new Error('Rate limit exceeded for campaign exports');
      }

      const { data, error } = await supabase
        .from('export_jobs')
        .insert({
          campaign_id: campaignId,
          organisation_id: security.getOrganisationId(),
          platform,
          options: security.sanitiseObject(options),
          status: 'queued',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      monitoring.logInfo('Campaign export initiated', {
        action: 'exportCampaign',
        context: { campaignId, platform, jobId: data.id },
      });

      return { data, status: 201 };
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'exportCampaign',
        context: { campaignId, platform, options },
      });
      return { error: (error as Error).message, status: 500 };
    }
  }

  public async getExportStatus(jobId: string): Promise<ApiResponse<ExportJob>> {
    try {
      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('organisation_id', security.getOrganisationId())
        .single();

      if (error) throw error;

      return { data, status: 200 };
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'getExportStatus',
        context: { jobId },
      });
      return { error: (error as Error).message, status: 500 };
    }
  }
}

export const api = ApiService.getInstance();
