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

/**
 * Fixes all assets in the database to ensure they're compatible with the UI
 * This script enhances metadata, ensures owner_id is set, and normalizes fields
 */
async function fixAllAssetsForUI() {
  logger.info('=== Repairing All Assets for UI Display ===');
  
  try {
    // Get all assets from the database
    logger.info('Fetching all assets from database...');
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('*');
      
    if (fetchError) {
      logger.error('Error fetching assets:', fetchError);
      return;
    }
    
    if (!assets || assets.length === 0) {
      logger.info('No assets found in the database.');
      return;
    }
    
    logger.info(`Found ${assets.length} assets in the database.`);
    
    // Process each asset
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const asset of assets) {
      try {
        logger.info(`\nProcessing asset: ${asset.id} (${asset.name})`);
        
        // Create normalized metadata
        const meta = asset.meta || {};
        const normalizedMeta = {
          ...meta,
          // Ensure these fields exist with reasonable defaults
          size: meta.size || 1024,
          width: meta.width || 400,
          height: meta.height || 400,
          duration: meta.duration || 0,
          originalName: meta.originalName || `${asset.name}.${asset.type}`,
          mimeType: meta.mimeType || getMimeTypeFromType(asset.type),
          tags: meta.tags || [],
          categories: meta.categories || [],
          description: meta.description || '',
          isFavourite: meta.isFavourite || false,
          usageCount: meta.usageCount || 0
        };
        
        // Create update object
        const updateData: Record<string, unknown> = {
          meta: normalizedMeta
        };
        
        // Ensure owner_id is set (using user_id if owner_id is null)
        if (!asset.owner_id && asset.user_id) {
          logger.info(`Setting owner_id to ${asset.user_id} for asset ${asset.id}`);
          updateData.owner_id = asset.user_id;
        }
        
        // Update the asset
        const { data: updateResult, error: updateError } = await supabase
          .from('assets')
          .update(updateData)
          .eq('id', asset.id)
          .select()
          .single();
          
        if (updateError) {
          logger.error(`Error updating asset ${asset.id}:`, updateError);
          errorCount++;
        } else {
          logger.info(`✅ Successfully updated asset ${asset.id}`);
          fixedCount++;
        }
      } catch (error) {
        logger.error(`Error processing asset ${asset.id}:`, error);
        errorCount++;
      }
    }
    
    logger.info('\n=== Asset Repair Summary ===');
    logger.info(`Total assets processed: ${assets.length}`);
    logger.info(`Successfully fixed: ${fixedCount}`);
    logger.info(`Errors encountered: ${errorCount}`);
    
    logger.info('\nNext steps:');
    logger.info('1. Restart your server to apply the updated transformAssetFromDb function');
    logger.info('2. In the UI, select the correct client in the client selector');
    logger.info('3. Make sure asset type filter is set to "all" or the specific type you need');
    logger.info('4. Hard-refresh your browser (Cmd+Shift+R or Ctrl+F5)');
    
  } catch (error) {
    logger.error('Unexpected error:', error);
  }
}

/**
 * Helper function to determine MIME type from asset type
 */
function getMimeTypeFromType(type: string): string {
  switch(type) {
    case 'image': return 'image/png';
    case 'video': return 'video/mp4';
    case 'audio': return 'audio/mp3';
    case 'document': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

// Run the script
fixAllAssetsForUI().catch(console.error);
