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

// The admin user and the asset we know exists
const ADMIN_USER_ID = 'd53c7f82-42af-4ed0-a83b-2cbf505748db';
const ASSET_ID = '919ab7fc-71fc-4a76-9662-c1349bd7023c';

async function testAssetRetrieval() {
  logger.info('=== Testing Asset Retrieval for UI Display ===');
  
  try {
    // 1. Verify the asset exists directly by ID
    logger.info(`\nVerifying asset exists (ID: ${ASSET_ID}):`);
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
    
    // 2. Check if file exists on disk
    const assetUrl = asset.url;
    logger.info(`\nChecking if file exists on disk at path: ${assetUrl}`);
    
    // Convert database URL to filesystem path
    // Usually /uploads/... maps to a specific directory in your server
    const uploadsBasePath = path.join(process.cwd(), 'uploads'); // Adjust if needed
    const relativePath = assetUrl.replace(/^\/uploads\//, '');
    const filePath = path.join(uploadsBasePath, relativePath);
    
    try {
      const fileExists = fs.existsSync(filePath);
      logger.info(`File ${fileExists ? 'EXISTS' : 'DOES NOT EXIST'} at: ${filePath}`);
      
      if (fileExists) {
        const fileStats = fs.statSync(filePath);
        logger.info(`File size: ${fileStats.size} bytes`);
      }
    } catch (fsError) {
      if (fsError instanceof Error) {
        logger.info(`Error checking file: ${fsError.message}`);
      } else {
        logger.info('Error checking file:', fsError);
      }
    }
    
    // 3. Test retrieving assets with different client contexts
    logger.info('\nTesting asset retrieval with client context:');
    const clientId = asset.client_id;
    
    logger.info(`\nRetrieving assets for client ID: ${clientId}`);
    const { data: clientAssets, error: clientError } = await supabase
      .from('assets')
      .select('*')
      .eq('client_id', clientId);
      
    if (clientError) {
      logger.error('Error retrieving assets for client:', clientError);
    } else {
      logger.info(`Found ${clientAssets?.length || 0} assets for client ${clientId}`);
      if (clientAssets?.length) {
        logger.info(`Our test asset is ${clientAssets.some(a => a.id === ASSET_ID) ? 'INCLUDED' : 'NOT INCLUDED'} in this list`);
      }
    }
    
    // 4. Check if UI retrieval might be using RLS or missing joins
    logger.info('\nSimulating UI retrieval with common filter patterns:');
    
    // Typical UI retrieval patterns
    const patterns = [
      { name: 'By user and client', query: supabase.from('assets').select('*').eq('user_id', ADMIN_USER_ID).eq('client_id', clientId) },
      { name: 'By client only', query: supabase.from('assets').select('*').eq('client_id', clientId) },
      { name: 'Recent assets', query: supabase.from('assets').select('*').order('created_at', { ascending: false }).limit(10) },
      { name: 'By document type', query: supabase.from('assets').select('*').eq('type', 'document') }
    ];
    
    for (const pattern of patterns) {
      logger.info(`\nTesting pattern: ${pattern.name}`);
      const { data, error } = await pattern.query;
      
      if (error) {
        logger.error(`Error with pattern ${pattern.name}:`, error);
      } else {
        logger.info(`Found ${data?.length || 0} assets`);
        if (data?.length) {
          logger.info(`Our test asset is ${data.some(a => a.id === ASSET_ID) ? 'INCLUDED' : 'NOT INCLUDED'} in this list`);
        }
      }
    }
    
  } catch (error) {
    logger.error('Unexpected error:', error);
  }
  
  logger.info('\n=== Asset Retrieval Test Complete ===');
}

// Run the test
testAssetRetrieval().catch(console.error);
