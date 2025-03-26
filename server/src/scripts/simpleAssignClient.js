/**
 * Simple script to assign all assets to a specific client
 * This script has hardcoded credentials for quick execution
 */

const { createClient } = require('@supabase/supabase-js');

// The client ID to assign to all assets
const CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';

// Supabase credentials (from .env file)
const SUPABASE_URL = 'https://vnlmumkhqupdmvywneuf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubG11bWtocXVwZG12eXduZXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMzQ2MjEsImV4cCI6MjA1NjcxMDYyMX0.rGn9_Zkbb0FYXwjs-RLlWO6lpqoTbQRsNFwmvdn1pDQ';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateAssets() {
  try {
    console.log(`Attempting to assign all assets to client ID: ${CLIENT_ID}`);
    
    // First, get a count of assets
    const { count, error: countError } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      throw countError;
    }
    
    console.log(`Found ${count} assets in the database to update`);
    
    // Update all assets
    const { data, error } = await supabase
      .from('assets')
      .update({ client_id: CLIENT_ID })
      .not('id', 'is', null) // This will match all records
      .select('id');
    
    if (error) {
      throw error;
    }
    
    console.log(`Successfully updated ${data?.length || 0} assets!`);
    console.log('All assets now belong to the specified client.');
    
  } catch (error) {
    console.error('Error updating assets:', error);
  }
}

updateAssets();
