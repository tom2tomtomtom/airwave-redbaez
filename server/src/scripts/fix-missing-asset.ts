import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// The asset ID from your frontend
const MISSING_ASSET_ID = '3feaa091-bd0b-4501-8c67-a5f96c767e1a';

// Use the admin user ID we know exists
const ADMIN_USER_ID = 'd53c7f82-42af-4ed0-a83b-2cbf505748db';

async function fixMissingAsset() {
  console.log('=== Fixing Missing Asset ===');
  
  try {
    // Verify admin user exists
    console.log(`\nVerifying admin user exists (ID: ${ADMIN_USER_ID}):`);
    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', ADMIN_USER_ID)
      .single();
      
    if (userError) {
      console.error('Error fetching admin user:', userError);
      console.log('\nLet\'s try to find a valid user:');
      
      const { data: anyUser, error: anyUserError } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .single();
        
      if (anyUserError) {
        console.error('Could not find any valid user:', anyUserError);
        return;
      }
      
      console.log('Found valid user:', anyUser);
      console.log(`Using user ID: ${anyUser.id}`);
      ADMIN_USER_ID = anyUser.id;
    } else {
      console.log('Admin user found:', adminUser);
    }
    
    // Check if the file exists on filesystem
    console.log('\nVerifying files exist on filesystem:');
    const mainFilePath = path.join(
      process.cwd(), 
      'uploads', 
      `asset-Juniper-Brainfog-Colour-2x-${MISSING_ASSET_ID}.png`
    );
    const thumbnailPath = path.join(
      process.cwd(), 
      'uploads', 
      `thumb-${MISSING_ASSET_ID}.png`
    );
    
    console.log(`Checking main file: ${mainFilePath}`);
    const fileExists = fs.existsSync(mainFilePath);
    console.log(`File ${fileExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    console.log(`Checking thumbnail: ${thumbnailPath}`);
    const thumbExists = fs.existsSync(thumbnailPath);
    console.log(`Thumbnail ${thumbExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    if (!fileExists) {
      console.log('Cannot proceed - file does not exist.');
      return;
    }
    
    // Get the file size
    const fileStats = fs.statSync(mainFilePath);
    const fileSizeBytes = fileStats.size;
    
    // Attempt to create the asset record
    console.log('\nCreating asset record with valid user ID:');
    const newAsset = {
      id: MISSING_ASSET_ID,
      name: 'Juniper Brainfog Colour@2x',
      type: 'image',
      url: `/uploads/asset-Juniper-Brainfog-Colour-2x-${MISSING_ASSET_ID}.png`,
      thumbnail_url: `/uploads/thumb-${MISSING_ASSET_ID}.png`,
      user_id: ADMIN_USER_ID, // Valid user ID
      client_id: 'fe418478-806e-411a-ad0b-1b9a537a8081', // Juniper client ID
      meta: {
        originalName: 'Juniper_Brainfog_Colour@2x.png',
        mimeType: 'image/png',
        size: fileSizeBytes
      }
    };
    
    console.log('Attempting to insert asset with valid user ID:', newAsset);
    const { data: insertResult, error: insertError } = await supabase
      .from('assets')
      .insert(newAsset)
      .select()
      .single();
      
    if (insertError) {
      console.error('Insert failed:', insertError);
      
      // Try alternative approach if owner_id is required but user_id failed
      if (insertError.message.includes('user_id')) {
        console.log('\nTrying alternative with owner_id:');
        newAsset.owner_id = ADMIN_USER_ID;
        
        const { data: ownerInsertResult, error: ownerInsertError } = await supabase
          .from('assets')
          .insert(newAsset)
          .select()
          .single();
          
        if (ownerInsertError) {
          console.error('Owner insert failed:', ownerInsertError);
          console.log('\nPlease check the schema requirements. You might need to modify the assetService.ts code.');
        } else {
          console.log('Success with owner_id approach:', ownerInsertResult);
          console.log('\nAsset should now appear in your UI.');
        }
      }
    } else {
      console.log('Success:', insertResult);
      console.log('\nAsset should now appear in your UI.');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n=== Asset Fix Complete ===');
}

// Run the fix
fixMissingAsset().catch(console.error);
