/**
 * Type definitions for API interactions
 */

// Common API response type
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
}

// Sorting parameters
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Campaign types
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  organisation_id: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  target_audience?: string;
  tags?: string[];
}

export interface CampaignCreateData {
  name: string;
  description?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  start_date?: string;
  end_date?: string;
  budget?: number;
  target_audience?: string;
  tags?: string[];
}

// Asset types
export interface Asset {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  type: 'image' | 'video' | 'audio' | 'document';
  url?: string;
  thumbnail_url?: string;
  owner_id: string;
  organisation_id: string;
  created_at: string;
  updated_at?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  metadata?: AssetMetadata;
  tags?: string[];
}

export interface AssetMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  title?: string;
  description?: string;
  alt_text?: string;
  campaign_id?: string;
  [key: string]: any; // For any additional custom metadata
}

export interface AssetFilters {
  type?: string;
  campaign_id?: string;
  search?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
}

// Approval types
export interface ApprovalRequest {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: string;
  approved_by?: string;
  organisation_id: string;
  campaign_id?: string;
  asset_id?: string;
  created_at: string;
  updated_at?: string;
  due_date?: string;
  notes?: string;
}

export interface ApprovalCreateData {
  title: string;
  description?: string;
  campaign_id?: string;
  asset_id?: string;
  due_date?: string;
  notes?: string;
}

// Export types
export interface ExportJob {
  id: string;
  campaign_id: string;
  asset_id: string;
  platform: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  download_url?: string;
  file_size?: number;
  specs?: ExportSpecs;
  error_message?: string;
}

export interface ExportSpecs {
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  quality?: number;
  max_duration?: number;
  [key: string]: any; // For platform-specific settings
}

export interface PlatformSpec {
  id: string;
  name: string;
  icon?: string;
  dimensions: {
    width: number;
    height: number;
  };
  aspect_ratio: string;
  format: string;
  max_file_size?: number;
  max_duration?: number;
  recommended_specs?: Record<string, any>;
}
