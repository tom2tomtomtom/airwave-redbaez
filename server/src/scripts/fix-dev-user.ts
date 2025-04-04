import { supabase } from '../db/supabaseClient';
import { logger } from './logger';
import { AUTH_MODE } from '../middleware/auth';

/**
 * Script to properly create the development user in all required tables
 * This ensures foreign key constraints are satisfied for asset uploads
 */
async function createDevUser() {
  logger.info('Starting development user fix...');
  
  const DEV_USER_ID = AUTH_MODE.DEV_USER_ID;
  logger.info(`Using development user ID: ${DEV_USER_ID}`);
  
  try {
    // Step 1: Check if user exists in auth.users table (using service role key if available)
    logger.info('Checking auth.users table...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(DEV_USER_ID);
    
    if (authError) {
      logger.info('Error checking auth.users or user not found:', authError.message);
      logger.info('Attempting to create development user in auth.users...');
      
      // Try to create the user in auth.users (requires admin privileges)
      // Note: This might fail without service role key
      try {
        const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
          id: DEV_USER_ID, // Changed from uuid to id
          email: 'dev@example.com',
          email_confirm: true,
          user_metadata: {
            name: 'Development User',
            role: 'admin'
          }
        });
        
        if (createError) {
          logger.info('Could not create user in auth.users:', createError.message);
        } else {
          logger.info('User created in auth.users successfully');
        }
      } catch ($1: unknown) {
        logger.info('Exception creating auth user:', e.message);
      }
    } else {
      logger.info('User exists in auth.users:', authUser?.user?.id);
    }
    
    // Step 2: Ensure the user exists in the public.users table
    logger.info('Checking public.users table...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id')
      .eq('id', DEV_USER_ID)
      .single();
    
    if (dbError || !dbUser) {
      logger.info('User not found in public.users, inserting...');
      
      // Direct SQL approach - sometimes more reliable than the API with RLS policies
      const { data: insertData, error: insertError } = await supabase.rpc('insert_development_user', {
        user_id: DEV_USER_ID,
        user_email: 'dev@example.com',
        user_name: 'Development User',
        user_role: 'admin'
      });
      
      if (insertError) {
        logger.info('Error inserting into public.users via RPC:', insertError.message);
        
        // Fallback to direct insert
        const { data: directData, error: directError } = await supabase
          .from('users')
          .upsert({
            id: DEV_USER_ID,
            email: 'dev@example.com',
            name: 'Development User',
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        
        if (directError) {
          logger.info('Error with direct insert to public.users:', directError.message);
          logger.info('Details:', directError);
        } else {
          logger.info('User inserted into public.users via direct insert');
        }
      } else {
        logger.info('User inserted into public.users via RPC function');
      }
    } else {
      logger.info('User exists in public.users:', dbUser.id);
    }
    
    // Step 3: Verify the user now exists in public.users
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', DEV_USER_ID)
      .single();
    
    if (verifyError || !verifyUser) {
      logger.info('VERIFICATION FAILED: User still not in public.users:', verifyError?.message);
    } else {
      logger.info('VERIFICATION SUCCESS: Development user exists in public.users');
      logger.info('User details:', verifyUser);
    }
    
    // Step 4: Create stored function for direct user insertion
    logger.info('Creating stored function for dev user insertion...');
    const { error: funcError } = await supabase.rpc('create_insert_development_user_function');
    
    if (funcError) {
      logger.info('Error creating function (may already exist):', funcError.message);
    } else {
      logger.info('Function created or already exists');
    }
    
  } catch ($1: unknown) {
    logger.error('Unexpected error:', error.message);
  }
}

// Run the script
createDevUser().then(() => {
  logger.info('Development user fix completed');
  process.exit(0);
}).catch(err => {
  logger.error('Script failed:', err);
  process.exit(1);
});
