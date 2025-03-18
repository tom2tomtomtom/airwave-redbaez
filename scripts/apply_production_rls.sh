#!/bin/bash
# Script to apply production-ready RLS policies to the Supabase assets table

echo "Applying production-ready RLS policies to the Supabase assets table..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI is not installed. Please install it first."
  echo "Run: npm install -g supabase"
  exit 1
fi

# Create a temporary SQL file
TMP_SQL_FILE=$(mktemp)

# Write the SQL to the temporary file
cat > "$TMP_SQL_FILE" << 'EOF'

-- Drop existing development RLS policies
DROP POLICY IF EXISTS "Allow unrestricted access" ON storage.objects;
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

-- Policy for inserting assets with rate limiting and file validation
CREATE POLICY "Users can upload assets for their organisation"
  ON assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Organisation validation
    organisation_id IN (
      SELECT org_id 
      FROM user_organisations 
      WHERE user_id = auth.uid()
    ) AND
    -- File size check
    file_size <= 104857600 AND -- 100MB
    -- File type check
    file_type IN ('image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf', 'image/svg+xml') AND
    -- Rate limiting: Count uploads in last 24 hours
    (
      SELECT COUNT(*) 
      FROM assets 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      AND created_by = auth.uid()
    ) < 100 -- Limit of 100 uploads per 24 hours
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

-- Create proper organisation-based RLS policies for storage objects
CREATE POLICY "Users can read their organisation's assets" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'assets' AND
    (auth.jwt() ->> 'organisation_id')::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload assets to their organisation" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'assets' AND
    (auth.jwt() ->> 'organisation_id')::text = (storage.foldername(name))[1] AND
    (LOWER(storage.extension(name)) = ANY (ARRAY['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'svg', 'pdf'])) AND
    (octet_length(content) <= 104857600) -- 100MB file size limit
  );

CREATE POLICY "Users can update their organisation's assets" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'assets' AND
    (auth.jwt() ->> 'organisation_id')::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'assets' AND
    (auth.jwt() ->> 'organisation_id')::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their organisation's assets" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'assets' AND
    (auth.jwt() ->> 'organisation_id')::text = (storage.foldername(name))[1]
  );

EOF

# Apply the SQL using supabase CLI
echo "Running SQL with Supabase CLI..."

# Option 1: If you have supabase login set up
supabase db execute --file "$TMP_SQL_FILE" || {
  # Option 2: Fall back to psql if supabase CLI doesn't work
  echo "Supabase CLI execution failed. Trying direct database connection..."
  echo "Please enter your Supabase database connection details:"
  read -p "Database Host: " DB_HOST
  read -p "Database Port (default: 5432): " DB_PORT
  DB_PORT=${DB_PORT:-5432}
  read -p "Database Name (default: postgres): " DB_NAME
  DB_NAME=${DB_NAME:-postgres}
  read -p "Database User (default: postgres): " DB_USER
  DB_USER=${DB_USER:-postgres}
  read -s -p "Database Password: " DB_PASSWORD
  echo ""
  
  PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "$TMP_SQL_FILE"
}

# Clean up the temporary file
rm "$TMP_SQL_FILE"

echo "Production-ready RLS policies have been applied successfully."
