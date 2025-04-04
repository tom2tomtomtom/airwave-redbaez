import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from parent directory's .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('Missing required environment variables: SUPABASE_URL and SUPABASE_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAppUsers() {
  try {
    logger.info('Deleting users from the application database...');
    
    // Delete from users table (this is your application's users table)
    const { error: deleteUsersError } = await supabase
      .from('users')
      .delete()
      .not('id', 'eq', '00000000-0000-0000-0000-000000000000'); // Protect any system users
    
    if (deleteUsersError) {
      logger.error('Error deleting app users:', deleteUsersError.message);
    } else {
      logger.info('Successfully deleted users from application database');
    }
    
    // You can add deletion from related tables here if needed
    // For example, delete related assets, preferences, etc.
    
    logger.info('Application database cleanup complete!');
  } catch (error) {
    logger.error('Unexpected error during user deletion:', error);
  }
}

// Run the deletion function
deleteAppUsers();
