import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv'
dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Development user ID constant
const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

async function fixForeignKeyConstraint() {
  logger.info('=== Foreign Key Constraint Fix ===');
  
  try {
    // 1. First, get information about the users table to understand the schema
    logger.info('\nExamining users table schema...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10);
      
    if (usersError) {
      logger.error('Error accessing users table:', usersError);
      return;
    }
    
    logger.info(`Users table has ${usersData.length} entries`);
    if (usersData.length > 0) {
      logger.info('Users table columns:', Object.keys(usersData[0]));
      // Log the first user to see its structure
      logger.info('Sample user:', usersData[0]);
    }
    
    // 2. Check for dev user in the users table
    logger.info('\nLooking for development user in users table...');
    const { data: devUser, error: devUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', DEV_USER_ID);
      
    if (devUserError) {
      logger.error('Error checking for dev user:', devUserError);
    } else if (devUser && devUser.length > 0) {
      logger.info('Development user found in users table:', devUser[0]);
    } else {
      logger.info('Development user NOT found in users table, creating...');
      
      // Create the development user
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .upsert({
          id: DEV_USER_ID,
          email: 'dev-user-00000000-0000-0000-0000-000000000000@example.com',
          name: 'Development User',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
        
      if (createError) {
        logger.error('Error creating development user:', createError);
      } else {
        logger.info('Development user created successfully:', createdUser);
      }
    }
    
    // 3. Check auth.users table for the dev user (might fail due to permissions)
    logger.info('\nAttempting to check auth.users table (may fail due to permissions)...');
    
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(DEV_USER_ID);
      
      if (authError) {
        logger.error('Error accessing auth.users table:', authError);
      } else if (authData && authData.user) {
        logger.info('User found in auth.users table:', authData.user);
      } else {
        logger.info('User NOT found in auth.users table');
      }
    } catch (error) {
      logger.info('Cannot access auth.users table directly (expected):', error);
    }
    
    // 4. Get information about the assets table schema
    logger.info('\nExamining assets table schema...');
    const { data: assetsSchema, error: assetsSchemaError } = await supabase
      .from('assets')
      .select('*')
      .limit(1);
      
    if (assetsSchemaError) {
      logger.error('Error accessing assets table:', assetsSchemaError);
    } else {
      if (assetsSchema && assetsSchema.length > 0) {
        logger.info('Assets table columns:', Object.keys(assetsSchema[0]));
        logger.info('Sample asset:', assetsSchema[0]);
      } else {
        logger.info('Assets table exists but has no entries');
      }
    }
    
    // 5. Find a valid client_id to use
    logger.info('\nFinding a valid client_id...');
    let clientId = null;
    
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .limit(5);
      
    if (clientsError) {
      logger.error('Error accessing clients table:', clientsError);
    } else if (clientsData && clientsData.length > 0) {
      logger.info('Available clients:');
      clientsData.forEach(client => {
        logger.info(`- ${client.id}: ${client.name}`);
      });
      clientId = clientsData[0].id;
    } else {
      logger.info('No clients found, generating a UUID to use');
      clientId = uuidv4();
    }
    
    // 6. Check for existing assets to understand schema
    logger.info('\nChecking for existing assets...');
    const { data: existingAssets, error: existingAssetsError } = await supabase
      .from('assets')
      .select('*');
      
    if (existingAssetsError) {
      logger.error('Error checking existing assets:', existingAssetsError);
    } else {
      logger.info(`Found ${existingAssets.length} existing assets`);
      if (existingAssets.length > 0) {
        logger.info('Sample asset:', existingAssets[0]);
      }
    }
    
    // 7. Try direct intervention with the database to fix the foreign key issue
    logger.info('\nAttempting to test the foreign key constraint directly...');
    
    // Get user IDs from both tables to check for discrepancies
    const { data: publicUserIds, error: publicIdsError } = await supabase
      .from('users')
      .select('id');
      
    if (publicIdsError) {
      logger.error('Error getting user IDs from public.users:', publicIdsError);
    } else {
      logger.info(`Found ${publicUserIds.length} user IDs in public.users`);
      logger.info('First few user IDs:', publicUserIds.slice(0, 3).map(u => u.id));
      
      // Check if DEV_USER_ID is in the list
      const devUserFound = publicUserIds.some(u => u.id === DEV_USER_ID);
      logger.info(`Development user ID found in public.users: ${devUserFound}`);
    }
    
    // 8. Perform database health check
    logger.info('\nPerforming database health check...');
    
    // Try inserting a minimal asset to test the foreign key constraint
    const testAssetId = uuidv4();
    const { data: testInsert, error: testInsertError } = await supabase
      .from('assets')
      .insert({
        id: testAssetId,
        name: 'FK Test Asset',
        type: 'text/plain',
        url: `/uploads/fk-test-${testAssetId}.txt`,
        user_id: DEV_USER_ID,
        client_id: clientId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
      
    if (testInsertError) {
      logger.error('Test insert failed:', testInsertError);
      
      // If it's the foreign key constraint error, examine it closely
      if (testInsertError.code === '23503') {
        logger.info('\nAnalyzing foreign key constraint error...');
        logger.info('Error details:', testInsertError.details);
        
        // Extract more information about this constraint
        if (testInsertError.details.includes('Key is not present in table "users"')) {
          logger.info('\nThe issue is that the user ID is not recognized by the foreign key constraint.');
          logger.info('This suggests one of the following issues:');
          logger.info('1. The users table that assets.user_id references is actually in a different schema than public');
          logger.info('2. There are RLS policies preventing access to the referenced user');
          logger.info('3. The user exists in public.users but not in auth.users');
          
          // Try to verify schema
          logger.info('\nAttempting to recreate the development user with exact same ID...');
          
          // Try recreating the user with the exact same ID
          const { error: recreateError } = await supabase
            .from('users')
            .upsert({
              id: DEV_USER_ID,
              email: 'dev-user-00000000-0000-0000-0000-000000000000@example.com',
              name: 'Development User',
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (recreateError) {
            logger.error('Error recreating development user:', recreateError);
          } else {
            logger.info('Development user recreated successfully');
            
            // Try the insert again
            logger.info('\nTrying insert again after recreating the user...');
            const retryAssetId = uuidv4();
            const { data: retryInsert, error: retryError } = await supabase
              .from('assets')
              .insert({
                id: retryAssetId,
                name: 'FK Retry Test Asset',
                type: 'text/plain',
                url: `/uploads/retry-test-${retryAssetId}.txt`,
                user_id: DEV_USER_ID,
                client_id: clientId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select();
              
            if (retryError) {
              logger.error('Retry insert failed:', retryError);
            } else {
              logger.info('Retry insert succeeded:', retryInsert);
            }
          }
          
          // Try to verify if the constraint points to auth.users instead of public.users
          logger.info('\nChecking if the foreign key might reference auth.users instead of public.users...');
          
          // Try with a different user ID that might exist in auth.users
          logger.info('\nLooking for another valid user ID to test with...');
          if (publicUserIds && publicUserIds.length > 1) {
            const alternateUserId = publicUserIds.find(u => u.id !== DEV_USER_ID)?.id;
            
            if (alternateUserId) {
              logger.info(`Found alternate user ID: ${alternateUserId}`);
              
              const altAssetId = uuidv4();
              const { data: altInsert, error: altError } = await supabase
                .from('assets')
                .insert({
                  id: altAssetId,
                  name: 'Alternate User Test Asset',
                  type: 'text/plain',
                  url: `/uploads/alt-user-test-${altAssetId}.txt`,
                  user_id: alternateUserId,
                  client_id: clientId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select();
                
              if (altError) {
                logger.error('Alternate user insert failed:', altError);
              } else {
                logger.info('Alternate user insert succeeded:', altInsert);
              }
            }
          }
        }
      }
    } else {
      logger.info('Test insert succeeded:', testInsert);
    }
    
    // 9. Final check to see all assets in the database
    logger.info('\nFinal check for assets in the database...');
    const { data: finalAssets, error: finalError } = await supabase
      .from('assets')
      .select('*');
      
    if (finalError) {
      logger.error('Error getting final assets list:', finalError);
    } else {
      logger.info(`Found ${finalAssets.length} assets in total`);
      if (finalAssets.length > 0) {
        logger.info('Latest assets:');
        finalAssets.slice(0, 5).forEach(asset => {
          logger.info(`- ${asset.id}: ${asset.name} (${asset.url})`);
        });
      }
    }
    
  } catch (error) {
    logger.error('Unexpected error:', error);
  }
  
  logger.info('=== Foreign Key Constraint Fix Complete ===');
}

// Run the function
fixForeignKeyConstraint().catch(console.error);
