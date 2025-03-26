// Test script using the Runway API format from the React component example
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.runwayml.com/v1/generation';

async function testRunwayAPI() {
  console.log('Testing Runway API with the React component implementation format...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  
  try {
    // Using the exact same structure as the React component
    const payload = {
      prompt: "A serene landscape with mountains and a lake at sunset",
      negative_prompt: "",
      num_samples: 1,
      guidance_scale: 7,
      aspect_ratio: "16:9",
    };
    
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
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
    
    console.log('✅ Request succeeded!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Check for artifacts in the response as in the React component
    if (response.data && response.data.artifacts && response.data.artifacts.length > 0) {
      console.log('✅ Image generated successfully!');
      console.log('Image URL:', response.data.artifacts[0].uri);
    } else {
      console.log('❌ No artifacts found in the response');
    }
    
  } catch (error) {
    console.error('❌ Error testing Runway API:');
    console.error('Status code:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Full error:', error.message);
  }
}

testRunwayAPI();
