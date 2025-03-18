-- Create briefs table for Strategic Content Development module
CREATE TABLE IF NOT EXISTS public.briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS briefs_user_id_idx ON public.briefs (user_id);
CREATE INDEX IF NOT EXISTS briefs_status_idx ON public.briefs (status);
CREATE INDEX IF NOT EXISTS briefs_organisation_id_idx ON public.briefs (organisation_id);
CREATE INDEX IF NOT EXISTS briefs_created_at_idx ON public.briefs (created_at);

-- Add full-text search capabilities 
ALTER TABLE public.briefs ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS briefs_search_idx ON public.briefs USING gin(search_vector);

-- Create a function to update the search vector
CREATE OR REPLACE FUNCTION briefs_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create a trigger to update the search vector automatically
DROP TRIGGER IF EXISTS briefs_search_vector_update ON public.briefs;
CREATE TRIGGER briefs_search_vector_update 
  BEFORE INSERT OR UPDATE ON public.briefs
  FOR EACH ROW EXECUTE FUNCTION briefs_search_vector_update();

-- Enable Row Level Security
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

-- Development mode policy (not for production)
CREATE POLICY briefs_dev_policy ON public.briefs 
  USING (true) 
  WITH CHECK (true);

-- IMPORTANT: For production, replace the above policy with these:
/*
-- Users can view their own briefs or briefs from their organisation
CREATE POLICY briefs_select_policy ON public.briefs 
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (
      organisation_id IS NOT NULL AND
      auth.uid() IN (
        SELECT user_id FROM public.organisation_users 
        WHERE organisation_id = public.briefs.organisation_id
      )
    )
  );

-- Users can only create briefs as themselves
CREATE POLICY briefs_insert_policy ON public.briefs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own briefs or org briefs if an admin
CREATE POLICY briefs_update_policy ON public.briefs 
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (
      organisation_id IS NOT NULL AND
      auth.uid() IN (
        SELECT user_id FROM public.organisation_users 
        WHERE organisation_id = public.briefs.organisation_id
        AND role = 'admin'
      )
    )
  );

-- Users can only delete their own briefs or org briefs if an admin
CREATE POLICY briefs_delete_policy ON public.briefs 
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (
      organisation_id IS NOT NULL AND
      auth.uid() IN (
        SELECT user_id FROM public.organisation_users 
        WHERE organisation_id = public.briefs.organisation_id
        AND role = 'admin'
      )
    )
  );
*/

-- Add comment explaining the table
COMMENT ON TABLE public.briefs IS 'Client briefs for the Strategic Content Development module';
