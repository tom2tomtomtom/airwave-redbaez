/**
 * Script to check asset types in the database
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase credentials (from .env file)
const SUPABASE_URL = 'https://vnlmumkhqupdmvywneuf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubG11bWtocXVwZG12eXduZXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMzQ2MjEsImV4cCI6MjA1NjcxMDYyMX0.rGn9_Zkbb0FYXwjs-RLlWO6lpqoTbQRsNFwmvdn1pDQ';

// Client ID to check
const CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAssetTypes() {
  try {
    console.log(`Checking assets for client ID: ${CLIENT_ID}`);
    
    // Get all assets for the client
    const { data, error } = await supabase
      .from('assets')
      .select('id, name, type')
      .eq('client_id', CLIENT_ID);
    
    if (error) {
      throw error;
    }
    
    // Count assets by type
    const typeCounts = {};
    if (data) {
      data.forEach(asset => {
        typeCounts[asset.type] = (typeCounts[asset.type] || 0) + 1;
      });
    }
    
    console.log('Asset types in database:');
    console.table(Object.entries(typeCounts).map(([type, count]) => ({ type, count })));
    
    // Get some sample image assets
    const { data: imageAssets, error: imageError } = await supabase
      .from('assets')
      .select('id, name, type, url')
      .eq('client_id', CLIENT_ID)
      .eq('type', 'image')
      .limit(5);
    
    if (imageError) {
      throw imageError;
    }
    
    console.log(`\nFound ${imageAssets?.length || 0} image assets. Sample:`);
    console.table(imageAssets);
    
    // Count image assets
    const { count: imageCount, error: countError } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', CLIENT_ID)
      .eq('type', 'image');
    
    if (countError) {
      throw countError;
    }
    
    console.log(`\nTotal image assets for client: ${imageCount}`);
    
  } catch (error) {
    console.error('Error checking asset types:', error);
  }
}

checkAssetTypes();
