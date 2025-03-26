import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv'
dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Development email and password - you would need to create this user in Supabase Auth
const DEV_EMAIL = 'dev@example.com';
const DEV_PASSWORD = 'testing123'; // In a real app, use environment variables

async function testAuthenticatedUpload() {
  console.log('=== Authenticated Upload Test ===');
  
  try {
    // Step 1: Try to sign in with the dev credentials
    console.log('\nAttempting to sign in...');
    let authResult = await supabase.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });
    
    let authData = authResult.data;
    let authError = authResult.error;
    
    if (authError) {
      console.error('Authentication failed:', authError);
      
      // If the user doesn't exist, try to sign them up
      if (authError.message.includes('Invalid login credentials')) {
        console.log('\nTrying to sign up the dev user...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: DEV_EMAIL,
          password: DEV_PASSWORD,
        });
        
        if (signUpError) {
          console.error('Sign up failed:', signUpError);
          console.log('\nImportant: You need to create a user in Supabase Auth');
          console.log('Visit your Supabase dashboard and create a user with:');
          console.log(`Email: ${DEV_EMAIL}`);
          console.log('Password: (use a secure password)');
          return;
        } else {
          console.log('Sign up successful:', signUpData.user);
          
          // Wait for the user to be created fully
          console.log('Waiting for the user to be fully processed...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try to sign in again
          const { data: retryAuth, error: retryError } = await supabase.auth.signInWithPassword({
            email: DEV_EMAIL,
            password: DEV_PASSWORD,
          });
          
          if (retryError) {
            console.error('Retry authentication failed:', retryError);
            
            if (retryError.message.includes('Email not confirmed')) {
              console.log('\nImportant: You need to confirm the email address.');
              console.log('Check your email inbox or confirm the user manually in the Supabase dashboard');
              return;
            }
            
            return;
          } else {
            console.log('Retry authentication successful!');
            // Use the new session data
            authData = retryAuth;
          }
        }
      } else {
        return;
      }
    }
    
    // Check if we have an authenticated session
    if (!authData.session) {
      console.log('No session found. Authentication failed.');
      return;
    }
    
    console.log('Authentication successful!');
    console.log('User ID from auth.users:', authData.user?.id);
    
    // Step 2: Check if the authenticated user exists in public.users
    console.log('\nChecking if authenticated user exists in public.users...');
    const { data: publicUser, error: publicUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user?.id)
      .single();
      
    if (publicUserError) {
      console.error('Error checking public.users:', publicUserError);
      
      if (publicUserError.code === 'PGRST116') {
        console.log('User not found in public.users, creating matching record...');
        
        // Create a matching user in public.users
        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .upsert({
            id: authData.user?.id,
            email: authData.user?.email,
            name: 'Authenticated Dev User',
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
          
        if (createError) {
          console.error('Error creating user in public.users:', createError);
          return;
        } else {
          console.log('User created in public.users:', createdUser);
          // Don't modify publicUser, just log the created data
        }
      } else {
        return;
      }
    } else {
      console.log('User found in public.users:', publicUser);
    }
    
    // Step 3: Find a valid client_id
    console.log('\nFinding a valid client_id...');
    let clientId = null;
    
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .limit(1);
      
    if (clientsError) {
      console.error('Error accessing clients table:', clientsError);
      
      // Generate a UUID for client_id
      clientId = uuidv4();
      console.log('Generated new clientId:', clientId);
    } else if (clientsData && clientsData.length > 0) {
      clientId = clientsData[0].id;
      console.log('Using existing clientId:', clientId);
    } else {
      clientId = uuidv4();
      console.log('No clients found, using generated clientId:', clientId);
    }
    
    // Step 4: Create a test file for upload
    console.log('\nCreating test file...');
    const testDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'auth-test-asset.txt');
    const testContent = 'This is an authenticated test asset file';
    fs.writeFileSync(testFilePath, testContent);
    
    const assetId = uuidv4();
    const assetUrl = `/uploads/${assetId}.txt`;
    
    // Step 5: Try to insert an asset using the authenticated user's ID
    console.log('\nTrying to insert asset with authenticated user ID...');
    console.log('Using user ID from auth:', authData.user?.id);
    
    const assetData = {
      id: assetId,
      name: 'Auth Test Asset',
      type: 'text/plain',
      url: assetUrl,
      user_id: authData.user?.id,
      client_id: clientId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertedAsset, error: insertError } = await supabase
      .from('assets')
      .insert(assetData)
      .select();
      
    if (insertError) {
      console.error('Asset insert failed:', insertError);
      
      // Try simplified asset data
      console.log('\nTrying with minimal required fields...');
      const minimalAsset = {
        id: uuidv4(),
        name: 'Minimal Auth Asset',
        type: 'text/plain',
        url: `/uploads/minimal-auth-${Date.now()}.txt`,
        user_id: authData.user?.id
      };
      
      const { data: minimalInsert, error: minimalError } = await supabase
        .from('assets')
        .insert(minimalAsset)
        .select();
        
      if (minimalError) {
        console.error('Minimal asset insert failed:', minimalError);
      } else {
        console.log('Minimal asset insert succeeded:', minimalInsert);
      }
    } else {
      console.log('Asset insert succeeded:', insertedAsset);
    }
    
    // Step 6: Check for all assets in the database
    console.log('\nChecking for all assets...');
    const { data: allAssets, error: allAssetsError } = await supabase
      .from('assets')
      .select('*');
      
    if (allAssetsError) {
      console.error('Error retrieving assets:', allAssetsError);
    } else {
      console.log(`Found ${allAssets?.length || 0} assets in database`);
      if (allAssets && allAssets.length > 0) {
        allAssets.forEach(asset => {
          console.log(`- ${asset.id}: ${asset.name} (${asset.url})`);
        });
      }
    }
    
    // Clean up
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    console.log('\nTest complete!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testAuthenticatedUpload().catch(console.error);
