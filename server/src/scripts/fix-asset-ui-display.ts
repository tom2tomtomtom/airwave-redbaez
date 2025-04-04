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

async function fixAssetForUI() {
  logger.info('=== Fixing Asset for UI Display ===');
  
  try {
    // 1. Check if asset exists in database
    logger.info(`\nChecking current asset status in database (ID: ${ASSET_ID}):`);
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
    
    // 2. Update the asset with proper metadata field names to match frontend expectations
    logger.info('\nUpdating asset with proper field structure for UI:');
    
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
      logger.info('\nAsset should now appear in the UI.');
    }
    
    // 3. Verify that the file exists and is accessible
    logger.info('\nVerifying file accessibility:');
    const mainFile = path.join(
      process.cwd(),
      'uploads',
      `asset-Juniper-Brainfog-Colour-2x-${ASSET_ID}.png`
    );
    
    try {
      const fileStats = fs.statSync(mainFile);
      logger.info(`File exists (${fileStats.size} bytes)`);
      
      // Make sure the file has proper permissions
      fs.chmodSync(mainFile, 0o644);
      logger.info('File permissions updated to ensure it\'s readable');
    } catch (fsError) {
      if (fsError instanceof Error) {
        logger.error('File access error:', fsError.message);
      } else {
        logger.error('File access error:', fsError);
      }
    }
    
    // 4. Log debugging information for the client
    logger.info('\nClient debugging information:');
    logger.info('- UI should be requesting assets with client_id:', asset.client_id);
    logger.info('- Make sure the client selector is set to a client with ID:', asset.client_id);
    logger.info('- Asset type filter should include "image" or be set to "all"');
    logger.info('- Try refreshing the browser to clear any cache');
    
  } catch (error) {
    logger.error('Unexpected error:', error);
  }
  
  logger.info('\n=== Asset Fix Complete ===');
}

// Run the fix
fixAssetForUI().catch(console.error);
