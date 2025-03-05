export interface AssetMapping {
  parameterName: string;
  assetId?: string;
  value?: string;
}

export interface ExecutionSettings {
  exportFormat: string;
  quality: string;
  includeAudio: boolean;
}

export interface Execution {
  id: string;
  name: string;
  templateId: string;
  platform: string;
  assetMappings: AssetMapping[];
  settings: ExecutionSettings;
  status?: string;
  renderUrl?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  client: string;
  startDate: string | null;
  endDate: string | null;
  platforms: string[];
  assets: string[];
  templates: string[];
  executions: Execution[];
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CampaignFormData {
  name: string;
  description: string;
  client: string;
  startDate: Date | null;
  endDate: Date | null;
  platforms: string[];
  assets: string[];
  templates: string[];
  executions: Execution[];
}

export interface CampaignFilters {
  search?: string;
  client?: string;
  status?: string;
  platform?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}