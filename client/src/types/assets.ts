/**
 * Asset type definitions
 */
export type AssetType = 'image' | 'video' | 'audio' | 'text';

/**
 * Asset status types
 */
export type AssetStatus = 'ready' | 'processing' | 'error';

/**
 * Asset interface defining the structure of asset objects
 */
export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url?: string;
  thumbnailUrl?: string;
  content?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  ownerId: string;
  clientSlug: string;    // Primary client identifier
  clientId?: string;     // Legacy field, optional for backward compatibility
  isFavourite?: boolean;  // UK spelling
  isFavorite?: boolean;   // US spelling to ensure compatibility with all API responses
  status?: AssetStatus;  // Processing status of the asset
}

/**
 * Form data for creating or updating assets
 */
export interface AssetFormData {
  name: string;
  type: AssetType;
  description?: string;
  tags?: string[];
  content?: string;
  file?: File;
  clientSlug: string;    // Primary client identifier
  clientId?: string;     // Legacy support
}

/**
 * Asset filters for searching and filtering assets
 */
export interface AssetFilters {
  search?: string;
  type?: AssetType | 'all';
  tags?: string[];
  favourite?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  clientSlug?: string;    // Primary identifier for client filtering
  clientId?: string;      // Legacy support, will be phased out
  dateRange?: {
    from: string;
    to: string;
  };
  limit?: number;
  offset?: number;
  _timestamp?: number; // Cache-busting timestamp
  [key: string]: any; // Allow for other custom properties
}
