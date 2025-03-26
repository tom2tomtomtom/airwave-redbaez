-- Create enum for approval request status
CREATE TYPE approval_request_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'approved',
  'rejected'
);

-- Create enum for approval version status
CREATE TYPE approval_version_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Create approval_requests table
CREATE TABLE approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  status approval_request_status NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  feedback TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id)
);

-- Create approval_versions table
CREATE TABLE approval_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  status approval_version_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  feedback TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id)
);

-- Create unique constraint to ensure version numbers are unique per request
ALTER TABLE approval_versions
  ADD CONSTRAINT unique_version_per_request UNIQUE (request_id, version);

-- Create indexes for better query performance
CREATE INDEX idx_approval_requests_campaign ON approval_requests(campaign_id);
CREATE INDEX idx_approval_requests_org ON approval_requests(organisation_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_versions_request ON approval_versions(request_id);
CREATE INDEX idx_approval_versions_org ON approval_versions(organisation_id);
CREATE INDEX idx_approval_versions_status ON approval_versions(status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for approval_requests

-- Enable RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Policy for inserting new requests
CREATE POLICY "Users can create approval requests for their organisation"
  ON approval_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for viewing requests
CREATE POLICY "Users can view approval requests for their organisation"
  ON approval_requests
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for updating requests
CREATE POLICY "Users can update approval requests for their organisation"
  ON approval_requests
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

-- Policy for deleting requests
CREATE POLICY "Users can delete approval requests for their organisation"
  ON approval_requests
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
    AND status = 'draft'
  );

-- RLS Policies for approval_versions

-- Enable RLS
ALTER TABLE approval_versions ENABLE ROW LEVEL SECURITY;

-- Policy for inserting new versions
CREATE POLICY "Users can create approval versions for their organisation"
  ON approval_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for viewing versions
CREATE POLICY "Users can view approval versions for their organisation"
  ON approval_versions
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for updating versions
CREATE POLICY "Users can update approval versions for their organisation"
  ON approval_versions
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

-- Policy for deleting versions
CREATE POLICY "Users can delete approval versions for their organisation"
  ON approval_versions
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  );

-- Create function to handle approval request status updates
CREATE OR REPLACE FUNCTION handle_approval_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If a version is approved or rejected, update the parent request
  IF NEW.status IN ('approved', 'rejected') THEN
    UPDATE approval_requests
    SET 
      status = NEW.status::approval_request_status,
      reviewed_at = NEW.reviewed_at,
      feedback = NEW.feedback
    WHERE id = NEW.request_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for approval version status changes
CREATE TRIGGER on_approval_version_status_change
  AFTER UPDATE OF status ON approval_versions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_approval_request_status_change();
