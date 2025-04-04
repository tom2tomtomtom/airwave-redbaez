import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
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
  logger.info('=== Checking All Users ===');

  try {
    // First, get all users from the public.users table
    logger.info('\nFetching all users from public.users:');
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('*');
      
    if (usersError) {
      logger.error('Error fetching users:', usersError);
    } else {
      logger.info(`Found ${allUsers?.length || 0} users in public.users table`);
      allUsers?.forEach(user => {
        logger.info(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
      });
    }
    
    // Now check each user ID individually
    logger.info('\nChecking each user ID individually:');
    
    for (const id of userIds) {
      logger.info(`\nChecking user ID: ${id}`);
      
      // Check in public.users
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
        
      if (publicError && publicError.code !== 'PGRST116') {
        logger.error(`Error checking public.users for ID ${id}:`, publicError);
      } else if (publicUser) {
        logger.info(`✅ User exists in public.users: ${publicUser.email} (${publicUser.role})`);
      } else {
        logger.info(`❌ User does NOT exist in public.users`);
      }
    }
    
    // Try inserting a test asset with Tom's user ID
    const tomUserId = '46be7eb7-f633-4e72-bb5b-6a5e6aa6b280';
    logger.info(`\nTrying to insert a test asset with Tom's user ID (${tomUserId}):`);
    
    // Find a valid client ID first
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .limit(1);
      
    if (clientError) {
      logger.error('Error finding client:', clientError);
    } else if (clientData && clientData.length > 0) {
      const clientId = clientData[0].id;
      logger.info(`Using client: ${clientData[0].name} (${clientId})`);
      
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
        logger.error('Asset insert error:', assetError);
      } else {
        logger.info('Asset insert success:', assetInsert);
      }
    }
    
  } catch (error) {
    logger.error('Unexpected error:', error);
  }
  
  logger.info('\n=== User Check Complete ===');
}

// Run the check
checkAllUsers().catch(console.error);
