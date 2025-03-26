-- Drop existing development-mode RLS policy
DROP POLICY IF EXISTS "Allow unrestricted access" ON storage.objects;

-- Create proper organisation-based RLS policies for assets
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
    (LOWER(storage.extension(name)) = ANY (ARRAY['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi']))
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

-- Create RLS policies for assets table
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow unrestricted access" ON public.assets;

CREATE POLICY "Users can read their organisation's assets" ON public.assets
  FOR SELECT
  USING (organisation_id = (auth.jwt() ->> 'organisation_id')::text);

CREATE POLICY "Users can create assets in their organisation" ON public.assets
  FOR INSERT
  WITH CHECK (organisation_id = (auth.jwt() ->> 'organisation_id')::text);

CREATE POLICY "Users can update their organisation's assets" ON public.assets
  FOR UPDATE
  USING (organisation_id = (auth.jwt() ->> 'organisation_id')::text)
  WITH CHECK (organisation_id = (auth.jwt() ->> 'organisation_id')::text);

CREATE POLICY "Users can delete their organisation's assets" ON public.assets
  FOR DELETE
  USING (organisation_id = (auth.jwt() ->> 'organisation_id')::text);

-- Create asset validation trigger
CREATE OR REPLACE FUNCTION public.validate_asset()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate file size
  IF NEW.size > 104857600 THEN -- 100MB
    RAISE EXCEPTION 'File size exceeds maximum limit of 100MB';
  END IF;

  -- Validate file type
  IF NOT (
    NEW.mime_type = ANY (ARRAY[
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo'
    ])
  ) THEN
    RAISE EXCEPTION 'Invalid file type. Supported types: JPG, PNG, GIF, MP4, MOV, AVI';
  END IF;

  -- Validate organisation context
  IF NEW.organisation_id != (auth.jwt() ->> 'organisation_id')::text THEN
    RAISE EXCEPTION 'Invalid organisation context';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for asset validation
DROP TRIGGER IF EXISTS validate_asset_trigger ON public.assets;
CREATE TRIGGER validate_asset_trigger
  BEFORE INSERT OR UPDATE
  ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_asset();

-- Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_asset_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  upload_count INTEGER;
BEGIN
  -- Count uploads in the last hour for this organisation
  SELECT COUNT(*)
  INTO upload_count
  FROM public.assets
  WHERE organisation_id = NEW.organisation_id
  AND created_at > NOW() - INTERVAL '1 hour';

  -- Enforce rate limit (100 uploads per hour per organisation)
  IF upload_count >= 100 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 100 uploads per hour per organisation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rate limiting
DROP TRIGGER IF EXISTS check_asset_rate_limit_trigger ON public.assets;
CREATE TRIGGER check_asset_rate_limit_trigger
  BEFORE INSERT
  ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_asset_rate_limit();

-- Create audit logging function
CREATE OR REPLACE FUNCTION public.log_asset_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id,
    organisation_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    (auth.jwt() ->> 'sub')::uuid,
    (auth.jwt() ->> 'organisation_id')::text
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS log_asset_changes_trigger ON public.assets;
CREATE TRIGGER log_asset_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE
  ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_asset_changes();
