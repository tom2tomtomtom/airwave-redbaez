import { assetService } from '../services/assetService.new';
import fs from 'fs';
import path from 'path';
import { AUTH_MODE } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test script to try inserting assets with proper UUID format
 */
async function testUuidAssetUpload() {
  console.log('=== Asset Upload UUID Fix Test ===');
  
  try {
    // Check if development user exists
    console.log('Checking if development user exists...');
    const { data: devUser, error: devUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', AUTH_MODE.DEV_USER_ID)
      .single();
      
    if (devUserError) {
      console.error('Error checking dev user:', devUserError);
      return;
    } else {
      console.log('Dev user exists:', devUser);
    }
    
    // Check the schema for the assets table
    console.log('\nFetching asset sample...');
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .limit(1);
      
    if (assetError) {
      console.error('Cannot retrieve any assets:', assetError);
      console.log('Trying to get column info another way...');
      
      // Try to get table info directly with direct SQL
      const { data: columns, error: columnsError } = await supabase
        .from('assets')
        .select()
        .limit(0);
        
      if (columnsError) {
        console.error('Cannot get column info:', columnsError);
      } else {
        console.log('Assets table appears to have columns but no data');
      }
    } else {
      if (assetData && assetData.length > 0) {
        console.log('Asset sample found. Schema:', Object.keys(assetData[0]));
        console.log('Full sample:', assetData[0]);
      } else {
        console.log('Assets table exists but has no data');
      }
    }
    
    // Try to get the existing client IDs from the database
    console.log('\nChecking for available client_id values...');
    let clientId = uuidv4(); // Default to a new UUID
    
    // Try to find clients table if it exists
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
      
    if (clientsError) {
      console.log('Could not find clients table:', clientsError);
      console.log('Will use generated UUID for client_id');
    } else if (clientsData && clientsData.length > 0) {
      console.log('Found client:', clientsData[0]);
      clientId = clientsData[0].id;
    } else {
      console.log('No clients found, will use generated UUID');
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
    
    console.log('Created test file:', testFilePath);
    
    // Attempt direct insert with proper UUIDs
    const assetId = uuidv4();
    console.log('\nTrying direct insert with proper UUIDs...');
    console.log('Using asset ID (UUID):', assetId);
    console.log('Using client ID (UUID):', clientId);
    console.log('Using user ID:', AUTH_MODE.DEV_USER_ID);
    
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
      console.error('Direct insert failed:', directError);
      
      // Try without the client_id to see if that's the issue
      console.log('\nTrying without client_id...');
      const { client_id, ...assetWithoutClient } = directAsset;
      
      const { data: noClientInsert, error: noClientError } = await supabase
        .from('assets')
        .insert(assetWithoutClient)
        .select();
        
      if (noClientError) {
        console.error('Insert without client_id failed:', noClientError);
      } else {
        console.log('Insert without client_id succeeded:', noClientInsert);
      }
    } else {
      console.log('Direct insert successful:', directInsert);
    }
    
    // Try using the asset service with UUID format
    console.log('\nTrying asset service with proper UUIDs...');
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
    
    console.log('Asset service result:', JSON.stringify(result, null, 2));
    
    // Fetch all assets to see what's there
    console.log('\nFetching all assets to verify:');
    const { data: allAssets, error: allAssetsError } = await supabase
      .from('assets')
      .select('*');
      
    if (allAssetsError) {
      console.error('Error fetching all assets:', allAssetsError);
    } else {
      console.log(`Found ${allAssets?.length || 0} assets in database`);
      if (allAssets && allAssets.length > 0) {
        allAssets.forEach(asset => {
          console.log(`- Asset ID: ${asset.id}, Name: ${asset.name}, URL: ${asset.url}`);
        });
      }
    }
    
    // Clean up
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('Test file cleaned up');
    }
    
    console.log('\nTest complete!');
    
  } catch (error) {
    console.error('Unexpected error during test:', error);
  }
}

// Run the script
testUuidAssetUpload().catch(console.error);
