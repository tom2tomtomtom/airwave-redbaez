/**
 * Asset types and interfaces
 */

// Asset types - all lowercase for consistency
export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'text';

/**
 * Asset metadata interface
 */
export interface AssetMetadata {
  // Dimensions for images and videos
  width?: number;
  height?: number;
  
  // Duration for audio and video in seconds
  duration?: number;
  
  // File size in bytes
  size?: number;
  
  // Tags for asset categorisation
  tags?: string[];
  
  // Original filename before processing
  originalFilename?: string;
  
  // MIME type
  mimeType?: string;
  
  // Additional metadata as key-value pairs
  [key: string]: any;
}

/**
 * Asset interface - consistent property naming
 */
export interface Asset {
  // Core properties
  id: string;
  name: string;
  type: AssetType;
  url: string;
  thumbnailUrl?: string;
  favourite?: boolean; // UK English spelling as per user rules
  
  // Metadata
  metadata?: AssetMetadata;
  
  // Dates - ISO format strings
  createdAt: string;
  updatedAt: string;
  
  // Client relationship
  clientId: string;
  
  // Asset status
  status?: 'ready' | 'processing' | 'error';
  
  // Optional description
  description?: string;
}

/**
 * Asset filters for searching and filtering assets
 */
export interface AssetFilters {
  // Type filter - 'all' or specific type
  type?: AssetType | 'all';
  
  // Text search 
  search?: string;
  
  // Favourite filter
  favourite?: boolean; // UK English spelling as per user rules
  
  // Sorting
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'size' | string;
  sortDirection?: 'asc' | 'desc';
  
  // Client filter
  clientId?: string;
  
  // Pagination
  limit?: number;
  offset?: number;
  page?: number;
}

/**
 * Asset creation request
 */
export interface CreateAssetRequest {
  name: string;
  type: AssetType;
  file: File;
  clientId: string;
  metadata?: Partial<AssetMetadata>;
  description?: string;
}

/**
 * Asset update request
 */
export interface UpdateAssetRequest {
  name?: string;
  description?: string;
  favourite?: boolean; // UK English spelling as per user rules
  metadata?: Partial<AssetMetadata>;
}

/**
 * Asset response format
 */
export interface AssetResponse {
  success: boolean;
  message?: string;
  asset?: Asset;
}

/**
 * Assets list response format
 */
export interface AssetsListResponse {
  success: boolean;
  message?: string;
  assets: Asset[];
  total?: number;
  page?: number;
  limit?: number;
}
