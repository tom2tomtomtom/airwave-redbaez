/**
 * Script to check if assets have the correct type values
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase credentials (from .env file)
const SUPABASE_URL = 'https://vnlmumkhqupdmvywneuf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubG11bWtocXVwZG12eXduZXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMzQ2MjEsImV4cCI6MjA1NjcxMDYyMX0.rGn9_Zkbb0FYXwjs-RLlWO6lpqoTbQRsNFwmvdn1pDQ';

// Client ID to check
const CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkImageTypes() {
  try {
    console.log(`Checking image assets format for client ID: ${CLIENT_ID}`);
    
    // Get image assets
    const { data, error } = await supabase
      .from('assets')
      .select('id, name, type, url, client_id')
      .eq('client_id', CLIENT_ID)
      .eq('type', 'image')
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} image assets. Sample:`);
    
    // Check each asset
    if (data && data.length > 0) {
      data.forEach((asset, index) => {
        console.log(`\nAsset ${index + 1}: ${asset.name}`);
        console.log(`  ID: ${asset.id}`);
        console.log(`  Type: ${asset.type}`);
        console.log(`  Client ID: ${asset.client_id}`);
        
        // Check for file extension to see if it matches image type
        const url = asset.url || '';
        const extension = url.split('.').pop().toLowerCase();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        
        console.log(`  URL: ${url}`);
        console.log(`  Extension: ${extension}`);
        console.log(`  Is valid image extension: ${imageExtensions.includes(extension)}`);
      });
    } else {
      console.log('No image assets found');
    }
  } catch (error) {
    console.error('Error checking asset types:', error);
  }
}

checkImageTypes();
