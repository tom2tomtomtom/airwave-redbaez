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

async function findMissingAsset() {
  logger.info('=== Looking for Missing Asset ===');
  
  try {
    // Check if asset exists in database
    logger.info(`\nChecking if asset exists in database (ID: ${MISSING_ASSET_ID}):`);
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', MISSING_ASSET_ID)
      .single();
      
    if (assetError) {
      if (assetError.code === 'PGRST116') {
        logger.info(`Asset with ID ${MISSING_ASSET_ID} NOT FOUND in database`);
      } else {
        logger.error('Error fetching asset by ID:', assetError);
      }
    } else if (asset) {
      logger.info('Asset found in database:', asset);
      return;
    }
    
    // Check if the file exists on filesystem
    logger.info('\nChecking if file exists on filesystem:');
    const expectedPath = path.join(
      process.cwd(), 
      'uploads', 
      `asset-Juniper-Brainfog-Colour-2x-${MISSING_ASSET_ID}.png`
    );
    const thumbnailPath = path.join(
      process.cwd(), 
      'uploads', 
      `thumb-${MISSING_ASSET_ID}.png`
    );
    
    logger.info(`Checking main file at: ${expectedPath}`);
    const fileExists = fs.existsSync(expectedPath);
    logger.info(`File ${fileExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    logger.info(`Checking thumbnail at: ${thumbnailPath}`);
    const thumbExists = fs.existsSync(thumbnailPath);
    logger.info(`Thumbnail ${thumbExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    if (fileExists) {
      logger.info('\nFile exists but record is missing from database!');
      
      // Examine RLS policies
      logger.info('\nChecking if RLS policies might be preventing inserts:');
      try {
        // Test a minimal insert to check for insert permissions
        const testAsset = {
          id: 'test-' + Date.now(),
          name: 'Test Asset',
          type: 'image',
          url: '/uploads/test.png',
          user_id: '00000000-0000-0000-0000-000000000000',
          client_id: 'fe418478-806e-411a-ad0b-1b9a537a8081'
        };
        
        const { data: insertResult, error: insertError } = await supabase
          .from('assets')
          .insert(testAsset)
          .select();
          
        if (insertError) {
          logger.error('Insert test failed - likely an RLS policy issue:', insertError);
          logger.info('\nThis suggests your asset uploads are failing due to RLS policy restrictions.');
          logger.info('Check Supabase dashboard for assets table RLS policies.');
        } else {
          logger.info('Insert test succeeded:', insertResult);
          logger.info('\nThis suggests there might be an issue in your upload code not properly creating the database record.');
          
          // Clean up test asset
          await supabase.from('assets').delete().eq('id', testAsset.id);
        }
      } catch (error) {
        logger.error('Error during insert test:', error);
      }
      
      // Attempt to recreate the missing asset record
      logger.info('\nAttempting to recreate the missing asset record:');
      const reconstructedAsset = {
        id: MISSING_ASSET_ID,
        name: 'Juniper Brainfog Colour@2x',
        type: 'image',
        url: `/uploads/asset-Juniper-Brainfog-Colour-2x-${MISSING_ASSET_ID}.png`,
        thumbnail_url: `/uploads/thumb-${MISSING_ASSET_ID}.png`,
        user_id: '00000000-0000-0000-0000-000000000000', // Default dev user
        client_id: 'fe418478-806e-411a-ad0b-1b9a537a8081', // Juniper client ID
        meta: {
          originalName: 'Juniper_Brainfog_Colour@2x.png',
          mimeType: 'image/png'
        }
      };
      
      logger.info('Attempting to insert reconstructed asset:', reconstructedAsset);
      const { data: recreateResult, error: recreateError } = await supabase
        .from('assets')
        .insert(reconstructedAsset)
        .select()
        .single();
        
      if (recreateError) {
        logger.error('Failed to recreate asset record:', recreateError);
        logger.info('You might need to manually create this record or debug your asset service code.');
      } else {
        logger.info('Successfully recreated asset record:', recreateResult);
        logger.info('Asset should now appear in your UI.');
      }
    }
    
    // Check if there are any temporary records we can find
    logger.info('\nChecking for any asset records with similar name:');
    const { data: similarAssets, error: similarError } = await supabase
      .from('assets')
      .select('*')
      .ilike('name', '%Juniper%Brainfog%');
      
    if (similarError) {
      logger.error('Error searching for similar assets:', similarError);
    } else if (similarAssets && similarAssets.length > 0) {
      logger.info(`Found ${similarAssets.length} similar assets:`);
      similarAssets.forEach(asset => logger.info('-', asset.id, asset.name, asset.url));
    } else {
      logger.info('No similar assets found.');
    }
    
  } catch (error) {
    logger.error('Unexpected error:', error);
  }
  
  logger.info('\n=== Asset Search Complete ===');
}

// Run the search
findMissingAsset().catch(console.error);
