-- Drop existing development RLS policies
DROP POLICY IF EXISTS "Unrestricted access" ON assets;

-- Enable RLS on assets table if not already enabled
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Policy for viewing assets
CREATE POLICY "Users can view assets for their organisation"
  ON assets
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for inserting assets
CREATE POLICY "Users can upload assets for their organisation"
  ON assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for updating assets
CREATE POLICY "Users can update assets for their organisation"
  ON assets
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

-- Policy for deleting assets
CREATE POLICY "Users can delete assets for their organisation"
  ON assets
  FOR DELETE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    )
  );

-- Add validation trigger for file size and type
CREATE OR REPLACE FUNCTION validate_asset()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate file size (100MB limit)
  IF NEW.file_size > 104857600 THEN
    RAISE EXCEPTION 'File size exceeds 100MB limit';
  END IF;

  -- Validate file type
  IF NEW.mime_type NOT IN (
    'video/mp4',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ) THEN
    RAISE EXCEPTION 'Invalid file type. Supported types: MP4, MOV, JPEG, PNG, GIF, PDF';
  END IF;

  -- Set created_by if not set
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for asset validation
DROP TRIGGER IF EXISTS validate_asset_trigger ON assets;
CREATE TRIGGER validate_asset_trigger
  BEFORE INSERT OR UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION validate_asset();
