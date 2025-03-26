// Simple JS version to avoid TypeScript compilation issues
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with the service role key for admin access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Development user constants
const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';
const DEV_EMAIL = 'dev@example.com';
const DEV_NAME = 'Development User';
const DEV_ROLE = 'admin';

async function fixDevUser() {
  console.log('Starting development user fix...');
  console.log(`Using development user ID: ${DEV_USER_ID}`);
  
  try {
    // First check if the user exists in the public.users table
    console.log('Checking public.users table...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id')
      .eq('id', DEV_USER_ID)
      .single();
    
    if (dbError || !dbUser) {
      console.log('User not found in public.users, inserting...');
      
      // Try direct insert with service role key (bypasses RLS)
      const { data: directData, error: directError } = await supabase
        .from('users')
        .upsert({
          id: DEV_USER_ID,
          email: DEV_EMAIL,
          name: DEV_NAME,
          role: DEV_ROLE,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      
      if (directError) {
        console.log('Error with direct insert to public.users:', directError.message);
        console.log('Details:', directError);
        
        // Try SQL approach as last resort
        console.log('Attempting SQL approach...');
        const { data: sqlData, error: sqlError } = await supabase.rpc('force_insert_dev_user');
        
        if (sqlError) {
          console.log('SQL approach failed:', sqlError.message);
        } else {
          console.log('SQL approach succeeded');
        }
      } else {
        console.log('User inserted into public.users via direct insert');
      }
    } else {
      console.log('User exists in public.users:', dbUser.id);
    }
    
    // Verify the user now exists
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', DEV_USER_ID)
      .single();
    
    if (verifyError || !verifyUser) {
      console.log('VERIFICATION FAILED: User still not in public.users:', verifyError?.message);
    } else {
      console.log('VERIFICATION SUCCESS: Development user exists in public.users');
      console.log('User details:', verifyUser);
      
      // Now try to update an example asset directly with this user ID
      console.log('Attempting to insert a test asset...');
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .insert({
          name: 'Test Asset',
          type: 'image',
          user_id: DEV_USER_ID,
          url: '/test/url.jpg',
          thumbnail_url: '/test/thumb.jpg',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (assetError) {
        console.log('Asset insertion still failing:', assetError.message);
        console.log('This suggests there may be a schema issue or RLS policy blocking insertion');
      } else {
        console.log('Successfully inserted test asset!');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error.message || error);
  }
}

// Let's create a SQL function to force user insertion
async function createSqlFunction() {
  console.log('Creating SQL function for force insertion...');
  
  const functionDef = `
  CREATE OR REPLACE FUNCTION force_insert_dev_user()
  RETURNS void AS $$
  BEGIN
    -- Use highest privileges to bypass all restrictions
    SET LOCAL role postgres;
    
    -- Force insert the development user
    INSERT INTO public.users (id, email, name, role, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', 'dev@example.com', 'Development User', 'admin', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      updated_at = NOW();
      
    RESET role;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  try {
    // We need to use raw SQL for this
    const { error } = await supabase.rpc('exec_sql', { sql: functionDef });
    
    if (error) {
      console.log('Error creating SQL function:', error.message);
      console.log('Function creation might require direct database access');
    } else {
      console.log('SQL function created successfully');
    }
  } catch (error) {
    console.log('Exception creating SQL function:', error.message || error);
  }
}

// Run both functions
Promise.resolve()
  .then(createSqlFunction)
  .then(fixDevUser)
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
