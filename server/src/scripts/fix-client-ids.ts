import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  logger.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// The incorrect client ID currently in the assets table
const INCORRECT_CLIENT_ID = 'f4790d19-6610-4cd5-b90f-214808e94a80';

// The correct client ID from the clients table
const CORRECT_CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';

/**
 * Update assets with incorrect client ID to use the correct client ID
 */
async function fixClientIds() {
  logger.info('Starting client ID fix for assets...');
  logger.info(`Updating assets with client_id '${INCORRECT_CLIENT_ID}' to '${CORRECT_CLIENT_ID}'`);

  try {
    // Count how many assets have the incorrect client ID
    const { count, error: countError } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', INCORRECT_CLIENT_ID);

    if (countError) {
      throw countError;
    }

    logger.info(`Found ${count} assets with incorrect client ID.`);
    
    if (count === 0) {
      logger.info('No assets to update. Exiting.');
      return;
    }

    // Update the assets with the incorrect client ID
    const { data, error } = await supabase
      .from('assets')
      .update({ client_id: CORRECT_CLIENT_ID })
      .eq('client_id', INCORRECT_CLIENT_ID);

    if (error) {
      throw error;
    }

    logger.info(`Successfully updated ${count} assets with the correct client ID.`);
    logger.info('Client ID fix completed.');
  } catch (error) {
    logger.error('Error updating client IDs:', error);
  }
}

// Run the function
fixClientIds().catch(console.error);
