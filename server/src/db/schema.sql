-- This file defines the database schema for AIrWAVE using Supabase
-- Run this in the Supabase SQL editor to set up your tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (in addition to Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients Table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Assets Table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'video', 'image', 'voiceover', 'copy'
  file_path TEXT,
  file_url TEXT,
  file_size INTEGER,
  duration FLOAT, -- For video/audio
  dimensions TEXT, -- For images/videos
  format TEXT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Templates Table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id),
  platforms TEXT[],
  aspect_ratios TEXT[],
  thumbnail_url TEXT,
  creatomate_template_id TEXT NOT NULL,
  category TEXT,
  structure JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Campaigns Table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  platforms TEXT[],
  budget FLOAT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Campaign Executions Table
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID REFERENCES templates(id),
  platform TEXT NOT NULL,
  format TEXT NOT NULL, -- aspect ratio
  asset_mappings JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  output_url TEXT,
  preview_url TEXT,
  creatomate_render_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Exports Table
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  format TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Set up RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Read access policies
CREATE POLICY "Profiles are viewable by authenticated users" 
ON profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Clients are viewable by authenticated users" 
ON clients FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Assets are viewable by authenticated users" 
ON assets FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Templates are viewable by authenticated users" 
ON templates FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Campaigns are viewable by authenticated users" 
ON campaigns FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Executions are viewable by authenticated users" 
ON executions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Exports are viewable by authenticated users" 
ON exports FOR SELECT USING (auth.role() = 'authenticated');

-- Create write policies (simplified - in production you'd want more granular control)
CREATE POLICY "Profiles can be edited by the user themselves" 
ON profiles FOR UPDATE USING (auth.uid() = id);

-- This lets the server service role handle inserts/updates
CREATE POLICY "Service role can do everything" 
ON profiles FOR ALL USING (auth.uid() = '00000000-0000-0000-0000-000000000000');

-- Create indexes for performance
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX idx_executions_campaign_id ON executions(campaign_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_exports_execution_id ON exports(execution_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_assets_updated_at
BEFORE UPDATE ON assets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_templates_updated_at
BEFORE UPDATE ON templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_executions_updated_at
BEFORE UPDATE ON executions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_exports_updated_at
BEFORE UPDATE ON exports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();