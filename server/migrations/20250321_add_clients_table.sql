-- Create clients table
CREATE TABLE IF NOT EXISTS "clients" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "logo_url" TEXT,
  "primary_color" TEXT,
  "secondary_color" TEXT,
  "description" TEXT,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add client_id column to assets table
ALTER TABLE "assets" 
ADD COLUMN IF NOT EXISTS "client_id" UUID REFERENCES "clients"("id") ON DELETE SET NULL;

-- Add client_id column to templates table
ALTER TABLE "templates" 
ADD COLUMN IF NOT EXISTS "client_id" UUID REFERENCES "clients"("id") ON DELETE SET NULL;

-- Add client_id column to campaigns table
ALTER TABLE "campaigns" 
ADD COLUMN IF NOT EXISTS "client_id" UUID REFERENCES "clients"("id") ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS "idx_assets_client_id" ON "assets"("client_id");
CREATE INDEX IF NOT EXISTS "idx_templates_client_id" ON "templates"("client_id");
CREATE INDEX IF NOT EXISTS "idx_campaigns_client_id" ON "campaigns"("client_id");

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for clients table
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
