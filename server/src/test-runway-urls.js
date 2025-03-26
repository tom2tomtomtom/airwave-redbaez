// Test script to try different Runway API endpoints and formats

const axios = require('axios');
require('dotenv').config();

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

// Define potential base URLs to try
const possibleBaseUrls = [
  'https://api.runwayml.com',
  'https://api.runway.com',
  'https://api.runwayml.ai',
  'https://api.run.ml'
];

async function testRunwayEndpoints() {
  console.log('Testing Runway API with different endpoints...');
  console.log(`Using API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  
  // Try each base URL with different API path combinations
  for (const baseUrl of possibleBaseUrls) {
    console.log(`\n==== Testing base URL: ${baseUrl} ====`);
    
    // Define potential API version paths
    const versionPaths = [
      '/v1',
      '/v2',
      '/api/v1',
      '/api'
    ];
    
    // Define endpoints to test
    const endpoints = [
      'models',
      'inferences',
      'generations',
      'status'
    ];
    
    // Try each combination
    for (const versionPath of versionPaths) {
      for (const endpoint of endpoints) {
        const fullUrl = `${baseUrl}${versionPath}/${endpoint}`;
        
        try {
          console.log(`\nTrying: ${fullUrl}`);
          const response = await axios.get(fullUrl, {
            headers: {
              'Authorization': `Bearer ${RUNWAY_API_KEY}`,
              'Accept': 'application/json'
            },
            // Set a short timeout to avoid long waits for non-existent endpoints
            timeout: 5000
          });
          
          console.log(`✅ SUCCESS with ${fullUrl}`);
          console.log(`Status: ${response.status}`);
          console.log(`Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
          
          // If we got a successful response, try a simple generation
          if (endpoint === 'models' || endpoint === 'inferences') {
            console.log('\nAttempting image generation with this endpoint...');
            try {
              const genUrl = `${baseUrl}${versionPath}/inferences`;
              console.log(`POST to: ${genUrl}`);
              
              const genResponse = await axios.post(
                genUrl,
                {
                  model: "runwayml/gen-2",
                  inputs: {
                    prompt: "A cat in a tree",
                    width: 1024, 
                    height: 1024,
                    num_samples: 1
                  }
                },
                {
                  headers: {
                    'Authorization': `Bearer ${RUNWAY_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  timeout: 10000
                }
              );
              
              console.log(`✅✅ GENERATION SUCCESSFUL with ${genUrl}`);
              console.log(`Response: ${JSON.stringify(genResponse.data).substring(0, 100)}...`);
              return;
            } catch (genError) {
              console.log(`❌ Generation failed: ${genError.message}`);
              if (genError.response) {
                console.log(`Status: ${genError.response.status}`);
                console.log(`Data: ${JSON.stringify(genError.response.data)}`);
              }
            }
          }
        } catch (error) {
          console.log(`❌ Failed: ${error.message}`);
          if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Data: ${JSON.stringify(error.response.data)}`);
          }
        }
      }
    }
  }
  
  console.log('\n==== Testing alternative headers ====');
  
  // Try using a different authorization format
  const authFormats = [
    `Bearer ${RUNWAY_API_KEY}`,
    RUNWAY_API_KEY,
    `Basic ${RUNWAY_API_KEY}`,
    `ApiKey ${RUNWAY_API_KEY}`,
    `X-API-Key ${RUNWAY_API_KEY}`
  ];
  
  for (const authFormat of authFormats) {
    try {
      console.log(`\nTrying auth format: ${authFormat.split(' ')[0]}...`);
      
      const response = await axios.get('https://api.runwayml.com/v1/models', {
        headers: {
          'Authorization': authFormat,
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      
      console.log(`✅ SUCCESS with auth format: ${authFormat.split(' ')[0]}`);
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
}

testRunwayEndpoints();
