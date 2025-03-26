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

async function findMissingAsset() {
  console.log('=== Looking for Missing Asset ===');
  
  try {
    // Check if asset exists in database
    console.log(`\nChecking if asset exists in database (ID: ${MISSING_ASSET_ID}):`);
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', MISSING_ASSET_ID)
      .single();
      
    if (assetError) {
      if (assetError.code === 'PGRST116') {
        console.log(`Asset with ID ${MISSING_ASSET_ID} NOT FOUND in database`);
      } else {
        console.error('Error fetching asset by ID:', assetError);
      }
    } else if (asset) {
      console.log('Asset found in database:', asset);
      return;
    }
    
    // Check if the file exists on filesystem
    console.log('\nChecking if file exists on filesystem:');
    const expectedPath = path.join(
      process.cwd(), 
      'uploads', 
      `asset-Juniper-Brainfog-Colour-2x-${MISSING_ASSET_ID}.png`
    );
    const thumbnailPath = path.join(
      process.cwd(), 
      'uploads', 
      `thumb-${MISSING_ASSET_ID}.png`
    );
    
    console.log(`Checking main file at: ${expectedPath}`);
    const fileExists = fs.existsSync(expectedPath);
    console.log(`File ${fileExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    console.log(`Checking thumbnail at: ${thumbnailPath}`);
    const thumbExists = fs.existsSync(thumbnailPath);
    console.log(`Thumbnail ${thumbExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    if (fileExists) {
      console.log('\nFile exists but record is missing from database!');
      
      // Examine RLS policies
      console.log('\nChecking if RLS policies might be preventing inserts:');
      try {
        // Test a minimal insert to check for insert permissions
        const testAsset = {
          id: 'test-' + Date.now(),
          name: 'Test Asset',
          type: 'image',
          url: '/uploads/test.png',
          user_id: '00000000-0000-0000-0000-000000000000',
          client_id: 'fe418478-806e-411a-ad0b-1b9a537a8081'
        };
        
        const { data: insertResult, error: insertError } = await supabase
          .from('assets')
          .insert(testAsset)
          .select();
          
        if (insertError) {
          console.error('Insert test failed - likely an RLS policy issue:', insertError);
          console.log('\nThis suggests your asset uploads are failing due to RLS policy restrictions.');
          console.log('Check Supabase dashboard for assets table RLS policies.');
        } else {
          console.log('Insert test succeeded:', insertResult);
          console.log('\nThis suggests there might be an issue in your upload code not properly creating the database record.');
          
          // Clean up test asset
          await supabase.from('assets').delete().eq('id', testAsset.id);
        }
      } catch (error) {
        console.error('Error during insert test:', error);
      }
      
      // Attempt to recreate the missing asset record
      console.log('\nAttempting to recreate the missing asset record:');
      const reconstructedAsset = {
        id: MISSING_ASSET_ID,
        name: 'Juniper Brainfog Colour@2x',
        type: 'image',
        url: `/uploads/asset-Juniper-Brainfog-Colour-2x-${MISSING_ASSET_ID}.png`,
        thumbnail_url: `/uploads/thumb-${MISSING_ASSET_ID}.png`,
        user_id: '00000000-0000-0000-0000-000000000000', // Default dev user
        client_id: 'fe418478-806e-411a-ad0b-1b9a537a8081', // Juniper client ID
        meta: {
          originalName: 'Juniper_Brainfog_Colour@2x.png',
          mimeType: 'image/png'
        }
      };
      
      console.log('Attempting to insert reconstructed asset:', reconstructedAsset);
      const { data: recreateResult, error: recreateError } = await supabase
        .from('assets')
        .insert(reconstructedAsset)
        .select()
        .single();
        
      if (recreateError) {
        console.error('Failed to recreate asset record:', recreateError);
        console.log('You might need to manually create this record or debug your asset service code.');
      } else {
        console.log('Successfully recreated asset record:', recreateResult);
        console.log('Asset should now appear in your UI.');
      }
    }
    
    // Check if there are any temporary records we can find
    console.log('\nChecking for any asset records with similar name:');
    const { data: similarAssets, error: similarError } = await supabase
      .from('assets')
      .select('*')
      .ilike('name', '%Juniper%Brainfog%');
      
    if (similarError) {
      console.error('Error searching for similar assets:', similarError);
    } else if (similarAssets && similarAssets.length > 0) {
      console.log(`Found ${similarAssets.length} similar assets:`);
      similarAssets.forEach(asset => console.log('-', asset.id, asset.name, asset.url));
    } else {
      console.log('No similar assets found.');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n=== Asset Search Complete ===');
}

// Run the search
findMissingAsset().catch(console.error);
