import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// The asset ID from the frontend
const ASSET_ID = '3feaa091-bd0b-4501-8c67-a5f96c767e1a';

async function updateAssetMetadata() {
  logger.info('=== Updating Asset Metadata ===');
  
  try {
    // 1. Get current asset data
    logger.info(`\nFetching asset data (ID: ${ASSET_ID}):`);
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', ASSET_ID)
      .single();
      
    if (assetError) {
      logger.error('Error fetching asset by ID:', assetError);
      return;
    }
    
    logger.info('Asset found in database:', asset);
    
    // 2. Update only the fields that are valid in the database schema
    logger.info('\nUpdating asset with proper metadata:');
    
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
    
    logger.info('Updating with:', updatedAsset);
    
    // Update the asset in the database
    const { data: updateResult, error: updateError } = await supabase
      .from('assets')
      .update(updatedAsset)
      .eq('id', ASSET_ID)
      .select()
      .single();
      
    if (updateError) {
      logger.error('Update failed:', updateError);
    } else {
      logger.info('Update successful:', updateResult);
      logger.info('\nAsset metadata has been updated.');
    }
    
    // 3. Check if the ClientSelector component is loading the correct client
    logger.info('\nDebugging client selection:');
    logger.info(`This asset belongs to client ID: ${asset.client_id}`);
    
    // Look up the client name
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name')
      .eq('id', asset.client_id)
      .single();
      
    if (clientError) {
      logger.info(`Could not find client with ID ${asset.client_id}`);
    } else {
      logger.info(`Client name: ${client.name}`);
      logger.info(`Make sure you've selected the client "${client.name}" in the UI`);
    }
    
    logger.info('\nTroubleshooting steps:');
    logger.info('1. Make sure you have selected the correct client in the UI');
    logger.info('2. Check the asset type filter is set to "image" or "all"');
    logger.info('3. Try hard-refreshing the browser (Ctrl+F5 or Cmd+Shift+R)');
    logger.info('4. Clear browser cache if needed');
    logger.info('5. Check the browser console for any errors related to fetching assets');
    
  } catch (error) {
    logger.error('Unexpected error:', error);
  }
  
  logger.info('\n=== Asset Update Complete ===');
}

// Run the update
updateAssetMetadata().catch(console.error);
