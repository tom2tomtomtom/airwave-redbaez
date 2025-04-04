import { supabase } from '../db/supabaseClient';
import { logger } from './logger';

/**
 * Creates a database function to get assets by client slug
 */
export async function createAssetsByClientSlugFunction(): Promise<void> {
  logger.info('Creating database function for looking up assets by client slug...');
  
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
      logger.error('Error creating get_assets_by_client_slug function:', error);
      throw error;
    }
    
    logger.info('Successfully created get_assets_by_client_slug function');
  } catch (err) {
    logger.error('Failed to create asset lookup function:', err);
    throw new Error('Could not create asset lookup function');
  }
}

/**
 * Function to run the migration
 */
export async function runAssetClientSlugLookupMigration(): Promise<void> {
  logger.info('Running asset client slug lookup migration...');
  
  try {
    await createAssetsByClientSlugFunction();
    logger.info('Asset client slug lookup migration completed successfully');
  } catch (err) {
    logger.error('Asset client slug lookup migration failed:', err);
  }
}
