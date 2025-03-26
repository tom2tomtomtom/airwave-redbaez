import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv'
dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Development user ID constant
const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

async function fixForeignKeyConstraint() {
  console.log('=== Foreign Key Constraint Fix ===');
  
  try {
    // 1. First, get information about the users table to understand the schema
    console.log('\nExamining users table schema...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10);
      
    if (usersError) {
      console.error('Error accessing users table:', usersError);
      return;
    }
    
    console.log(`Users table has ${usersData.length} entries`);
    if (usersData.length > 0) {
      console.log('Users table columns:', Object.keys(usersData[0]));
      // Log the first user to see its structure
      console.log('Sample user:', usersData[0]);
    }
    
    // 2. Check for dev user in the users table
    console.log('\nLooking for development user in users table...');
    const { data: devUser, error: devUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', DEV_USER_ID);
      
    if (devUserError) {
      console.error('Error checking for dev user:', devUserError);
    } else if (devUser && devUser.length > 0) {
      console.log('Development user found in users table:', devUser[0]);
    } else {
      console.log('Development user NOT found in users table, creating...');
      
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
        console.error('Error creating development user:', createError);
      } else {
        console.log('Development user created successfully:', createdUser);
      }
    }
    
    // 3. Check auth.users table for the dev user (might fail due to permissions)
    console.log('\nAttempting to check auth.users table (may fail due to permissions)...');
    
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(DEV_USER_ID);
      
      if (authError) {
        console.error('Error accessing auth.users table:', authError);
      } else if (authData && authData.user) {
        console.log('User found in auth.users table:', authData.user);
      } else {
        console.log('User NOT found in auth.users table');
      }
    } catch (error) {
      console.log('Cannot access auth.users table directly (expected):', error);
    }
    
    // 4. Get information about the assets table schema
    console.log('\nExamining assets table schema...');
    const { data: assetsSchema, error: assetsSchemaError } = await supabase
      .from('assets')
      .select('*')
      .limit(1);
      
    if (assetsSchemaError) {
      console.error('Error accessing assets table:', assetsSchemaError);
    } else {
      if (assetsSchema && assetsSchema.length > 0) {
        console.log('Assets table columns:', Object.keys(assetsSchema[0]));
        console.log('Sample asset:', assetsSchema[0]);
      } else {
        console.log('Assets table exists but has no entries');
      }
    }
    
    // 5. Find a valid client_id to use
    console.log('\nFinding a valid client_id...');
    let clientId = null;
    
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .limit(5);
      
    if (clientsError) {
      console.error('Error accessing clients table:', clientsError);
    } else if (clientsData && clientsData.length > 0) {
      console.log('Available clients:');
      clientsData.forEach(client => {
        console.log(`- ${client.id}: ${client.name}`);
      });
      clientId = clientsData[0].id;
    } else {
      console.log('No clients found, generating a UUID to use');
      clientId = uuidv4();
    }
    
    // 6. Check for existing assets to understand schema
    console.log('\nChecking for existing assets...');
    const { data: existingAssets, error: existingAssetsError } = await supabase
      .from('assets')
      .select('*');
      
    if (existingAssetsError) {
      console.error('Error checking existing assets:', existingAssetsError);
    } else {
      console.log(`Found ${existingAssets.length} existing assets`);
      if (existingAssets.length > 0) {
        console.log('Sample asset:', existingAssets[0]);
      }
    }
    
    // 7. Try direct intervention with the database to fix the foreign key issue
    console.log('\nAttempting to test the foreign key constraint directly...');
    
    // Get user IDs from both tables to check for discrepancies
    const { data: publicUserIds, error: publicIdsError } = await supabase
      .from('users')
      .select('id');
      
    if (publicIdsError) {
      console.error('Error getting user IDs from public.users:', publicIdsError);
    } else {
      console.log(`Found ${publicUserIds.length} user IDs in public.users`);
      console.log('First few user IDs:', publicUserIds.slice(0, 3).map(u => u.id));
      
      // Check if DEV_USER_ID is in the list
      const devUserFound = publicUserIds.some(u => u.id === DEV_USER_ID);
      console.log(`Development user ID found in public.users: ${devUserFound}`);
    }
    
    // 8. Perform database health check
    console.log('\nPerforming database health check...');
    
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
      console.error('Test insert failed:', testInsertError);
      
      // If it's the foreign key constraint error, examine it closely
      if (testInsertError.code === '23503') {
        console.log('\nAnalyzing foreign key constraint error...');
        console.log('Error details:', testInsertError.details);
        
        // Extract more information about this constraint
        if (testInsertError.details.includes('Key is not present in table "users"')) {
          console.log('\nThe issue is that the user ID is not recognized by the foreign key constraint.');
          console.log('This suggests one of the following issues:');
          console.log('1. The users table that assets.user_id references is actually in a different schema than public');
          console.log('2. There are RLS policies preventing access to the referenced user');
          console.log('3. The user exists in public.users but not in auth.users');
          
          // Try to verify schema
          console.log('\nAttempting to recreate the development user with exact same ID...');
          
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
            console.error('Error recreating development user:', recreateError);
          } else {
            console.log('Development user recreated successfully');
            
            // Try the insert again
            console.log('\nTrying insert again after recreating the user...');
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
              console.error('Retry insert failed:', retryError);
            } else {
              console.log('Retry insert succeeded:', retryInsert);
            }
          }
          
          // Try to verify if the constraint points to auth.users instead of public.users
          console.log('\nChecking if the foreign key might reference auth.users instead of public.users...');
          
          // Try with a different user ID that might exist in auth.users
          console.log('\nLooking for another valid user ID to test with...');
          if (publicUserIds && publicUserIds.length > 1) {
            const alternateUserId = publicUserIds.find(u => u.id !== DEV_USER_ID)?.id;
            
            if (alternateUserId) {
              console.log(`Found alternate user ID: ${alternateUserId}`);
              
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
                console.error('Alternate user insert failed:', altError);
              } else {
                console.log('Alternate user insert succeeded:', altInsert);
              }
            }
          }
        }
      }
    } else {
      console.log('Test insert succeeded:', testInsert);
    }
    
    // 9. Final check to see all assets in the database
    console.log('\nFinal check for assets in the database...');
    const { data: finalAssets, error: finalError } = await supabase
      .from('assets')
      .select('*');
      
    if (finalError) {
      console.error('Error getting final assets list:', finalError);
    } else {
      console.log(`Found ${finalAssets.length} assets in total`);
      if (finalAssets.length > 0) {
        console.log('Latest assets:');
        finalAssets.slice(0, 5).forEach(asset => {
          console.log(`- ${asset.id}: ${asset.name} (${asset.url})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('=== Foreign Key Constraint Fix Complete ===');
}

// Run the function
fixForeignKeyConstraint().catch(console.error);
