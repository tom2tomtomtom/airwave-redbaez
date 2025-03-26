import { supabase } from '../db/supabaseClient';

/**
 * Creates a database function to get assets by client slug
 */
export async function createAssetsByClientSlugFunction(): Promise<void> {
  console.log('Creating database function for looking up assets by client slug...');
  
  // SQL for creating the function to get assets by client slug
  const functionSQL = `
    CREATE OR REPLACE FUNCTION get_assets_by_client_slug(slug TEXT)
    RETURNS SETOF assets
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT a.*
      FROM assets a
      JOIN clients c ON a.client_id = c.id
      WHERE c.client_slug = slug;
    $$;
  `;
  
  try {
    const { error } = await supabase.rpc('execute_sql', { sql: functionSQL });
    
    if (error) {
      console.error('Error creating get_assets_by_client_slug function:', error);
      throw error;
    }
    
    console.log('Successfully created get_assets_by_client_slug function');
  } catch (err) {
    console.error('Failed to create asset lookup function:', err);
    throw new Error('Could not create asset lookup function');
  }
}

/**
 * Function to run the migration
 */
export async function runAssetClientSlugLookupMigration(): Promise<void> {
  console.log('Running asset client slug lookup migration...');
  
  try {
    await createAssetsByClientSlugFunction();
    console.log('Asset client slug lookup migration completed successfully');
  } catch (err) {
    console.error('Asset client slug lookup migration failed:', err);
  }
}
