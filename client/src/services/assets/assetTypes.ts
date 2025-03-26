// Asset related types
export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'text';

// Asset object from the API
export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  thumbnail_url?: string;
  favourite?: boolean; // UK English spelling
  meta?: {
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
    tags?: string[];
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  status?: 'ready' | 'processing' | 'error';
  client_id?: string;
}

// Filters for querying assets
export interface AssetFilters {
  type?: AssetType | 'all';
  search?: string;
  favourite?: boolean; // UK English spelling
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  clientId?: string;
  client_id?: string;
  limit?: number;
  offset?: number;
}

// Upload asset request
export interface AssetUploadRequest {
  file: File;
  name?: string;
  type?: AssetType;
  clientId: string;
  meta?: Record<string, any>;
}

// Response from asset operations
export interface AssetOperationResult {
  success: boolean;
  message?: string;
  asset?: Asset;
}
