export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface AnalysisResults {
  tone_recommendations: string[];
  key_themes: string[];
  content_suggestions: string[];
  improvement_areas: string[];
}

export interface OrganisationSettings {
  maxFileSize: number;
  allowedFileTypes: string[];
  rateLimits: {
    uploads: number;
    interval: number;
  };
  brandGuidelines: {
    colours: string[];
    typography: {
      primaryFont: string;
      secondaryFont: string;
    };
    tone: string;
  };
}

export interface Organisation {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  settings: OrganisationSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  notifications: {
    email: boolean;
    inApp: boolean;
  };
  language: 'en-GB';
}

export interface User {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  organisation_id: string;
  settings: UserSettings;
}

export interface OrganisationMember {
  id: string;
  created_at: string;
  updated_at: string;
  organisation_id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'user';
  is_active: boolean;
}

export interface Asset {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  type: string;
  size: number;
  url: string;
  organisation_id: string;
  created_by: string;
  updated_by: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
  };
  tags: string[];
}

export interface AuditLog {
  id: string;
  created_at: string;
  operation_id: string;
  table_name: string;
  record_id: string;
  operation_type: 'INSERT' | 'UPDATE' | 'DELETE' | 'ACCESS_DENIED';
  user_id: string;
  organisation_id: string;
  old_data: Json | null;
  new_data: Json | null;
  ip_address: string;
  user_agent: string;
}

export interface BriefRow {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  content: string;
  campaign_objectives: string;
  target_audience: string;
  key_messages: string;
  visual_preferences: string | null;
  tags: string[];
  organisation_id: string;
  status: 'draft' | 'analysing' | 'ready' | 'archived';
  analysis_results: AnalysisResults | null;
  created_by: string;
  updated_by: string;
}

export type Brief = BriefRow;

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: Organisation;
        Insert: Omit<Organisation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organisation, 'id' | 'created_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      organisation_members: {
        Row: OrganisationMember;
        Insert: Omit<OrganisationMember, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<OrganisationMember, 'id' | 'created_at'>>;
      };
      assets: {
        Row: Asset;
        Insert: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'url'>;
        Update: Partial<Omit<Asset, 'id' | 'created_at' | 'organisation_id' | 'created_by'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: never; // Audit logs are immutable
      };
      briefs: {
        Row: BriefRow;
        Insert: Omit<BriefRow, 'id' | 'created_at' | 'updated_at' | 'status' | 'analysis_results'>;
        Update: Partial<Omit<BriefRow, 'id' | 'created_at' | 'organisation_id' | 'created_by'>>;
      };
    };
    Views: {
      active_organisation_members: {
        Row: {
          user_id: string;
          organisation_id: string;
          role: 'admin' | 'manager' | 'user';
          email: string;
          name: string;
        };
      };
    };
    Functions: {
      check_rate_limit: {
        Args: {
          p_organisation_id: string;
          p_action: string;
          p_limit: number;
          p_window: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'admin' | 'manager' | 'user';
      asset_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'video/mp4' | 'video/quicktime';
    };
  };
}
