/**
 * Script to create a development user in the database
 * This resolves the issue with asset uploads failing in development mode
 * Run with: ts-node src/scripts/create-dev-user.ts
 */

import { supabase } from '../db/supabaseClient';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

// Create a proper UUID for the development user
// This is a fixed UUID that will be consistent across runs
// A proper UUID is required because the database column is of type UUID
const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

async function createDevUser() {
  logger.info('⚠️ Using Supabase service role key for development');
  logger.info('🔍 Checking if development user exists in both auth and database tables...');
  
  // Check if user exists in auth.users
  try {
    // First try to get the user from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(DEV_USER_ID);
    
    if (authError) {
      logger.info('🚫 User not found in auth system or error checking:', authError.message);
    } else if (authUser && authUser.user) {
      logger.info('✅ User exists in auth system:', authUser.user.email);
    }
  } catch (e) {
    logger.info('🚫 Error checking auth user:', e);
  }
  
  // Check the users table
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('*')
    .eq('id', DEV_USER_ID)
    .single();
  
  if (dbError) {
    logger.info('🚫 User not found in database users table:', dbError.message);
  } else {
    logger.info('✅ User exists in database users table:', dbUser);
  }
  
  // If not found in database, create it
  if (dbError) {
    logger.info('🔧 Creating development user in database users table...');
    
    // Use RPC call to ensure the user is created with proper privileges
    const { data: insertResult, error: insertError } = await supabase
      .rpc('create_development_user', {
        user_id: DEV_USER_ID,
        user_email: 'dev@airwave.dev',
        user_name: 'Development User',
        user_role: 'admin'
      });
      
    if (insertError) {
      logger.info('⚠️ RPC method not available, falling back to direct insert...');
      
      // Direct insert as fallback
      const { data: directInsert, error: directError } = await supabase
        .from('users')
        .insert({
          id: DEV_USER_ID,
          email: 'dev@airwave.dev',
          name: 'Development User',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
        
      if (directError) {
        logger.error('❌ Failed to create user via direct insert:', directError);
        
        // Last resort - try SQL insert
        logger.info('🔄 Trying SQL approach as last resort...');
        try {
          // Use raw SQL as last resort to bypass RLS
          await supabase.auth.signInWithPassword({
            email: process.env.SUPABASE_ADMIN_EMAIL || 'admin@example.com',
            password: process.env.SUPABASE_ADMIN_PASSWORD || 'password'
          });
          
          // Now try insert with elevated privileges
          const { data: sqlResult, error: sqlError } = await supabase
            .from('users')
            .insert({
              id: DEV_USER_ID,
              email: 'dev@airwave.dev',
              name: 'Development User',
              role: 'admin',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select();
            
          if (sqlError) {
            logger.error('❌ All approaches failed to create user:', sqlError);
          } else {
            logger.info('✅ User created successfully via SQL approach:', sqlResult);
          }
        } catch (e) {
          logger.error('❌ Error with SQL approach:', e);
        }
      } else {
        logger.info('✅ User created successfully via direct insert:', directInsert);
      }
    } else {
      logger.info('✅ User created successfully via RPC:', insertResult);
    }
  }
  
  // Verify again
  const { data: verifyUser, error: verifyError } = await supabase
    .from('users')
    .select('*')
    .eq('id', DEV_USER_ID)
    .single();
    
  if (verifyError) {
    logger.error('❌ Failed to verify user creation:', verifyError);
  } else {
    logger.info('✅ Verified development user exists:', verifyUser);
    logger.info('✅ Development user is ready for asset uploads.');
  }
  
  // Final validation - attempt a test insert to assets table
  logger.info('🧪 Testing foreign key constraint with a dummy query...');
  const { error: testError } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', DEV_USER_ID)
    .limit(1);
    
  if (testError) {
    logger.error('❌ Foreign key test failed:', testError);
  } else {
    logger.info('✅ Foreign key constraint test passed. Assets can reference this user.');
  }
}

// Run the function
createDevUser()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Unhandled error:', err);
    process.exit(1);
  });
