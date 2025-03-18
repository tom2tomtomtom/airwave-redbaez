-- Temporary development RLS policy for Supabase assets table
-- This is for DEVELOPMENT ONLY - DO NOT use in production

-- Drop existing RLS policies to start fresh
DROP POLICY IF EXISTS "Allow unrestricted access" ON storage.objects;
DROP POLICY IF EXISTS "Users can view assets" ON assets;
DROP POLICY IF EXISTS "Users can upload assets for their organisation" ON assets;
DROP POLICY IF EXISTS "Users can update assets for their organisation" ON assets;
DROP POLICY IF EXISTS "Users can delete assets for their organisation" ON assets;
DROP POLICY IF EXISTS "Users can read their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Unrestricted access" ON assets;

-- Make sure RLS is enabled on the assets table
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create a temporary policy that allows all operations for authenticated users
CREATE POLICY "Unrestricted access" ON assets
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Also add unrestricted access to storage objects
CREATE POLICY "Allow unrestricted access" ON storage.objects
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Show applied policies for confirmation
SELECT * FROM pg_policies WHERE tablename = 'assets';
