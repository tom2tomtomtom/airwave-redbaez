export interface TemplateParameter {
  name: string;
  description: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'color' | 'number' | 'boolean';
  default?: any;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
}

export interface TemplateRequirement {
  type: 'image' | 'video' | 'audio' | 'text';
  description: string;
  specs?: string;
  required?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  format: 'square' | 'portrait' | 'landscape' | 'story';
  thumbnailUrl: string;
  previewUrl: string;
  duration?: string;
  platforms: string[];
  parameters?: TemplateParameter[];
  requirements?: TemplateRequirement[];
  creatomateTemplateId: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  client_id?: string; // Associated client ID
}

export interface TemplateFilters {
  search?: string;
  format?: string;
  platform?: string;
  favorites?: boolean;
  client_id?: string;
}
