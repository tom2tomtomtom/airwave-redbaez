/**
 * Asset type definitions
 */
export type AssetType = 'image' | 'video' | 'audio' | 'text';

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
  isFavourite?: boolean;
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
  dateRange?: {
    from: string;
    to: string;
  };
  limit?: number;
  offset?: number;
}
