/**
 * Base Service Interface
 * Defines the common structure and methods that all services should implement
 */
export interface BaseService {
  // Common service methods
  initialize(): Promise<void>;
  healthCheck(): Promise<boolean>;
  getStatus(): Promise<ServiceStatus>;
}

/**
 * Service Status Interface
 * Standardizes status reporting across all services
 */
export interface ServiceStatus {
  isAvailable: boolean;
  lastChecked: Date;
  errors?: string[];
  metrics?: Record<string, unknown>;
}

/**
 * External API Service Interface
 * Extends BaseService with methods specific to external API integrations
 */
export interface ExternalApiService extends BaseService {
  // External API specific methods
  testConnection(): Promise<boolean>;
  getApiKey(): string | null;
  hasValidCredentials(): boolean;
}

/**
 * Asset Service Interface
 * Defines the contract for all asset-related services
 */
export interface AssetService extends BaseService {
  // Asset-specific methods
  createAsset(data: AssetCreateParams): Promise<Asset>;
  getAsset(id: string): Promise<Asset | null>;
  updateAsset(id: string, data: Partial<AssetUpdateParams>): Promise<Asset>;
  deleteAsset(id: string): Promise<boolean>;
  listAssets(params: AssetListParams): Promise<AssetListResult>;
}

/**
 * Media Processing Service Interface
 * Defines the contract for services that process media
 */
export interface MediaProcessingService extends ExternalApiService {
  // Media processing methods
  processMedia(input: MediaInput): Promise<MediaOutput>;
  cancelProcessing(jobId: string): Promise<boolean>;
  getProcessingStatus(jobId: string): Promise<MediaProcessingStatus>;
}

/**
 * Common type definitions for services
 */
export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetCreateParams {
  name: string;
  type: AssetType;
  content?: Buffer | string;
  metadata?: Record<string, unknown>;
}

export interface AssetUpdateParams {
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface AssetListParams {
  type?: AssetType;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
}

export interface AssetListResult {
  items: Asset[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface MediaInput {
  source: string | Buffer;
  options?: Record<string, unknown>;
}

export interface MediaOutput {
  result: string | Buffer;
  metadata?: Record<string, unknown>;
  jobId?: string;
}

export type MediaProcessingStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';
