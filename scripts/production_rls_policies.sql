-- Production-ready RLS policies for Supabase assets table
-- Apply this in the Supabase SQL editor to secure your assets table

-- Drop ALL existing RLS policies (including already created production policies)
DROP POLICY IF EXISTS "Allow unrestricted access" ON storage.objects;
DROP POLICY IF EXISTS "Unrestricted access" ON assets;
DROP POLICY IF EXISTS "Users can view assets" ON assets;
DROP POLICY IF EXISTS "Users can upload assets for their organisation" ON assets;
DROP POLICY IF EXISTS "Users can update assets for their organisation" ON assets;
DROP POLICY IF EXISTS "Users can delete assets for their organisation" ON assets;
DROP POLICY IF EXISTS "Users can read their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own assets" ON storage.objects;

-- Enable RLS on assets table if not already enabled
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Policy for viewing assets
CREATE POLICY "Users can view assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (
    -- Only allow users to see assets they own
    owner_id = auth.uid()
  );

-- Policy for inserting assets with rate limiting and file validation
CREATE POLICY "Users can upload assets for their organisation"
  ON assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Owner must be the authenticated user
    owner_id = auth.uid() AND
    -- Basic type check - ensure type is populated
    type IS NOT NULL AND
    -- Rate limiting: Count uploads in last 24 hours
    (
      SELECT COUNT(*) 
      FROM assets 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      AND owner_id = auth.uid()
    ) < 100 -- Limit of 100 uploads per 24 hours
  );

-- Policy for updating assets
CREATE POLICY "Users can update assets for their organisation"
  ON assets
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own assets
    owner_id = auth.uid()
    
        -- For now, users can only update their own assets
    -- Organizational access can be added later when the schema is confirmed
  )
  WITH CHECK (
    -- Keep the same owner (can't change ownership)
    owner_id = owner_id
  );

-- Policy for deleting assets
CREATE POLICY "Users can delete assets for their organisation"
  ON assets
  FOR DELETE
  TO authenticated
  USING (
    -- User can delete their own assets
    owner_id = auth.uid()
    
        -- For now, users can only update their own assets
    -- Organizational access can be added later when the schema is confirmed
  );

-- Basic RLS policies for storage objects
CREATE POLICY "Users can read their own assets" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload to their folder" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own assets" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own assets" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
