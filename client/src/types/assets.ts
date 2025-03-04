export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'text';
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
  isFavorite?: boolean;
}

export interface AssetFormData {
  name: string;
  type: 'image' | 'video' | 'audio' | 'text';
  description?: string;
  tags?: string[];
  content?: string;
  file?: File;
}

export interface AssetFilters {
  search?: string;
  type?: 'image' | 'video' | 'audio' | 'text' | 'all';
  tags?: string[];
  favorites?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}
