/**
 * Script to test API endpoint for fetching assets
 */
const axios = require('axios');

// Client ID to check
const CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';

// API URL
const API_URL = 'http://localhost:3002';

async function testAssetFetch() {
  try {
    console.log(`Testing asset fetch for client ID: ${CLIENT_ID}`);
    
    // Call the API endpoint that the UI is using
    const response = await axios.get(`${API_URL}/api/assets?clientId=${CLIENT_ID}&type=image`);
    
    console.log(`API returned ${response.data.length} image assets`);
    
    if (response.data.length > 0) {
      // Log a few sample assets to examine their structure
      console.log("Sample assets:");
      response.data.slice(0, 3).forEach((asset, index) => {
        console.log(`Asset ${index + 1}:`);
        console.log(`  ID: ${asset.id}`);
        console.log(`  Name: ${asset.name}`);
        console.log(`  Type: ${asset.type}`);
        console.log(`  URL: ${asset.url}`);
        console.log(`  Thumbnail URL: ${asset.thumbnail_url || asset.thumbnailUrl}`);
        console.log(`  Client ID: ${asset.client_id}`);
        console.log('---');
      });
      
      // Check if there might be a URL mismatch issue
      if (response.data.length > 0) {
        const asset = response.data[0];
        const url = asset.url;
        
        if (url.startsWith('/uploads/')) {
          console.log('\nPotential URL resolution issue:');
          console.log(`Asset URL "${url}" is a relative path.`);
          console.log(`When loaded in browser, it resolves to: ${API_URL}${url}`);
          console.log(`Try opening this URL directly in browser to check if the asset loads.`);
        }
      }
    } else {
      console.log('No image assets found for this client. Possible issues:');
      console.log('1. Assets exist but are not of type "image"');
      console.log('2. Assets do not have the correct client_id');
      console.log('3. API endpoint has a filtering issue');
    }
    
  } catch (error) {
    console.error('Error testing asset fetch:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
}

testAssetFetch();
