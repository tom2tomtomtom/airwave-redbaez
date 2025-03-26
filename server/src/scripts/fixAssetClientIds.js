/**
 * Utility script to fix assets without client IDs
 * 
 * This script can be run to associate existing assets with a default client ID
 * or to fix inconsistencies in client_id vs clientId fields
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DEFAULT_CLIENT_ID = process.argv[2]; // Pass client ID as command line argument

async function fixAssetClientIds() {
  if (!DEFAULT_CLIENT_ID) {
    console.error('Please provide a default client ID as a command line argument');
    console.log('Usage: node fixAssetClientIds.js YOUR_CLIENT_ID');
    process.exit(1);
  }

  try {
    console.log(`Starting fix for assets with no client ID. Using default: ${DEFAULT_CLIENT_ID}`);
    
    // Get all assets without a client_id
    const { data: assetsWithoutClient, error: fetchError } = await supabase
      .from('assets')
      .select('id, name, client_id')
      .is('client_id', null);
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`Found ${assetsWithoutClient?.length || 0} assets without a client ID`);
    
    // Update each asset with the default client ID
    if (assetsWithoutClient && assetsWithoutClient.length > 0) {
      const updates = assetsWithoutClient.map(asset => ({
        id: asset.id,
        client_id: DEFAULT_CLIENT_ID
      }));
      
      const { data, error: updateError } = await supabase
        .from('assets')
        .upsert(updates);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`Successfully updated ${updates.length} assets with client ID: ${DEFAULT_CLIENT_ID}`);
    } else {
      console.log('No assets found without client ID');
    }
    
    console.log('Fix completed successfully');
  } catch (error) {
    console.error('Error fixing asset client IDs:', error);
  }
}

fixAssetClientIds();
