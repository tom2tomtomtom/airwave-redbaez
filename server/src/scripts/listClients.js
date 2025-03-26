/**
 * Utility script to list all clients in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function listClients() {
  try {
    console.log('Retrieving list of clients...');
    
    // Get all clients
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    if (clients && clients.length > 0) {
      console.log(`Found ${clients.length} clients:`);
      clients.forEach(client => {
        console.log(`- ${client.name} (ID: ${client.id})`);
      });
    } else {
      console.log('No clients found in the database');
    }
  } catch (error) {
    console.error('Error listing clients:', error);
  }
}

listClients();
