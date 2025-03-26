/**
 * Utility script to assign ALL assets in the database to a specific client
 * This script will update ALL assets, even those that already have a client_id
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Get config from the server's config file
let config;
try {
  const configPath = path.join(__dirname, '../../config/default.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    console.error('Config file not found at:', configPath);
    process.exit(1);
  }
} catch (error) {
  console.error('Error reading config file:', error);
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

const TARGET_CLIENT_ID = process.argv[2]; // Pass client ID as command line argument

async function assignAllAssetsToClient() {
  if (!TARGET_CLIENT_ID) {
    console.error('Please provide a client ID as a command line argument');
    console.log('Usage: node assignAllAssetsToClient.js TARGET_CLIENT_ID');
    process.exit(1);
  }

  try {
    // First, verify the client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', TARGET_CLIENT_ID)
      .single();
    
    if (clientError || !client) {
      console.error(`Client with ID ${TARGET_CLIENT_ID} not found. Please check the ID and try again.`);
      process.exit(1);
    }
    
    console.log(`Found client: ${client.name} (ID: ${client.id})`);
    console.log(`Starting to assign ALL assets to client: ${client.name}`);
    
    // Get count of all assets
    const { count, error: countError } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw countError;
    }
    
    console.log(`Found ${count} assets in total that will be updated`);
    
    // Update ALL assets to have the specified client_id
    const { data, error: updateError } = await supabase
      .from('assets')
      .update({ client_id: TARGET_CLIENT_ID })
      .is('id', 'not.null') // This will match all assets
      .select('id');
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`Successfully assigned ${data?.length || 0} assets to client: ${client.name}`);
    console.log('Operation completed successfully');
  } catch (error) {
    console.error('Error assigning assets to client:', error);
  }
}

// First, list available clients to help the user
async function listClients() {
  try {
    console.log('Available clients in the database:');
    
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    if (clients && clients.length > 0) {
      clients.forEach(client => {
        console.log(`- ${client.name} (ID: ${client.id})`);
      });
      console.log('\nTo assign all assets to a client, run:');
      console.log('node assignAllAssetsToClient.js CLIENT_ID');
    } else {
      console.log('No clients found in the database');
    }
  } catch (error) {
    console.error('Error listing clients:', error);
  }
}

// If no client ID is provided, list available clients first
if (!TARGET_CLIENT_ID) {
  listClients();
} else {
  assignAllAssetsToClient();
}
