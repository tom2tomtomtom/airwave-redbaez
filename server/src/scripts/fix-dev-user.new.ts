import { createClient } from '@supabase/supabase-js'

// Load environment variables
import dotenv from 'dotenv'
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
  console.log('=== Development User Fix Script ===');
  console.log('Checking development user in public.users table...');
  
  try {
    // Check if dev user exists in public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', DEV_USER.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking dev user:', checkError);
      process.exit(1);
    }
    
    if (existingUser) {
      console.log('✅ Development user found in public.users:', existingUser);
      
      // Check if properties match what we expect
      let needsUpdate = false;
      const updates: any = {};
      
      if (existingUser.email !== DEV_USER.email) {
        console.log(`❌ Email mismatch: ${existingUser.email} vs expected ${DEV_USER.email}`);
        updates.email = DEV_USER.email;
        needsUpdate = true;
      }
      
      if (existingUser.role !== DEV_USER.role) {
        console.log(`❌ Role mismatch: ${existingUser.role} vs expected ${DEV_USER.role}`);
        updates.role = DEV_USER.role;
        needsUpdate = true;
      }
      
      if (existingUser.name !== DEV_USER.name) {
        console.log(`❌ Name mismatch: ${existingUser.name} vs expected ${DEV_USER.name}`);
        updates.name = DEV_USER.name;
        needsUpdate = true;
      }
      
      // Update user if needed
      if (needsUpdate) {
        console.log('Updating development user with correct properties...');
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', DEV_USER.id);
          
        if (updateError) {
          console.error('❌ Failed to update development user:', updateError);
        } else {
          console.log('✅ Development user updated successfully');
        }
      } else {
        console.log('✅ Development user properties match expected values');
      }
    } else {
      // Create dev user if doesn't exist
      console.log('❌ Development user not found in public.users, creating...');
      
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
        console.error('❌ Failed to create development user:', insertError);
      } else {
        console.log('✅ Development user created successfully');
      }
    }
    
    // Try to check auth.users (might fail due to permissions)
    console.log('Checking development user in auth.users table (may fail due to permissions)...');
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(DEV_USER.id);
      
      if (authError) {
        console.log('❌ Could not access auth.users table:', authError.message);
        console.log('This is expected if you do not have admin permissions.');
      } else if (authUser) {
        console.log('✅ Development user found in auth.users:', authUser);
      } else {
        console.log('❌ Development user not found in auth.users');
      }
    } catch (authError) {
      console.log('❌ Could not access auth.users table:', authError);
      console.log('This is expected if you do not have admin permissions.');
    }
    
    // Verify constraint check directly
    console.log('Testing foreign key constraint directly...');
    
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
      console.error('❌ Foreign key constraint test failed:', testError);
      console.log('This suggests there may be additional constraints or RLS policies in place.');
    } else {
      console.log('✅ Foreign key constraint test passed successfully:', testData);
      
      // Clean up test asset
      const { error: deleteError } = await supabase
        .from('assets')
        .delete()
        .eq('id', testData.id);
        
      if (deleteError) {
        console.log('❌ Failed to clean up test asset:', deleteError);
      } else {
        console.log('✅ Test asset cleaned up successfully');
      }
    }
  } catch (error) {
    console.error('Unexpected error fixing dev user:', error);
    process.exit(1);
  }
  
  console.log('=== Script Complete ===');
}

// Execute the script
fixDevUser().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
