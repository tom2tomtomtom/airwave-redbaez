// Test script using the corrected Runway API endpoint and parameters
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
// Correct endpoint is "generation" not "inference"
const RUNWAY_API_URL = 'https://api.runwayml.com/v1/generation';

async function testRunwayAPI() {
  console.log('Testing Runway API with corrected endpoint and parameters...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  
  try {
    console.log('Generating an image with 16:9 aspect ratio...');
    
    // Flatter payload structure with correct parameter names
    const payload = {
      "prompt": "A serene landscape with mountains and a lake",
      "negative_prompt": "blurry, distorted", 
      "num_samples": 1,  // Correct parameter name
      "guidance_scale": 7,
      "aspect_ratio": "16:9",  // Correct parameter name
      "seed": 42
    };
    
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
    // Simple headers without X-Runway-Version
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${RUNWAY_API_KEY}`
    };
    
    console.log('Using headers:', {
      ...headers,
      'Authorization': 'Bearer API_KEY_HIDDEN'
    });
    
    const response = await axios.post(RUNWAY_API_URL, payload, { headers });
    
    console.log('✅ Image generation request succeeded!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing Runway API:');
    console.error('Status code:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Full error:', error.message);
  }
}

testRunwayAPI();
