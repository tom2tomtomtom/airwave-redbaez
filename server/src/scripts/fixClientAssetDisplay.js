/**
 * Script to troubleshoot and fix the client asset display issue
 */
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');

// Create express app for testing
const app = express();

// Supabase credentials
const SUPABASE_URL = 'https://vnlmumkhqupdmvywneuf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubG11bWtocXVwZG12eXduZXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMzQ2MjEsImV4cCI6MjA1NjcxMDYyMX0.rGn9_Zkbb0FYXwjs-RLlWO6lpqoTbQRsNFwmvdn1pDQ';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON requests
app.use(express.json());

// Helper function to get clients
async function getClients() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*');
      
    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching clients:', error);
    return [];
  }
}

// Helper function to get assets for a client
async function getAssetsByClient(clientId, type = null) {
  try {
    let query = supabase
      .from('assets')
      .select('*')
      .eq('client_id', clientId);
      
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching assets for client ${clientId}:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Exception fetching assets for client ${clientId}:`, error);
    return [];
  }
}

// Debug endpoint 
app.get('/api/debug/clients', async (req, res) => {
  const clients = await getClients();
  res.json({
    success: true,
    count: clients.length,
    clients
  });
});

// Debug endpoint to get assets for a specific client
app.get('/api/debug/client-assets/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { type } = req.query;
  
  const assets = await getAssetsByClient(clientId, type);
  
  res.json({
    success: true,
    count: assets.length,
    clientId,
    type: type || 'all',
    assets
  });
});

// Helper endpoint to serve assets with CORS enabled
app.get('/api/public-assets', async (req, res) => {
  const { clientId, type } = req.query;
  
  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: 'clientId is required'
    });
  }
  
  const assets = await getAssetsByClient(clientId, type);
  
  res.json(assets);
});

// Function to verify all clients have proper assets
async function verifyClientAssets() {
  console.log('Verifying client assets...');
  
  // Get all clients
  const clients = await getClients();
  console.log(`Found ${clients.length} clients`);
  
  if (clients.length === 0) {
    console.log('No clients found. Creating a default client...');
    
    // Create a default client
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert([{
        name: 'Default Client',
        description: 'Automatically created default client',
        primary_color: '#5a67d8',
        secondary_color: '#4c51bf',
        is_active: true
      }])
      .select();
      
    if (error) {
      console.error('Error creating default client:', error);
    } else if (newClient && newClient.length > 0) {
      console.log('Created default client:', newClient[0]);
      clients.push(newClient[0]);
    }
  }
  
  // For each client, verify assets
  for (const client of clients) {
    console.log(`\nChecking assets for client: ${client.name} (${client.id})`);
    
    // Get all assets for this client
    const assets = await getAssetsByClient(client.id);
    console.log(`  Found ${assets.length} total assets for client`);
    
    // Filter by type
    const imageAssets = assets.filter(a => a.type === 'image');
    const videoAssets = assets.filter(a => a.type === 'video');
    const audioAssets = assets.filter(a => a.type === 'audio');
    const otherAssets = assets.filter(a => !['image', 'video', 'audio'].includes(a.type));
    
    console.log(`  - ${imageAssets.length} image assets`);
    console.log(`  - ${videoAssets.length} video assets`);
    console.log(`  - ${audioAssets.length} audio assets`);
    console.log(`  - ${otherAssets.length} other/unclassified assets`);
    
    // Check if any assets have broken/unusual types
    if (otherAssets.length > 0) {
      console.log('  ⚠️ Found assets with unusual types:');
      const typeGroups = {};
      otherAssets.forEach(asset => {
        typeGroups[asset.type || 'null'] = (typeGroups[asset.type || 'null'] || 0) + 1;
      });
      
      Object.entries(typeGroups).forEach(([type, count]) => {
        console.log(`    - ${type}: ${count} assets`);
      });
      
      console.log('  These unusual types might be causing display issues in the dashboard.');
    }
    
    // Check if image URLs are valid
    if (imageAssets.length > 0) {
      console.log('\n  Checking image asset URLs:');
      const urlPatterns = {};
      
      imageAssets.forEach(asset => {
        const url = asset.url || '';
        let pattern = 'empty';
        
        if (url.startsWith('http')) pattern = 'absolute';
        else if (url.startsWith('/')) pattern = 'server-relative';
        else pattern = 'relative/other';
        
        urlPatterns[pattern] = (urlPatterns[pattern] || 0) + 1;
      });
      
      Object.entries(urlPatterns).forEach(([pattern, count]) => {
        console.log(`    - ${pattern}: ${count} assets`);
      });
      
      // Sample URLs
      console.log('\n  Sample image URLs:');
      for (let i = 0; i < Math.min(5, imageAssets.length); i++) {
        console.log(`    - ${imageAssets[i].name}: ${imageAssets[i].url}`);
      }
    }
  }
  
  console.log('\nChecks complete!');
}

// Start the server on port 3098
const PORT = 3098;
app.listen(PORT, async () => {
  console.log(`Asset fix server running at http://localhost:${PORT}`);
  console.log(`Client list: http://localhost:${PORT}/api/debug/clients`);
  console.log(`Client assets: http://localhost:${PORT}/api/debug/client-assets/[clientId]?type=image`);
  console.log(`Public assets: http://localhost:${PORT}/api/public-assets?clientId=[clientId]&type=image`);
  
  // Run verification
  await verifyClientAssets();
});
