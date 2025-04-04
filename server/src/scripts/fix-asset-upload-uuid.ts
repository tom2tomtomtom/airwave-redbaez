import { assetService } from '../services/assetService.new';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';
import { AUTH_MODE } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test script to try inserting assets with proper UUID format
 */
async function testUuidAssetUpload() {
  logger.info('=== Asset Upload UUID Fix Test ===');
  
  try {
    // Check if development user exists
    logger.info('Checking if development user exists...');
    const { data: devUser, error: devUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', AUTH_MODE.DEV_USER_ID)
      .single();
      
    if (devUserError) {
      logger.error('Error checking dev user:', devUserError);
      return;
    } else {
      logger.info('Dev user exists:', devUser);
    }
    
    // Check the schema for the assets table
    logger.info('\nFetching asset sample...');
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .limit(1);
      
    if (assetError) {
      logger.error('Cannot retrieve any assets:', assetError);
      logger.info('Trying to get column info another way...');
      
      // Try to get table info directly with direct SQL
      const { data: columns, error: columnsError } = await supabase
        .from('assets')
        .select()
        .limit(0);
        
      if (columnsError) {
        logger.error('Cannot get column info:', columnsError);
      } else {
        logger.info('Assets table appears to have columns but no data');
      }
    } else {
      if (assetData && assetData.length > 0) {
        logger.info('Asset sample found. Schema:', Object.keys(assetData[0]));
        logger.info('Full sample:', assetData[0]);
      } else {
        logger.info('Assets table exists but has no data');
      }
    }
    
    // Try to get the existing client IDs from the database
    logger.info('\nChecking for available client_id values...');
    let clientId = uuidv4(); // Default to a new UUID
    
    // Try to find clients table if it exists
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
      
    if (clientsError) {
      logger.info('Could not find clients table:', clientsError);
      logger.info('Will use generated UUID for client_id');
    } else if (clientsData && clientsData.length > 0) {
      logger.info('Found client:', clientsData[0]);
      clientId = clientsData[0].id;
    } else {
      logger.info('No clients found, will use generated UUID');
    }
    
    // Create a test file
    const testFilePath = path.join(process.cwd(), 'test-asset.txt');
    const testContent = 'This is a test asset file';
    fs.writeFileSync(testFilePath, testContent);
    
    // Create a multer-like file object
    const testFile = {
      fieldname: 'file',
      originalname: 'test-asset.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      destination: process.cwd(),
      filename: 'test-asset.txt',
      path: testFilePath,
      size: fs.statSync(testFilePath).size,
      buffer: Buffer.from(testContent)
    };
    
    logger.info('Created test file:', testFilePath);
    
    // Attempt direct insert with proper UUIDs
    const assetId = uuidv4();
    logger.info('\nTrying direct insert with proper UUIDs...');
    logger.info('Using asset ID (UUID):', assetId);
    logger.info('Using client ID (UUID):', clientId);
    logger.info('Using user ID:', AUTH_MODE.DEV_USER_ID);
    
    // First, ensure file system path exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Copy the test file to uploads directory with UUID as name
    const assetPath = path.join(uploadsDir, `${assetId}.txt`);
    fs.copyFileSync(testFilePath, assetPath);
    
    const assetUrl = `/uploads/${assetId}.txt`;
    
    const directAsset = {
      id: assetId,
      name: 'UUID Test Asset',
      type: 'text/plain',
      url: assetUrl,
      user_id: AUTH_MODE.DEV_USER_ID,
      client_id: clientId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: directInsert, error: directError } = await supabase
      .from('assets')
      .insert(directAsset)
      .select();
      
    if (directError) {
      logger.error('Direct insert failed:', directError);
      
      // Try without the client_id to see if that's the issue
      logger.info('\nTrying without client_id...');
      const { client_id, ...assetWithoutClient } = directAsset;
      
      const { data: noClientInsert, error: noClientError } = await supabase
        .from('assets')
        .insert(assetWithoutClient)
        .select();
        
      if (noClientError) {
        logger.error('Insert without client_id failed:', noClientError);
      } else {
        logger.info('Insert without client_id succeeded:', noClientInsert);
      }
    } else {
      logger.info('Direct insert successful:', directInsert);
    }
    
    // Try using the asset service with UUID format
    logger.info('\nTrying asset service with proper UUIDs...');
    const result = await assetService.uploadAsset(
      testFile as any,
      AUTH_MODE.DEV_USER_ID,
      {
        name: 'Test Asset Service',
        type: 'document',
        description: 'Test with proper UUIDs',
        tags: ['test', 'document'],
        categories: ['test'],
        clientId: clientId
      }
    );
    
    logger.info('Asset service result:', JSON.stringify(result, null, 2));
    
    // Fetch all assets to see what's there
    logger.info('\nFetching all assets to verify:');
    const { data: allAssets, error: allAssetsError } = await supabase
      .from('assets')
      .select('*');
      
    if (allAssetsError) {
      logger.error('Error fetching all assets:', allAssetsError);
    } else {
      logger.info(`Found ${allAssets?.length || 0} assets in database`);
      if (allAssets && allAssets.length > 0) {
        allAssets.forEach(asset => {
          logger.info(`- Asset ID: ${asset.id}, Name: ${asset.name}, URL: ${asset.url}`);
        });
      }
    }
    
    // Clean up
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      logger.info('Test file cleaned up');
    }
    
    logger.info('\nTest complete!');
    
  } catch (error) {
    logger.error('Unexpected error during test:', error);
  }
}

// Run the script
testUuidAssetUpload().catch(console.error);
