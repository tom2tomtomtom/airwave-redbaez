/**
 * Simple script to assign all assets to a specific client
 * This uses a direct Supabase connection
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get client ID from command line
const CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';

// Setup connection with command line args
const SUPABASE_URL = process.argv[2];
const SUPABASE_KEY = process.argv[3];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Usage: node assignClientToAssets.js SUPABASE_URL SUPABASE_KEY');
  console.error('Example: node assignClientToAssets.js https://xyz.supabase.co your_supabase_key');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateAssets() {
  try {
    console.log(`Attempting to assign all assets to client ID: ${CLIENT_ID}`);
    
    // Update all assets
    const { data, error } = await supabase
      .from('assets')
      .update({ client_id: CLIENT_ID })
      .select('id');
    
    if (error) {
      throw error;
    }
    
    console.log(`Successfully updated ${data.length} assets!`);
    console.log('All assets now belong to the specified client.');
    
  } catch (error) {
    console.error('Error updating assets:', error);
  }
}

updateAssets();
