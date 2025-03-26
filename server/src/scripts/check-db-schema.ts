import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Constants for development user
const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev-user-00000000-0000-0000-0000-000000000000@example.com',
  role: 'user',
  name: 'Development User'
};

async function checkDatabaseSchema() {
  console.log('=== Database Schema Check ===');
  
  try {
    // Check users table
    console.log('Checking users table...');
    const { data: userColumns, error: userError } = await supabase.rpc('get_table_info', {
      table_name: 'users'
    });
    
    if (userError) {
      console.error('Error checking users table:', userError);
      
      // Fallback to direct query
      const { data: usersData, error: usersQueryError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
        
      if (usersQueryError) {
        console.error('Failed to query users table:', usersQueryError);
      } else {
        console.log('Users table exists with sample data:', usersData);
      }
    } else {
      console.log('Users table columns:', userColumns);
    }
    
    // Check assets table
    console.log('\nChecking assets table...');
    const { data: assetColumns, error: assetError } = await supabase.rpc('get_table_info', {
      table_name: 'assets'
    });
    
    if (assetError) {
      console.error('Error checking assets table:', assetError);
      
      // Fallback to direct query
      const { data: assetsData, error: assetsQueryError } = await supabase
        .from('assets')
        .select('*')
        .limit(1);
        
      if (assetsQueryError) {
        console.error('Failed to query assets table:', assetsQueryError);
      } else {
        console.log('Assets table exists with sample data:', assetsData);
      }
    } else {
      console.log('Assets table columns:', assetColumns);
    }
    
    // Check for foreign key constraints
    console.log('\nChecking foreign key constraints...');
    const { data: fkData, error: fkError } = await supabase.rpc('get_foreign_keys', {
      table_name: 'assets'
    });
    
    if (fkError) {
      console.error('Error checking foreign keys:', fkError);
      console.log('This could be due to insufficient permissions or the RPC function not existing.');
    } else {
      console.log('Foreign key constraints for assets table:', fkData);
    }
    
    // Test user verification
    console.log('\nVerifying development user...');
    const { data: devUser, error: devUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', DEV_USER.id)
      .single();
      
    if (devUserError) {
      console.error('Error finding development user:', devUserError);
    } else {
      console.log('Development user found:', devUser);
    }
    
    // Test asset insertion
    console.log('\nTesting asset insertion with development user...');
    const testAsset = {
      user_id: DEV_USER.id,
      owner_id: DEV_USER.id,
      name: 'schema-test-asset.txt',
      type: 'text/plain',
      size: 123,
      meta: { test: true }, // Using 'meta' instead of 'metadata' to match the DB schema
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data: insertedAsset, error: insertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select()
      .single();
      
    if (insertError) {
      console.error('Asset insertion test failed:', insertError);
      console.log('\nDetailed error analysis:');
      console.log('- Error code:', insertError.code);
      console.log('- Error message:', insertError.message);
      console.log('- Error details:', insertError.details);
      
      if (insertError.code === '23503') {
        console.log('\nThis is a foreign key constraint violation.');
        console.log('Possible causes:');
        console.log('1. The user_id or owner_id does not exist in the referenced table');
        console.log('2. There are additional columns with foreign key constraints');
        console.log('3. RLS policies are preventing the insertion');
      }
    } else {
      console.log('Asset insertion test succeeded:', insertedAsset);
      
      // Clean up test asset
      const { error: deleteError } = await supabase
        .from('assets')
        .delete()
        .eq('id', insertedAsset.id);
        
      if (deleteError) {
        console.log('Failed to clean up test asset:', deleteError);
      } else {
        console.log('Test asset cleaned up successfully');
      }
    }
    
    // Try with minimal fields
    if (insertError) {
      console.log('\nTrying with minimal fields...');
      const minimalAsset = {
        user_id: DEV_USER.id,
        name: 'minimal-test-asset.txt',
        type: 'text/plain',
      };
      
      const { data: minimalInserted, error: minimalError } = await supabase
        .from('assets')
        .insert(minimalAsset)
        .select()
        .single();
        
      if (minimalError) {
        console.error('Minimal asset insertion failed:', minimalError);
      } else {
        console.log('Minimal asset insertion succeeded:', minimalInserted);
        
        // Clean up
        await supabase.from('assets').delete().eq('id', minimalInserted.id);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error during schema check:', error);
  }
  
  console.log('=== Schema Check Complete ===');
}

// Custom RPC functions that might not exist - these would need to be created in the database
// We define these here for reference, but the script will handle their absence gracefully
/*
-- Get table information
CREATE OR REPLACE FUNCTION get_table_info(table_name TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'column_name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable
    ))
    FROM information_schema.columns
    WHERE table_name = $1
    AND table_schema = 'public'
  );
END;
$$ LANGUAGE plpgsql;

-- Get foreign key constraints
CREATE OR REPLACE FUNCTION get_foreign_keys(table_name TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'constraint_name', tc.constraint_name,
      'column_name', kcu.column_name,
      'foreign_table', ccu.table_name,
      'foreign_column', ccu.column_name
    ))
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = $1
    AND tc.table_schema = 'public'
  );
END;
$$ LANGUAGE plpgsql;
*/

async function listAllAssets() {
  console.log('\n=== Listing All Assets in Database ===');
  
  try {
    // First try to get assets from the public.assets table
    console.log('Fetching assets from public.assets table:');
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
    } else if (!assets || assets.length === 0) {
      console.log('No assets found in the database');
    } else {
      console.log(`Found ${assets.length} assets in the database:`);
      assets.forEach((asset, index) => {
        console.log(`\n[Asset ${index + 1}]`);
        console.log(`- ID: ${asset.id}`);
        console.log(`- Name: ${asset.name}`);
        console.log(`- Type: ${asset.type}`);
        console.log(`- URL: ${asset.url}`);
        console.log(`- User ID: ${asset.user_id}`);
        console.log(`- Client ID: ${asset.client_id}`);
        console.log(`- Created: ${asset.created_at}`);
      });
    }
    
    // Check for recently uploaded assets - use the admin user ID 
    const ADMIN_USER_ID = 'd53c7f82-42af-4ed0-a83b-2cbf505748db';
    console.log('\nChecking specifically for assets belonging to the admin user:');
    const { data: adminAssets, error: adminError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', ADMIN_USER_ID);
    
    if (adminError) {
      console.error('Error fetching admin assets:', adminError);
    } else if (!adminAssets || adminAssets.length === 0) {
      console.log('No assets found for admin user');
    } else {
      console.log(`Found ${adminAssets.length} assets for admin user:`);
      adminAssets.forEach((asset, index) => {
        console.log(`\n[Admin Asset ${index + 1}]`);
        console.log(`- ID: ${asset.id}`);
        console.log(`- Name: ${asset.name}`);
        console.log(`- URL: ${asset.url}`);
        console.log(`- Created: ${asset.created_at}`);
      });
    }
    
    // Check if there are any RLS policies that might be affecting the visibility
    console.log('\nChecking RLS policies on assets table:');
    try {
      const { data: rlsPolicies, error: rlsError } = await supabase
        .rpc('get_rls_policies', { target_table: 'assets' });
        
      if (rlsError) {
        console.log('Could not fetch RLS policies automatically:', rlsError.message);
        console.log('Suggestion: Check RLS policies in the Supabase dashboard');
      } else if (rlsPolicies) {
        console.log('RLS Policies found:', rlsPolicies);
      }
    } catch (rpcError) {
      console.log('RPC function get_rls_policies does not exist. Check RLS policies in the Supabase dashboard.');
    }
  } catch (error) {
    console.error('Unexpected error while listing assets:', error);
  }
  
  console.log('=== Asset Listing Complete ===');
}

// Execute the scripts
async function runAllChecks() {
  await checkDatabaseSchema();
  await listAllAssets();
  console.log('\nScript execution complete');
}

runAllChecks().catch(err => {
  console.error('Unhandled error:', err);
});
