import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from parent directory's .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAppUsers() {
  try {
    console.log('Deleting users from the application database...');
    
    // Delete from users table (this is your application's users table)
    const { error: deleteUsersError } = await supabase
      .from('users')
      .delete()
      .not('id', 'eq', '00000000-0000-0000-0000-000000000000'); // Protect any system users
    
    if (deleteUsersError) {
      console.error('Error deleting app users:', deleteUsersError.message);
    } else {
      console.log('Successfully deleted users from application database');
    }
    
    // You can add deletion from related tables here if needed
    // For example, delete related assets, preferences, etc.
    
    console.log('Application database cleanup complete!');
  } catch (error) {
    console.error('Unexpected error during user deletion:', error);
  }
}

// Run the deletion function
deleteAppUsers();
