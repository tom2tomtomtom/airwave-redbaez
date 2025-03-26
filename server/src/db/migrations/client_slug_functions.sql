-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text)
RETURNS boolean AS $$
DECLARE
  exists boolean;
BEGIN
  SELECT COUNT(*) > 0 INTO exists
  FROM information_schema.columns
  WHERE table_name = $1
  AND column_name = $2;
  
  RETURN exists;
END;
$$ LANGUAGE plpgsql;

-- Function to add client_slug column to clients table
CREATE OR REPLACE FUNCTION add_client_slug_column()
RETURNS void AS $$
BEGIN
  -- Check if column exists first
  IF NOT (SELECT column_exists('clients', 'client_slug')) THEN
    -- Add the column
    ALTER TABLE clients ADD COLUMN client_slug text;
    -- Add a note describing the change
    COMMENT ON COLUMN clients.client_slug IS 'Human-readable unique identifier for the client, used for friendly URLs and reliable querying';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create an index on client_slug
CREATE OR REPLACE FUNCTION create_client_slug_index()
RETURNS void AS $$
BEGIN
  -- Check if index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'clients' AND indexname = 'idx_clients_client_slug'
  ) THEN
    -- Create the index
    CREATE INDEX idx_clients_client_slug ON clients(client_slug);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get Juniper assets directly
CREATE OR REPLACE FUNCTION get_juniper_assets()
RETURNS SETOF assets AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM assets
  WHERE client_id = 'fd790d19-6610-4cd5-b90f-214808e94a19'
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get assets by client slug
CREATE OR REPLACE FUNCTION get_assets_by_client_slug(slug text)
RETURNS SETOF assets AS $$
DECLARE
  client_id_val uuid;
BEGIN
  -- Get the client ID from the slug
  SELECT id INTO client_id_val
  FROM clients
  WHERE client_slug = slug;
  
  -- Return assets for this client
  IF client_id_val IS NOT NULL THEN
    RETURN QUERY
    SELECT *
    FROM assets
    WHERE client_id = client_id_val
    ORDER BY created_at DESC;
  ELSE
    -- Return empty set if client not found
    RETURN QUERY
    SELECT *
    FROM assets
    WHERE 1 = 0; -- Always false
  END IF;
END;
$$ LANGUAGE plpgsql;
