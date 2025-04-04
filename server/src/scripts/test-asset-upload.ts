import { assetService } from '../services/assetService.new';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';
import { AUTH_MODE } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';

/**
 * Test script to upload a simple text file as an asset
 * This tests if our asset upload functionality works with the database constraints
 */
async function testAssetUpload() {
  logger.info('=== Asset Upload Test ===');
  
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
      logger.info('Creating development user...');
      
      // Create development user if it doesn't exist
      const { error: createError } = await supabase
        .from('users')
        .upsert({
          id: AUTH_MODE.DEV_USER_ID,
          email: 'dev-user-00000000-0000-0000-0000-000000000000@example.com',
          name: 'Development User',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (createError) {
        logger.error('Failed to create dev user:', createError);
        return;
      }
      logger.info('Dev user created successfully');
    } else {
      logger.info('Dev user exists:', devUser);
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
    
    // Call the uploadAsset method with the development user ID
    logger.info('Uploading asset...');
    const result = await assetService.uploadAsset(
      testFile as any,
      AUTH_MODE.DEV_USER_ID,
      {
        name: 'Test Asset',
        type: 'document',
        description: 'Test asset for upload functionality',
        tags: ['test', 'document'],
        categories: ['test'],
        clientId: 'default'
      }
    );
    
    logger.info('Upload result:', JSON.stringify(result, null, 2));
    
    // Check if the asset was saved to the database
    if (result.success && result.asset) {
      logger.info('Asset uploaded successfully, checking in database...');
      const { data: dbAsset, error: dbError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', result.asset.id)
        .single();
        
      if (dbError) {
        logger.error('Error fetching asset from database:', dbError);
      } else {
        logger.info('Asset found in database:', dbAsset);
        logger.info('✅ TEST PASSED: Asset upload successful');
      }
    } else {
      logger.error('❌ TEST FAILED: Asset upload failed');
    }
    
    // Clean up
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      logger.info('Test file cleaned up');
    }
    
  } catch (error) {
    logger.error('Unexpected error during test:', error);
  }
  
  logger.info('=== Test Complete ===');
}

// Run the test
testAssetUpload().catch(console.error);
