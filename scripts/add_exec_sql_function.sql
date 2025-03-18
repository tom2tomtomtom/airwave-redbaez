-- Function to execute dynamic SQL
-- This is needed by the server application to create tables and modify schema

-- Create the exec_sql function that the application is expecting
CREATE OR REPLACE FUNCTION public.exec_sql(sql_string text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_string;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution privileges to authenticated users
-- Note: In production, you may want to restrict this to specific roles
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- IMPORTANT SECURITY NOTE:
-- The SECURITY DEFINER means this function runs with the permissions of the owner (usually postgres)
-- This is potentially dangerous as it allows executing arbitrary SQL
-- In production, consider implementing more restrictive functions for specific operations
-- or adding input validation to prevent SQL injection
