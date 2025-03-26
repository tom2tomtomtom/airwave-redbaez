import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// List of user IDs to check (from the screenshot)
const userIds = [
  '00000000-0000-0000-0000-000000000000', // Dev User
  '111111-111-111-111-11111111111', // Test User
  '46be7eb7-f633-4e72-bb5b-6a5e6aa6b280', // tom@redbaez.com
  '47842273-460b-4255-9333-033d768caf51', // Dev User 2
  'd52c78d2-42af-4e40-9839-26bf5037de8b'  // dev@example.com admin
];

async function checkAllUsers() {
  console.log('=== Checking All Users ===');

  try {
    // First, get all users from the public.users table
    console.log('\nFetching all users from public.users:');
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('*');
      
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log(`Found ${allUsers?.length || 0} users in public.users table`);
      allUsers?.forEach(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
      });
    }
    
    // Now check each user ID individually
    console.log('\nChecking each user ID individually:');
    
    for (const id of userIds) {
      console.log(`\nChecking user ID: ${id}`);
      
      // Check in public.users
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
        
      if (publicError && publicError.code !== 'PGRST116') {
        console.error(`Error checking public.users for ID ${id}:`, publicError);
      } else if (publicUser) {
        console.log(`✅ User exists in public.users: ${publicUser.email} (${publicUser.role})`);
      } else {
        console.log(`❌ User does NOT exist in public.users`);
      }
    }
    
    // Try inserting a test asset with Tom's user ID
    const tomUserId = '46be7eb7-f633-4e72-bb5b-6a5e6aa6b280';
    console.log(`\nTrying to insert a test asset with Tom's user ID (${tomUserId}):`);
    
    // Find a valid client ID first
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .limit(1);
      
    if (clientError) {
      console.error('Error finding client:', clientError);
    } else if (clientData && clientData.length > 0) {
      const clientId = clientData[0].id;
      console.log(`Using client: ${clientData[0].name} (${clientId})`);
      
      const { data: assetInsert, error: assetError } = await supabase
        .from('assets')
        .insert({
          id: '9999-test-asset-1111',
          name: 'Test Asset',
          type: 'text/plain',
          url: '/uploads/test-asset.txt',
          user_id: tomUserId,
          client_id: clientId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
        
      if (assetError) {
        console.error('Asset insert error:', assetError);
      } else {
        console.log('Asset insert success:', assetInsert);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n=== User Check Complete ===');
}

// Run the check
checkAllUsers().catch(console.error);
