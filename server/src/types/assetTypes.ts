/**
 * Asset Management System Type Definitions
 * Comprehensive typings for all asset service operations
 */
import { Asset as SharedAsset } from './shared';

/**
 * Asset interface for application-level representation
 * Extends the shared Asset interface with additional fields
 */
export interface Asset extends SharedAsset {
  // Additional application-specific properties
  processingStatus?: 'pending' | 'processing' | 'complete' | 'failed';
  categories?: string[];
  alternativeText?: string;
  expiresAt?: string;
  fileExtension?: string;
}

/**
 * Database asset representation
 * Used for storage and retrieval operations
 */
export interface DbAsset {
  id: string;
  name: string;
  description?: string;
  file_path: string;
  thumbnail_path?: string;
  type: string; // image, video, audio, document
  mime_type: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  client_id: string;
  owner_id: string;
  tags?: string[];
  categories?: string[];
  is_favourite: boolean;
  status: string;
  alternative_text?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
}

/**
 * Comprehensive filtering options for asset queries
 */
export interface AssetFilters {
  clientId?: string;
  client_id?: string; // Alternate format for backwards compatibility
  type?: string;
  search?: string;
  tags?: string[];
  categories?: string[];
  favourite?: boolean;
  ownerId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeExpired?: boolean;
}

/**
 * Standardised response format for all service operations
 */
export interface ServiceResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

/**
 * Asset upload options
 */
export interface AssetUploadOptions {
  name?: string;
  description?: string;
  tags?: string[];
  categories?: string[];
  alternativeText?: string;
  clientId: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

/**
 * Metadata for different asset types
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  colourSpace?: string;
  hasAlpha?: boolean;
  orientation?: number;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  codec?: string;
  fps?: number;
  bitrate?: number;
}

export interface AudioMetadata {
  duration: number;
  codec?: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}

export interface DocumentMetadata {
  pageCount?: number;
  wordCount?: number;
  author?: string;
  creationDate?: string;
  modificationDate?: string;
}

/**
 * Asset processor interface for dependency injection
 */
export interface AssetProcessor {
  processAsset(file: Express.Multer.File, options: AssetUploadOptions): Promise<ServiceResult<Asset>>;
  generateThumbnail(file: Express.Multer.File, assetType: string): Promise<string | undefined>;
  extractMetadata(file: Express.Multer.File, assetType: string): Promise<Record<string, any>>;
}

/**
 * Asset repository interface for storage abstraction
 */
export interface AssetRepository {
  findAll(filters: AssetFilters): Promise<ServiceResult<Asset[]>>;
  findById(id: string, clientId: string): Promise<ServiceResult<Asset>>;
  create(asset: Partial<Asset>): Promise<ServiceResult<Asset>>;
  update(id: string, clientId: string, updates: Partial<Asset>): Promise<ServiceResult<Asset>>;
  delete(id: string, clientId: string): Promise<ServiceResult<boolean>>;
  toggleFavourite(id: string, clientId: string, isFavourite: boolean): Promise<ServiceResult<Asset>>;
  batchUpdate(ids: string[], clientId: string, updates: Partial<Asset>): Promise<ServiceResult<number>>;
}

/**
 * Asset cache interface
 */
export interface AssetCache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

/**
 * Asset service interface
 */
export interface IAssetService {
  getAssets(filters: AssetFilters): Promise<ServiceResult<Asset[]>>;
  getAssetById(id: string, clientId: string): Promise<ServiceResult<Asset>>;
  uploadAsset(file: Express.Multer.File, userId: string, options: AssetUploadOptions): Promise<ServiceResult<Asset>>;
  updateAsset(id: string, clientId: string, updates: Partial<Asset>): Promise<ServiceResult<Asset>>;
  deleteAsset(id: string, clientId: string): Promise<ServiceResult<boolean>>;
  toggleFavourite(id: string, clientId: string, isFavourite: boolean): Promise<ServiceResult<Asset>>;
  batchUpdateAssets(ids: string[], clientId: string, updates: Partial<Asset>): Promise<ServiceResult<number>>;
  isSupabaseConfigured(): boolean;
  searchAssets(searchTerm: string, clientId: string, filters?: Partial<AssetFilters>): Promise<ServiceResult<Asset[]>>;
  getAssetsByTags(tags: string[], clientId: string, filters?: Partial<AssetFilters>): Promise<ServiceResult<Asset[]>>;
}
