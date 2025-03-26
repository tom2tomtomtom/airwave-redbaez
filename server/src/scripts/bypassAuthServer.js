/**
 * Simple server that provides a non-authenticated endpoint to fetch assets
 * This helps verify if authentication is the issue
 */
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Create express app
const app = express();

// Enable CORS for all requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON requests
app.use(express.json());

// Supabase credentials
const SUPABASE_URL = 'https://vnlmumkhqupdmvywneuf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubG11bWtocXVwZG12eXduZXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMzQ2MjEsImV4cCI6MjA1NjcxMDYyMX0.rGn9_Zkbb0FYXwjs-RLlWO6lpqoTbQRsNFwmvdn1pDQ';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test endpoint to verify server is working
app.get('/test', (req, res) => {
  res.json({ message: 'Test server is running' });
});

// Create endpoint to bypass authentication and fetch assets directly
app.get('/bypass-auth-assets', async (req, res) => {
  try {
    console.log('Bypass auth assets request received');
    console.log('Query params:', req.query);
    
    // Get client ID from query parameter
    const clientId = req.query.clientId;
    if (!clientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'clientId is required' 
      });
    }
    
    // Get type from query parameter
    const type = req.query.type;
    
    // Construct query
    let query = supabase
      .from('assets')
      .select('*')
      .eq('client_id', clientId);
    
    // Add type filter if provided
    if (type) {
      query = query.eq('type', type);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching assets', 
        error 
      });
    }
    
    console.log(`Found ${data.length} assets for client ${clientId}${type ? ` with type ${type}` : ''}`);
    
    // Return assets
    return res.json(data);
  } catch (error) {
    console.error('Error in bypass auth assets endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch assets', 
      error: error.message 
    });
  }
});

// Start server on port 3099 to avoid conflicts
const PORT = 3099;
app.listen(PORT, () => {
  console.log(`Bypass Auth Server running at http://localhost:${PORT}`);
  console.log(`Test if server is running: http://localhost:${PORT}/test`);
  console.log(`Fetch assets directly: http://localhost:${PORT}/bypass-auth-assets?clientId=fd790d19-6610-4cd5-b90f-214808e94a19&type=image`);
});
