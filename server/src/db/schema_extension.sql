-- Schema extensions for AIrWAVE Strategy & Copy Generation Flow
-- These tables support the LLM-based workflow for strategy development and copy generation

-- Table for storing client briefs
CREATE TABLE IF NOT EXISTS briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  campaign_id UUID REFERENCES campaigns(id),
  client_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  product_description TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  competitive_context TEXT,
  campaign_objectives TEXT NOT NULL,
  key_messages TEXT,
  mandatories TEXT,
  additional_info TEXT,
  tone_preference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing generated motivations
CREATE TABLE IF NOT EXISTS motivations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  explanation TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing generated copy variations
CREATE TABLE IF NOT EXISTS copy_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id),
  tone TEXT NOT NULL,
  style TEXT NOT NULL,
  frames JSONB NOT NULL, -- Array of copy texts for each frame
  call_to_action TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing client sign-off status
CREATE TABLE IF NOT EXISTS sign_offs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  brief_id UUID NOT NULL REFERENCES briefs(id),
  selected_motivations JSONB NOT NULL, -- Array of selected motivation objects
  selected_copy JSONB NOT NULL, -- Selected copy variation
  status TEXT NOT NULL DEFAULT 'pending',
  client_email TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing sign-off versions
CREATE TABLE IF NOT EXISTS sign_off_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sign_off_id UUID NOT NULL REFERENCES sign_offs(id),
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL, -- Contains both motivations and copy
  is_latest BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing email notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sign_off_id UUID NOT NULL REFERENCES sign_offs(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing LLM integration logs
CREATE TABLE IF NOT EXISTS brief_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_data JSONB NOT NULL,
  user_feedback TEXT,
  generated_motivations JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing copy generation logs
CREATE TABLE IF NOT EXISTS copy_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_data JSONB NOT NULL,
  selected_motivations JSONB NOT NULL,
  copy_settings JSONB NOT NULL,
  generated_copy JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing campaign matrices
CREATE TABLE IF NOT EXISTS campaign_matrices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  name TEXT NOT NULL,
  columns JSONB NOT NULL, -- Array of column definitions
  rows JSONB NOT NULL, -- Array of row data with slots
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivations ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sign_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sign_off_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_matrices ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their own briefs" 
  ON briefs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own briefs" 
  ON briefs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own briefs" 
  ON briefs FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy for viewing motivations
CREATE POLICY "Users can view motivations for their briefs" 
  ON motivations FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM briefs 
    WHERE briefs.id = motivations.brief_id 
    AND briefs.user_id = auth.uid()
  ));

-- Create policy for viewing copy variations
CREATE POLICY "Users can view copy variations for their briefs" 
  ON copy_variations FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM briefs 
    WHERE briefs.id = copy_variations.brief_id 
    AND briefs.user_id = auth.uid()
  ));

-- Create policies for sign-offs
CREATE POLICY "Users can view their own sign-offs" 
  ON sign_offs FOR SELECT 
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own sign-offs" 
  ON sign_offs FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

-- Create policy for viewing campaign matrices
CREATE POLICY "Users can view matrices for their campaigns" 
  ON campaign_matrices FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_matrices.campaign_id 
    AND campaigns.user_id = auth.uid()
  ));

-- Create policy for inserting campaign matrices
CREATE POLICY "Users can insert matrices for their campaigns" 
  ON campaign_matrices FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_matrices.campaign_id 
    AND campaigns.user_id = auth.uid()
  ));

-- Create policy for updating campaign matrices
CREATE POLICY "Users can update matrices for their campaigns" 
  ON campaign_matrices FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_matrices.campaign_id 
    AND campaigns.user_id = auth.uid()
  ));

-- Add function to update the "updated_at" timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update the "updated_at" timestamp
CREATE TRIGGER update_briefs_updated_at
BEFORE UPDATE ON briefs
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_sign_offs_updated_at
BEFORE UPDATE ON sign_offs
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_campaign_matrices_updated_at
BEFORE UPDATE ON campaign_matrices
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();