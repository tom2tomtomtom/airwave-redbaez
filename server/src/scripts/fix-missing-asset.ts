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

// The asset ID from your frontend
const MISSING_ASSET_ID = '3feaa091-bd0b-4501-8c67-a5f96c767e1a';

// Use the admin user ID we know exists
let ADMIN_USER_ID = 'd53c7f82-42af-4ed0-a83b-2cbf505748db'; // Default, will be overwritten
const DEFAULT_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081'; // Replace with your actual default client ID

async function fixMissingAsset() {
  logger.info('=== Fixing Missing Asset ===');
  
  try {
    // Verify admin user exists
    logger.info(`\nVerifying admin user exists (ID: ${ADMIN_USER_ID}):`);
    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', ADMIN_USER_ID)
      .single();
      
    if (userError) {
      logger.error('Error fetching admin user:', userError);
      logger.info('\nLet\'s try to find a valid user:');
      
      const { data: anyUser, error: anyUserError } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .single();
        
      if (anyUserError) {
        logger.error('Could not find any valid user:', anyUserError);
        return;
      }
      
      logger.info('Found user:', anyUser.id);
      ADMIN_USER_ID = anyUser.id; // Assign the first found user ID
    } else {
      logger.info('Admin user found:', adminUser);
    }
    
    // Check if the file exists on filesystem
    logger.info('\nVerifying files exist on filesystem:');
    const mainFilePath = path.join(
      process.cwd(), 
      'uploads', 
      `asset-Juniper-Brainfog-Colour-2x-${MISSING_ASSET_ID}.png`
    );
    const thumbnailPath = path.join(
      process.cwd(), 
      'uploads', 
      `thumb-${MISSING_ASSET_ID}.png`
    );
    
    logger.info(`Checking main file: ${mainFilePath}`);
    const fileExists = fs.existsSync(mainFilePath);
    logger.info(`File ${fileExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    logger.info(`Checking thumbnail: ${thumbnailPath}`);
    const thumbExists = fs.existsSync(thumbnailPath);
    logger.info(`Thumbnail ${thumbExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    if (!fileExists) {
      logger.info('Cannot proceed - file does not exist.');
      return;
    }
    
    // Get the file size
    const fileStats = fs.statSync(mainFilePath);
    const fileSizeBytes = fileStats.size;
    
    // Attempt to create the asset record
    logger.info('\nCreating asset record with valid user ID:');
    const newAsset = {
      id: MISSING_ASSET_ID,
      name: 'Juniper Brainfog Colour@2x',
      type: 'image',
      url: `/uploads/asset-Juniper-Brainfog-Colour-2x-${MISSING_ASSET_ID}.png`,
      thumbnail_url: `/uploads/thumb-${MISSING_ASSET_ID}.png`,
      user_id: ADMIN_USER_ID, // Valid user ID
      client_id: DEFAULT_CLIENT_ID, // Default client ID
      meta: {
        originalName: 'Juniper_Brainfog_Colour@2x.png',
        mimeType: 'image/png',
        size: fileSizeBytes
      }
    };
    
    logger.info('Attempting to insert asset with valid user ID:', newAsset);
    const { data: insertResult, error: insertError } = await supabase
      .from('assets')
      .insert(newAsset)
      .select()
      .single();
      
    if (insertError) {
      logger.error('Insert failed:', insertError);
      
      // Try alternative approach if owner_id is required but user_id failed
      if (insertError.message.includes('user_id')) {
        logger.info('\nTrying alternative with owner_id:');
        newAsset.owner_id = ADMIN_USER_ID;
        
        const { data: ownerInsertResult, error: ownerInsertError } = await supabase
          .from('assets')
          .insert(newAsset)
          .select()
          .single();
          
        if (ownerInsertError) {
          logger.error('Owner insert failed:', ownerInsertError);
          logger.info('\nPlease check the schema requirements. You might need to modify the assetService.ts code.');
        } else {
          logger.info('Success with owner_id approach:', ownerInsertResult);
          logger.info('\nAsset should now appear in your UI.');
        }
      }
    } else {
      logger.info('Success:', insertResult);
      logger.info('\nAsset should now appear in your UI.');
    }
    
  } catch (error) {
    logger.error('Unexpected error:', error);
  }
  
  logger.info('\n=== Asset Fix Complete ===');
}

// Run the fix
fixMissingAsset().catch(console.error);
