import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js'

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config()

// Constants for development user - MUST MATCH what's in the database
const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev-user-00000000-0000-0000-0000-000000000000@example.com',
  role: 'user',
  name: 'Development User'
};

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDevUser() {
  logger.info('=== Development User Fix Script ===');
  logger.info('Checking development user in public.users table...');
  
  try {
    // Check if dev user exists in public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', DEV_USER.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('Error checking dev user:', checkError);
      process.exit(1);
    }
    
    if (existingUser) {
      logger.info('✅ Development user found in public.users:', existingUser);
      
      // Check if properties match what we expect
      let needsUpdate = false;
      const updates: Record<string, unknown> = {};
      
      if (existingUser.email !== DEV_USER.email) {
        logger.info(`❌ Email mismatch: ${existingUser.email} vs expected ${DEV_USER.email}`);
        updates.email = DEV_USER.email;
        needsUpdate = true;
      }
      
      if (existingUser.role !== DEV_USER.role) {
        logger.info(`❌ Role mismatch: ${existingUser.role} vs expected ${DEV_USER.role}`);
        updates.role = DEV_USER.role;
        needsUpdate = true;
      }
      
      if (existingUser.name !== DEV_USER.name) {
        logger.info(`❌ Name mismatch: ${existingUser.name} vs expected ${DEV_USER.name}`);
        updates.name = DEV_USER.name;
        needsUpdate = true;
      }
      
      // Update user if needed
      if (needsUpdate) {
        logger.info('Updating development user with correct properties...');
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', DEV_USER.id);
          
        if (updateError) {
          logger.error('❌ Failed to update development user:', updateError);
        } else {
          logger.info('✅ Development user updated successfully');
        }
      } else {
        logger.info('✅ Development user properties match expected values');
      }
    } else {
      // Create dev user if doesn't exist
      logger.info('❌ Development user not found in public.users, creating...');
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: DEV_USER.id,
          email: DEV_USER.email,
          role: DEV_USER.role,
          name: DEV_USER.name,
          created_at: new Date().toISOString(),
        });
        
      if (insertError) {
        logger.error('❌ Failed to create development user:', insertError);
      } else {
        logger.info('✅ Development user created successfully');
      }
    }
    
    // Try to check auth.users (might fail due to permissions)
    logger.info('Checking development user in auth.users table (may fail due to permissions)...');
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(DEV_USER.id);
      
      if (authError) {
        logger.info('❌ Could not access auth.users table:', authError.message);
        logger.info('This is expected if you do not have admin permissions.');
      } else if (authUser) {
        logger.info('✅ Development user found in auth.users:', authUser);
      } else {
        logger.info('❌ Development user not found in auth.users');
      }
    } catch (authError) {
      logger.info('❌ Could not access auth.users table:', authError);
      logger.info('This is expected if you do not have admin permissions.');
    }
    
    // Verify constraint check directly
    logger.info('Testing foreign key constraint directly...');
    
    const testAsset = {
      user_id: DEV_USER.id,
      owner_id: DEV_USER.id, // Important: ensure both user_id and owner_id are set
      name: 'test-asset.txt',
      size: 123,
      type: 'text/plain',
      meta: { test: true }, // Using 'meta' instead of 'metadata' to match the DB schema
      created_at: new Date().toISOString(),
    };
    
    const { data: testData, error: testError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select()
      .single();
      
    if (testError) {
      logger.error('❌ Foreign key constraint test failed:', testError);
      logger.info('This suggests there may be additional constraints or RLS policies in place.');
    } else {
      logger.info('✅ Foreign key constraint test passed successfully:', testData);
      
      // Clean up test asset
      const { error: deleteError } = await supabase
        .from('assets')
        .delete()
        .eq('id', testData.id);
        
      if (deleteError) {
        logger.info('❌ Failed to clean up test asset:', deleteError);
      } else {
        logger.info('✅ Test asset cleaned up successfully');
      }
    }
  } catch (error) {
    logger.error('Unexpected error fixing dev user:', error);
    process.exit(1);
  }
  
  logger.info('=== Script Complete ===');
}

// Execute the script
fixDevUser().catch(err => {
  logger.error('Unhandled error:', err);
  process.exit(1);
});
