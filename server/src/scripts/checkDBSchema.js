/**
 * Script to check the database schema for assets and clients
 */
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const SUPABASE_URL = 'https://vnlmumkhqupdmvywneuf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubG11bWtocXVwZG12eXduZXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMzQ2MjEsImV4cCI6MjA1NjcxMDYyMX0.rGn9_Zkbb0FYXwjs-RLlWO6lpqoTbQRsNFwmvdn1pDQ';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
  try {
    console.log('Checking database schema...\n');
    
    // Check assets table schema
    console.log('ASSETS TABLE SCHEMA:');
    const { data: assetSample, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .limit(1);
      
    if (assetError) {
      console.error('Error fetching asset schema:', assetError);
    } else if (assetSample && assetSample.length > 0) {
      const assetColumns = Object.keys(assetSample[0]);
      console.log('Columns:', assetColumns);
      
      // Check if client_id exists
      if (assetColumns.includes('client_id')) {
        console.log('✅ client_id column exists in assets table');
      } else {
        console.log('❌ client_id column MISSING from assets table');
      }
      
      // Print schema types
      console.log('\nColumn types:');
      Object.entries(assetSample[0]).forEach(([key, value]) => {
        console.log(`- ${key}: ${typeof value} ${value === null ? '(null)' : ''}`);
      });
    } else {
      console.log('No asset records found to check schema');
    }
    
    // Check clients table schema
    console.log('\nCLIENTS TABLE SCHEMA:');
    const { data: clientSample, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .limit(1);
      
    if (clientError) {
      console.error('Error fetching client schema:', clientError);
    } else if (clientSample && clientSample.length > 0) {
      const clientColumns = Object.keys(clientSample[0]);
      console.log('Columns:', clientColumns);
      console.log('\nColumn types:');
      Object.entries(clientSample[0]).forEach(([key, value]) => {
        console.log(`- ${key}: ${typeof value} ${value === null ? '(null)' : ''}`);
      });
    } else {
      console.log('No client records found to check schema');
    }
    
    // Count assets with client_id
    console.log('\nASSET STATISTICS:');
    const { data: assets, error: countError } = await supabase
      .from('assets')
      .select('id, client_id');
      
    if (countError) {
      console.error('Error counting assets:', countError);
    } else if (assets) {
      const totalAssets = assets.length;
      const assetsWithClientId = assets.filter(a => a.client_id).length;
      const assetsWithoutClientId = totalAssets - assetsWithClientId;
      
      console.log(`Total assets: ${totalAssets}`);
      console.log(`Assets with client_id: ${assetsWithClientId}`);
      console.log(`Assets without client_id: ${assetsWithoutClientId}`);
      
      // Count by client
      if (assetsWithClientId > 0) {
        console.log('\nAssets by client:');
        const clientCounts = {};
        assets.forEach(asset => {
          if (asset.client_id) {
            clientCounts[asset.client_id] = (clientCounts[asset.client_id] || 0) + 1;
          }
        });
        
        Object.entries(clientCounts).forEach(([clientId, count]) => {
          console.log(`- Client ${clientId}: ${count} assets`);
        });
      }
    }
    
    // Check client list
    console.log('\nAVAILABLE CLIENTS:');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, company_name');
      
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    } else if (clients && clients.length > 0) {
      console.log(`Found ${clients.length} clients:`);
      clients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.name || 'Unnamed'} (${client.company_name || 'No company'}) - ID: ${client.id}`);
      });
    } else {
      console.log('No clients found in database');
    }
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

// Run the schema check
checkSchema();
