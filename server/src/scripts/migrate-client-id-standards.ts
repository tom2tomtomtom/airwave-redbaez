/**
 * Migration script to implement ID standardization plan
 * This script fixes existing data to conform to the new ID standards
 */
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';
import { isValidUuid } from '../utils/uuidUtils';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Main migration function
 */
async function migrateToIdStandards() {
  logger.info('=== ID Standardization Migration ===');
  logger.info('Implementing the AIrWAVE ID Standardization Plan...');
  
  try {
    // Step 1: Fix client record consistency
    await fixClientRecords();
    
    // Step 2: Remove duplicate client IDs from asset metadata
    await cleanAssetMetadata();
    
    logger.info('\n=== Migration Complete ===');
    logger.info('Next steps:');
    logger.info('1. Restart the server to apply the new middleware');
    logger.info('2. Use the updated API parameter names in all frontend requests');
    logger.info('3. Update API documentation to reflect the standardized parameter names');
  } catch (error) {
    logger.error('Migration failed:', error);
  }
}

/**
 * Ensures all client records have valid IDs and slugs
 */
async function fixClientRecords() {
  logger.info('\n--- Fixing Client Records ---');
  
  // Get all clients
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*');
    
  if (error) {
    logger.error('Error fetching clients:', error);
    return;
  }
  
  if (!clients || clients.length === 0) {
    logger.info('No clients found in database');
    return;
  }
  
  logger.info(`Found ${clients.length} clients`);
  
  let fixCount = 0;
  
  // Process each client
  for (const client of clients) {
    logger.info(`\nChecking client: ${client.name} (ID: ${client.id})`);
    
    let needsUpdate = false;
    const updates: Record<string, unknown> = {};
    
    // Ensure ID is a valid UUID
    if (!client.id || !isValidUuid(client.id)) {
      logger.info(`⚠️ Client ${client.name} has invalid ID: ${client.id}`);
      // This is a critical issue that requires manual intervention
      logger.info('  ❌ Manual action required: Client IDs must be valid UUIDs');
      continue;
    }
    
    // Ensure slug exists and is normalized
    if (!client.slug) {
      // Generate a slug from the name
      const slug = client.name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');
        
      logger.info(`Adding missing slug: ${slug}`);
      updates.slug = slug;
      needsUpdate = true;
    } else if (client.slug !== client.slug.toLowerCase()) {
      // Normalize slug to lowercase
      logger.info(`Normalizing slug: ${client.slug} → ${client.slug.toLowerCase()}`);
      updates.slug = client.slug.toLowerCase();
      needsUpdate = true;
    }
    
    // Update client if needed
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', client.id);
        
      if (updateError) {
        logger.error(`Error updating client ${client.id}:`, updateError);
      } else {
        logger.info(`✅ Updated client ${client.name}`);
        fixCount++;
      }
    } else {
      logger.info(`✅ Client ${client.name} is already standards-compliant`);
    }
  }
  
  logger.info(`\nFixed ${fixCount} clients`);
}

/**
 * Removes duplicate client IDs from asset metadata
 */
async function cleanAssetMetadata() {
  logger.info('\n--- Cleaning Asset Metadata ---');
  
  // Get assets with client ID in metadata
  const { data: assets, error } = await supabase
    .from('assets')
    .select('*');
    
  if (error) {
    logger.error('Error fetching assets:', error);
    return;
  }
  
  if (!assets || assets.length === 0) {
    logger.info('No assets found in database');
    return;
  }
  
  logger.info(`Found ${assets.length} assets`);
  
  let fixCount = 0;
  let missingClientId = 0;
  
  // Process each asset
  for (const asset of assets) {
    logger.info(`\nChecking asset: ${asset.name} (ID: ${asset.id})`);
    
    // Extract metadata
    const meta = asset.meta || {};
    let needsUpdate = false;
    const updates: Record<string, unknown> = {};
    
    // Check for duplicate client ID in metadata
    if (meta.clientId) {
      logger.info(`Found clientId in metadata: ${meta.clientId}`);
      
      // If the asset has no client_id but has meta.clientId, set client_id
      if (!asset.client_id) {
        logger.info(`Setting missing client_id to ${meta.clientId}`);
        updates.client_id = meta.clientId;
        needsUpdate = true;
        missingClientId++;
      } 
      // If they're different, prefer the direct client_id field
      else if (asset.client_id !== meta.clientId) {
        logger.info(`⚠️ Inconsistent client IDs: client_id=${asset.client_id}, meta.clientId=${meta.clientId}`);
        logger.info(`  Using client_id as the canonical value`);
      }
      
      // Remove clientId from metadata to eliminate duplication
      const updatedMeta = { ...meta };
      delete updatedMeta.clientId;
      updates.meta = updatedMeta;
      needsUpdate = true;
    }
    
    // If asset has client_id but no owner_id, set owner_id to match
    if (asset.client_id && !asset.owner_id && asset.user_id) {
      logger.info(`Setting missing owner_id to user_id: ${asset.user_id}`);
      updates.owner_id = asset.user_id;
      needsUpdate = true;
    }
    
    // Update asset if needed
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', asset.id);
        
      if (updateError) {
        logger.error(`Error updating asset ${asset.id}:`, updateError);
      } else {
        logger.info(`✅ Updated asset ${asset.name}`);
        fixCount++;
      }
    } else {
      logger.info(`✅ Asset ${asset.name} is already standards-compliant`);
    }
  }
  
  logger.info(`\nFixed ${fixCount} assets`);
  logger.info(`Found ${missingClientId} assets with missing client_id`);
}

// Run migration
migrateToIdStandards().catch(console.error);
