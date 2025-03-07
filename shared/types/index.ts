// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

// Asset types
export type AssetType = 'image' | 'video' | 'audio' | 'text';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url?: string;
  thumbnailUrl?: string;
  content?: string;
  description?: string;
  tags: string[];
  metadata: AssetMetadata;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  isFavorite?: boolean;
}

export interface AssetMetadata {
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  format?: string;
}

// Template types
export type TemplateFormat = 'square' | 'portrait' | 'landscape' | 'widescreen';

export interface Template {
  id: string;
  name: string;
  description: string;
  format: TemplateFormat;
  thumbnailUrl: string;
  platforms: string[];
  createdAt: string;
  updatedAt?: string;
  creatomateTemplateId?: string;
  slots: TemplateSlot[];
}

export interface TemplateSlot {
  id: string;
  name: string;
  type: AssetType;
  required: boolean;
  description?: string;
  defaultValue?: string;
  position?: number;
}

// Campaign types
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  client?: string;
  status: CampaignStatus;
  platforms: string[];
  createdAt: string;
  updatedAt?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  executions: Execution[];
}

// Execution types
export type ExecutionStatus = 'draft' | 'rendering' | 'completed' | 'failed';

export interface Execution {
  id: string;
  name: string;
  campaignId: string;
  templateId: string;
  status: ExecutionStatus;
  url?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt?: string;
  assets: ExecutionAsset[];
  renderJobId?: string;
  platform?: string;
  format?: string;
}

export interface ExecutionAsset {
  slotId: string;
  assetId: string;
  settings?: Record<string, any>;
}

// Export types
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Export {
  id: string;
  executionId: string;
  platform: string;
  status: ExportStatus;
  url?: string;
  createdAt: string;
  completedAt?: string;
  settings?: Record<string, any>;
  format: string;
  fileSize?: number;
}

// Platform specifications
export interface PlatformSpec {
  id: string;
  name: string;
  formats: PlatformFormat[];
}

export interface PlatformFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  maxDuration?: number;
  maxFileSize?: number;
  recommendedFileTypes: string[];
}

// API response type
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}