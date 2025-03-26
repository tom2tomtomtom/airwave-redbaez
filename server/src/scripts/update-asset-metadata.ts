import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// The asset ID from the frontend
const ASSET_ID = '3feaa091-bd0b-4501-8c67-a5f96c767e1a';

async function updateAssetMetadata() {
  console.log('=== Updating Asset Metadata ===');
  
  try {
    // 1. Get current asset data
    console.log(`\nFetching asset data (ID: ${ASSET_ID}):`);
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', ASSET_ID)
      .single();
      
    if (assetError) {
      console.error('Error fetching asset by ID:', assetError);
      return;
    }
    
    console.log('Asset found in database:', asset);
    
    // 2. Update only the fields that are valid in the database schema
    console.log('\nUpdating asset with proper metadata:');
    
    // Enhance the metadata with fields needed by the UI
    const enhancedMeta = {
      ...asset.meta,
      size: asset.meta?.size || 12253,
      width: asset.meta?.width || 400, // Add reasonable width for image
      height: asset.meta?.height || 400, // Add reasonable height for image
      originalName: asset.meta?.originalName || 'Juniper_Brainfog_Colour@2x.png',
      mimeType: asset.meta?.mimeType || 'image/png',
      tags: [],
      categories: [],
      description: 'Juniper Brainfog Colour Graphic'
    };
    
    // Database fields only (no clientId, userId, etc. which don't exist in the schema)
    const updatedAsset = {
      owner_id: asset.user_id, // Make sure owner_id matches user_id
      meta: enhancedMeta
    };
    
    console.log('Updating with:', updatedAsset);
    
    // Update the asset in the database
    const { data: updateResult, error: updateError } = await supabase
      .from('assets')
      .update(updatedAsset)
      .eq('id', ASSET_ID)
      .select()
      .single();
      
    if (updateError) {
      console.error('Update failed:', updateError);
    } else {
      console.log('Update successful:', updateResult);
      console.log('\nAsset metadata has been updated.');
    }
    
    // 3. Check if the ClientSelector component is loading the correct client
    console.log('\nDebugging client selection:');
    console.log(`This asset belongs to client ID: ${asset.client_id}`);
    
    // Look up the client name
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name')
      .eq('id', asset.client_id)
      .single();
      
    if (clientError) {
      console.log(`Could not find client with ID ${asset.client_id}`);
    } else {
      console.log(`Client name: ${client.name}`);
      console.log(`Make sure you've selected the client "${client.name}" in the UI`);
    }
    
    console.log('\nTroubleshooting steps:');
    console.log('1. Make sure you have selected the correct client in the UI');
    console.log('2. Check the asset type filter is set to "image" or "all"');
    console.log('3. Try hard-refreshing the browser (Ctrl+F5 or Cmd+Shift+R)');
    console.log('4. Clear browser cache if needed');
    console.log('5. Check the browser console for any errors related to fetching assets');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n=== Asset Update Complete ===');
}

// Run the update
updateAssetMetadata().catch(console.error);
