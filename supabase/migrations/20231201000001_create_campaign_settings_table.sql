-- Create campaign_settings table
CREATE TABLE campaign_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  settings JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id)
);

-- Create unique constraint to ensure only one settings record per campaign
ALTER TABLE campaign_settings
  ADD CONSTRAINT unique_settings_per_campaign UNIQUE (campaign_id);

-- Create indexes for better query performance
CREATE INDEX idx_campaign_settings_campaign ON campaign_settings(campaign_id);
CREATE INDEX idx_campaign_settings_org ON campaign_settings(organisation_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_campaign_settings_updated_at
  BEFORE UPDATE ON campaign_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;

-- Policy for inserting new settings
CREATE POLICY "Users can create campaign settings for their organisation"
  ON campaign_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for viewing settings
CREATE POLICY "Users can view campaign settings for their organisation"
  ON campaign_settings
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for updating settings
CREATE POLICY "Users can update campaign settings for their organisation"
  ON campaign_settings
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for deleting settings
CREATE POLICY "Users can delete campaign settings for their organisation"
  ON campaign_settings
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );
