/**
 * Script to check the API endpoint that the generate content page is using
 */
const express = require('express');
const { createServer } = require('http');
const path = require('path');
const cors = require('cors');

// Create a simple express server to debug requests
const app = express();

// Enable CORS for all requests
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Create a mock uploads directory
const uploadsDir = path.join(__dirname, 'mock-uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the mock uploads directory
app.use('/uploads', express.static(uploadsDir));

// Create a mock endpoint for assets
app.get('/api/assets', (req, res) => {
  console.log('Received request for assets with query params:', req.query);
  console.log('Headers:', req.headers);
  
  // Check for authentication
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('No authentication header provided');
  } else {
    console.log('Authentication header:', authHeader);
  }
  
  // Check if clientId is provided
  const clientId = req.query.clientId;
  if (!clientId) {
    return res.status(400).json({ 
      success: false, 
      message: 'clientId is required' 
    });
  }
  
  // Check if type is provided
  const type = req.query.type;
  if (!type) {
    return res.status(400).json({ 
      success: false, 
      message: 'type is required' 
    });
  }
  
  // Return mock data
  return res.json([
    {
      id: 'mock-1',
      name: 'Mock Image 1',
      type: 'image',
      url: '/uploads/mock1.jpg',
      client_id: clientId
    },
    {
      id: 'mock-2',
      name: 'Mock Image 2',
      type: 'image',
      url: '/uploads/mock2.jpg',
      client_id: clientId
    }
  ]);
});

// Start the server on a different port
const PORT = 3099;
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Debug server running at http://localhost:${PORT}`);
  console.log('To test:');
  console.log(`1. Open your browser to http://localhost:${PORT}/api/assets?clientId=test&type=image`);
  console.log('2. Look at the server logs to see request details');
  console.log('3. Run curl for more detailed testing:');
  console.log(`   curl -v "http://localhost:${PORT}/api/assets?clientId=test&type=image"`);
  console.log('4. Press Ctrl+C to stop the server');
});
