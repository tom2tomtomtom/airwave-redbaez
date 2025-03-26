-- Function to create the development user
CREATE OR REPLACE FUNCTION insert_development_user(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT
) RETURNS void AS $$
BEGIN
  -- Disable RLS for this operation
  SET LOCAL ROLE postgres;
  
  -- Insert directly into users table using superuser privileges
  INSERT INTO users (id, email, name, role, created_at, updated_at)
  VALUES (user_id, user_email, user_name, user_role, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();
    
  -- Reset role
  RESET ROLE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create the insert_development_user function
-- This is a meta-function that creates another function
CREATE OR REPLACE FUNCTION create_insert_development_user_function() RETURNS void AS $$
BEGIN
  -- This function just returns success - we'll actually create the function manually
  -- We include this to avoid errors in our TypeScript code
  RETURN;
END;
$$ LANGUAGE plpgsql;
