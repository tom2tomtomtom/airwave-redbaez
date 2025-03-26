-- Create enum for export job status
CREATE TYPE export_job_status AS ENUM (
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

-- Create export_jobs table
CREATE TABLE export_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id),
  variation_ids UUID[] NOT NULL,
  settings JSONB NOT NULL,
  status export_job_status NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  output_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_export_jobs_campaign ON export_jobs(campaign_id);
CREATE INDEX idx_export_jobs_platform ON export_jobs(platform_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
CREATE INDEX idx_export_jobs_org ON export_jobs(organisation_id);

-- Enable RLS
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- Policy for creating export jobs
CREATE POLICY "Users can create export jobs for their organisation"
  ON export_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for viewing export jobs
CREATE POLICY "Users can view export jobs for their organisation"
  ON export_jobs
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for updating export jobs
CREATE POLICY "Users can update export jobs for their organisation"
  ON export_jobs
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

-- Policy for deleting export jobs
CREATE POLICY "Users can delete export jobs for their organisation"
  ON export_jobs
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Create function to start export job
CREATE OR REPLACE FUNCTION start_export(job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_exists BOOLEAN;
  v_org_id UUID;
  v_user_has_access BOOLEAN;
BEGIN
  -- Check if job exists and get organisation_id
  SELECT EXISTS (
    SELECT 1 FROM export_jobs WHERE id = job_id
  ), organisation_id INTO v_job_exists, v_org_id
  FROM export_jobs WHERE id = job_id;

  IF NOT v_job_exists THEN
    RAISE EXCEPTION 'Export job not found';
  END IF;

  -- Check if user has access to the organisation
  SELECT EXISTS (
    SELECT 1 
    FROM user_organisations 
    WHERE user_id = auth.uid() 
    AND org_id = v_org_id
  ) INTO v_user_has_access;

  IF NOT v_user_has_access THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update job status
  UPDATE export_jobs
  SET 
    status = 'processing',
    started_at = NOW()
  WHERE id = job_id;

  -- Notify export service
  PERFORM pg_notify(
    'export_job_started',
    json_build_object(
      'job_id', job_id,
      'organisation_id', v_org_id
    )::text
  );
END;
$$;

-- Create function to cancel export job
CREATE OR REPLACE FUNCTION cancel_export(job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_exists BOOLEAN;
  v_org_id UUID;
  v_user_has_access BOOLEAN;
BEGIN
  -- Check if job exists and get organisation_id
  SELECT EXISTS (
    SELECT 1 FROM export_jobs WHERE id = job_id
  ), organisation_id INTO v_job_exists, v_org_id
  FROM export_jobs WHERE id = job_id;

  IF NOT v_job_exists THEN
    RAISE EXCEPTION 'Export job not found';
  END IF;

  -- Check if user has access to the organisation
  SELECT EXISTS (
    SELECT 1 
    FROM user_organisations 
    WHERE user_id = auth.uid() 
    AND org_id = v_org_id
  ) INTO v_user_has_access;

  IF NOT v_user_has_access THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update job status
  UPDATE export_jobs
  SET 
    status = 'cancelled',
    completed_at = NOW(),
    error = 'Export cancelled by user'
  WHERE id = job_id
  AND status IN ('queued', 'processing');

  -- Notify export service
  PERFORM pg_notify(
    'export_job_cancelled',
    json_build_object(
      'job_id', job_id,
      'organisation_id', v_org_id
    )::text
  );
END;
$$;

-- Create function to update export progress
CREATE OR REPLACE FUNCTION update_export_progress(
  job_id UUID,
  new_progress INTEGER,
  new_status export_job_status DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  output_url TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_exists BOOLEAN;
  v_org_id UUID;
BEGIN
  -- Check if job exists and get organisation_id
  SELECT EXISTS (
    SELECT 1 FROM export_jobs WHERE id = job_id
  ), organisation_id INTO v_job_exists, v_org_id
  FROM export_jobs WHERE id = job_id;

  IF NOT v_job_exists THEN
    RAISE EXCEPTION 'Export job not found';
  END IF;

  -- Update job progress and status
  UPDATE export_jobs
  SET 
    progress = LEAST(100, GREATEST(0, new_progress)),
    status = COALESCE(new_status, status),
    error = NULLIF(error_message, ''),
    output_url = NULLIF(output_url, ''),
    completed_at = CASE 
      WHEN new_status IN ('completed', 'failed', 'cancelled') THEN NOW()
      ELSE completed_at
    END
  WHERE id = job_id;

  -- Notify clients about the update
  PERFORM pg_notify(
    'export_progress_updated',
    json_build_object(
      'job_id', job_id,
      'organisation_id', v_org_id,
      'progress', new_progress,
      'status', new_status,
      'error', error_message,
      'output_url', output_url
    )::text
  );
END;
$$;

-- Create function to check platform export limits
CREATE OR REPLACE FUNCTION check_platform_export_limits(
  platform_id UUID,
  variation_ids UUID[]
)
RETURNS TABLE (
  valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_platform platforms%ROWTYPE;
  v_invalid_variations TEXT[];
BEGIN
  -- Get platform details
  SELECT * INTO v_platform
  FROM platforms
  WHERE id = platform_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Platform not found';
    RETURN;
  END IF;

  -- Check variations against platform limits
  WITH invalid_variations AS (
    SELECT 
      v.name
    FROM unnest(variation_ids) vid
    JOIN campaign_variations v ON v.id = vid
    JOIN assets a ON a.id = v.main_asset_id
    WHERE 
      (v_platform.max_duration IS NOT NULL AND a.duration > v_platform.max_duration) OR
      (v_platform.max_file_size IS NOT NULL AND a.file_size > v_platform.max_file_size)
  )
  SELECT array_agg(name) INTO v_invalid_variations
  FROM invalid_variations;

  IF v_invalid_variations IS NOT NULL THEN
    RETURN QUERY SELECT 
      FALSE,
      'The following variations exceed platform limits: ' || array_to_string(v_invalid_variations, ', ');
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;
