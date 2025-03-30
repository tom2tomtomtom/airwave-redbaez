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

async function fixAssetForUI() {
  console.log('=== Fixing Asset for UI Display ===');
  
  try {
    // 1. Check if asset exists in database
    console.log(`\nChecking current asset status in database (ID: ${ASSET_ID}):`);
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
    
    // 2. Update the asset with proper metadata field names to match frontend expectations
    console.log('\nUpdating asset with proper field structure for UI:');
    
    // Add additional fields expected by the frontend
    const updatedAsset = {
      // Fields expected by the UI
      owner_id: asset.user_id, // Ensure owner_id matches user_id
      size: asset.meta?.size || 12253, // Size expected by UI
      height: asset.meta?.height || 0, // Height expected by UI
      width: asset.meta?.width || 0, // Width expected by UI
      metadata: {
        originalName: asset.meta?.originalName || 'Juniper_Brainfog_Colour@2x.png',
        mimeType: asset.meta?.mimeType || 'image/png'
      },
      // Client uses different field names, so add them
      clientId: asset.client_id,
      userId: asset.user_id,
      ownerId: asset.user_id,
      // Ensure meta and metadata both exist
      meta: {
        ...asset.meta,
        size: asset.meta?.size || 12253,
        width: asset.meta?.width || 0,
        height: asset.meta?.height || 0,
        originalName: asset.meta?.originalName || 'Juniper_Brainfog_Colour@2x.png',
        mimeType: asset.meta?.mimeType || 'image/png',
        // Specific fields needed by frontend
        tags: asset.meta?.tags || [],
        categories: asset.meta?.categories || [],
        description: asset.meta?.description || ''
      }
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
      console.log('\nAsset should now appear in the UI.');
    }
    
    // 3. Verify that the file exists and is accessible
    console.log('\nVerifying file accessibility:');
    const mainFile = path.join(
      process.cwd(),
      'uploads',
      `asset-Juniper-Brainfog-Colour-2x-${ASSET_ID}.png`
    );
    
    try {
      const fileStats = fs.statSync(mainFile);
      console.log(`File exists (${fileStats.size} bytes)`);
      
      // Make sure the file has proper permissions
      fs.chmodSync(mainFile, 0o644);
      console.log('File permissions updated to ensure it\'s readable');
    } catch (fsError) {
      if (fsError instanceof Error) {
        console.error('File access error:', fsError.message);
      } else {
        console.error('File access error:', fsError);
      }
    }
    
    // 4. Log debugging information for the client
    console.log('\nClient debugging information:');
    console.log('- UI should be requesting assets with client_id:', asset.client_id);
    console.log('- Make sure the client selector is set to a client with ID:', asset.client_id);
    console.log('- Asset type filter should include "image" or be set to "all"');
    console.log('- Try refreshing the browser to clear any cache');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n=== Asset Fix Complete ===');
}

// Run the fix
fixAssetForUI().catch(console.error);
