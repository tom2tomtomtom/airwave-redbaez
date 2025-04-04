import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from parent directory's .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAllUsers() {
  try {
    logger.info('Fetching users from the database...');
    
    // Get all users from auth.users table
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      logger.error('Error fetching auth users:', authError.message);
      return;
    }
    
    logger.info(`Found ${authUsers.users.length} users in auth.users table`);
    
    // Get users from our custom users table
    const { data: appUsers, error: appError } = await supabase
      .from('users')
      .select('id, email');
    
    if (appError) {
      logger.error('Error fetching app users:', appError.message);
      return;
    }
    
    logger.info(`Found ${appUsers?.length || 0} users in custom users table`);
    
    // Delete users from our custom users table first
    if (appUsers && appUsers.length > 0) {
      logger.info('Deleting users from custom users table...');
      
      const { error: deleteAppError } = await supabase
        .from('users')
        .delete()
        .not('id', 'eq', '00000000-0000-0000-0000-000000000000'); // Don't delete the mock user if it exists
      
      if (deleteAppError) {
        logger.error('Error deleting app users:', deleteAppError.message);
      } else {
        logger.info('Successfully deleted users from custom users table');
      }
    }
    
    // Delete users from auth.users table
    if (authUsers.users.length > 0) {
      logger.info('Deleting users from auth.users table...');
      
      for (const user of authUsers.users) {
        // Skip special users like admin or default users if needed
        if (user.email?.includes('admin') || user.id === '00000000-0000-0000-0000-000000000000') {
          logger.info(`Skipping special user: ${user.email}`);
          continue;
        }
        
        logger.info(`Deleting user: ${user.email} (${user.id})`);
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        
        if (error) {
          logger.error(`Error deleting user ${user.email}:`, error.message);
        }
      }
      
      logger.info('User deletion complete');
    }
    
    logger.info('Database cleanup complete!');
  } catch (error) {
    logger.error('Unexpected error during user deletion:', error);
  }
}

// Run the deletion function
deleteAllUsers();
