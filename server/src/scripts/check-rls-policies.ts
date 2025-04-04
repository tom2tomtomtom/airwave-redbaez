import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRlsPolicies() {
  logger.info('=== Checking Database RLS Policies and Permissions ===');
  
  try {
    // 1. Check if we can run raw SQL to examine RLS policies
    logger.info('\nAttempting to query RLS policies...');
    const { data: rlsPolicies, error: rlsError } = await supabase
      .rpc('get_policies', { table_name: 'assets' });
    
    if (rlsError) {
      logger.error('Error getting RLS policies:', rlsError);
      logger.info('Trying alternative direct query approach...');
      
      // Try a different approach with raw SQL
      const { data: policiesData, error: policiesError } = await supabase
        .from('_rls_policies')
        .select('*')
        .eq('table', 'assets');
        
      if (policiesError) {
        logger.error('Error with alternative approach:', policiesError);
        
        // Last attempt: Try to query pg_policy directly
        const { data: pgPolicyData, error: pgPolicyError } = await supabase.rpc('admin_query', {
          query: `
            SELECT polname, polpermissive, polroles, polqual, polwithcheck
            FROM pg_policy
            WHERE polrelid = 'public.assets'::regclass;
          `
        });
        
        if (pgPolicyError) {
          logger.error('Cannot query pg_policy directly:', pgPolicyError);
          logger.info('Your database user does not have admin permissions to view RLS policies.');
        } else {
          logger.info('Policies from pg_policy:', pgPolicyData);
        }
      } else {
        logger.info('RLS policies (alternative method):', policiesData);
      }
    } else {
      logger.info('RLS policies:', rlsPolicies);
    }
    
    // 2. Check if we can access the assets table at all
    logger.info('\nTesting basic access to assets table...');
    const { data: assetsAccess, error: assetsAccessError } = await supabase
      .from('assets')
      .select('count(*)')
      .limit(1);
      
    if (assetsAccessError) {
      logger.error('Error accessing assets table:', assetsAccessError);
      logger.info('You may not have SELECT permission on the assets table.');
    } else {
      logger.info('Assets table is accessible. Count result:', assetsAccess);
    }
    
    // 3. Test direct INSERT with minimal data
    logger.info('\nTesting minimal INSERT into assets table...');
    const testAsset = {
      id: 'test-' + Date.now(),
      name: 'test-asset.txt',
      type: 'text/plain',
      url: '/uploads/test-' + Date.now(),
      user_id: '00000000-0000-0000-0000-000000000000',
      client_id: 'default',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();
      
    if (insertError) {
      logger.error('Error with INSERT test:', insertError);
      
      // If there's a permission error, check specific permissions
      if (insertError.message.includes('permission denied')) {
        logger.info('\nYou do not have INSERT permission on the assets table.');
        logger.info('This could be due to RLS policies or role permissions.');
        
        // Try to get role information
        logger.info('\nAttempting to check current role...');
        const { data: roleData, error: roleError } = await supabase.rpc('admin_query', {
          query: 'SELECT current_user, current_setting(\'role\', true);'
        });
        
        if (roleError) {
          logger.error('Cannot check role:', roleError);
        } else {
          logger.info('Current database role:', roleData);
        }
      }
      
      // If there's a foreign key error, examine the constraint
      if (insertError.message.includes('violates foreign key constraint')) {
        logger.info('\nForeign key constraint violation detected.');
        
        // Extract constraint name if possible
        const constraintMatch = insertError.message.match(/constraint "([^"]+)"/);
        if (constraintMatch) {
          const constraintName = constraintMatch[1];
          logger.info(`Constraint name: ${constraintName}`);
          
          // Try to get constraint details
          logger.info('\nAttempting to get constraint details...');
          const { data: constraintData, error: constraintError } = await supabase.rpc('admin_query', {
            query: `
              SELECT conname, contype, conrelid::regclass AS table, 
                     conkey, confrelid::regclass AS referenced_table, confkey
              FROM pg_constraint
              WHERE conname = '${constraintName}';
            `
          });
          
          if (constraintError) {
            logger.error('Cannot get constraint details:', constraintError);
          } else {
            logger.info('Constraint details:', constraintData);
          }
        }
      }
    } else {
      logger.info('INSERT test successful:', insertResult);
      
      // Clean up the test asset
      const { error: deleteError } = await supabase
        .from('assets')
        .delete()
        .eq('id', testAsset.id);
        
      if (deleteError) {
        logger.error('Error cleaning up test asset:', deleteError);
      } else {
        logger.info('Test asset cleaned up successfully');
      }
    }
    
    // 4. Check auth configuration
    logger.info('\nChecking auth configuration...');
    logger.info('Auth URL:', supabaseUrl);
    logger.info('Auth key length:', supabaseKey ? supabaseKey.length : 0);
    
    // Try getting a session to check auth is working
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logger.error('Auth session error:', sessionError);
    } else if (sessionData.session) {
      logger.info('Auth session exists for user:', sessionData.session.user.id);
    } else {
      logger.info('No active auth session');
    }
    
    // 5. Check users table schema
    logger.info('\nChecking users table schema...');
    const { data: userColumns, error: userColumnsError } = await supabase.rpc('admin_query', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position;
      `
    });
    
    if (userColumnsError) {
      logger.error('Cannot get users table schema:', userColumnsError);
      
      // Alternative approach
      const { data: oneUser, error: oneUserError } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .single();
        
      if (oneUserError) {
        logger.error('Error getting sample user:', oneUserError);
      } else {
        logger.info('Users table columns (from sample):', Object.keys(oneUser));
      }
    } else {
      logger.info('Users table schema:', userColumns);
    }
    
    // 6. Check assets table schema
    logger.info('\nChecking assets table schema...');
    const { data: assetColumns, error: assetColumnsError } = await supabase.rpc('admin_query', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'assets'
        ORDER BY ordinal_position;
      `
    });
    
    if (assetColumnsError) {
      logger.error('Cannot get assets table schema:', assetColumnsError);
      
      // Try inserting with ALL possible field combinations to see what fails
      logger.info('\nAttempting diagnostic insert with different field combinations...');
      
      const baseAsset = {
        id: 'test-' + Date.now(),
        name: 'test-diagnose.txt',
        type: 'text/plain',
        url: '/uploads/test-diagnose',
        user_id: '00000000-0000-0000-0000-000000000000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Try different field combinations
      const variations = [
        { ...baseAsset, owner_id: baseAsset.user_id, client_id: 'default' },
        { ...baseAsset, meta: { description: 'Test' } },
        { ...baseAsset, thumbnail_url: null },
        { ...baseAsset, client_id: null },
        { ...baseAsset, meta: null }
      ];
      
      for (let i = 0; i < variations.length; i++) {
        const variation = variations[i];
        logger.info(`\nTrying variation ${i+1}:`, variation);
        
        const { data: varData, error: varError } = await supabase
          .from('assets')
          .insert(variation)
          .select();
          
        if (varError) {
          logger.error(`Variation ${i+1} failed:`, varError);
        } else {
          logger.info(`Variation ${i+1} succeeded:`, varData);
          // Clean up
          await supabase.from('assets').delete().eq('id', variation.id);
        }
      }
    } else {
      logger.info('Assets table schema:', assetColumns);
    }
    
  } catch (error) {
    logger.error('Unexpected error during check:', error);
  }
  
  logger.info('=== RLS and Permission Check Complete ===');
}

// Run the script
checkRlsPolicies().catch(console.error).finally(() => {
  logger.info('Script execution complete');
});
