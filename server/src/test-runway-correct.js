// Test script using the correct Runway API endpoint and payload structure
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
// Use the correct API URL
const RUNWAY_API_URL = 'https://api.runwayml.com/v1/inference';
// API version format: YYYY-MM-DD
const RUNWAY_API_VERSION = '2023-11-27'; // Using a version format based on documentation

async function testRunwayAPI() {
  console.log('Testing Runway API with correct endpoint and parameters...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  
  try {
    console.log('Generating an image with 16:9 ratio...');
    
    // Create the payload according to the provided example
    const payload = {
      "model": "runway-gen-2",
      "input": {
        "prompt": "A serene landscape with mountains and a lake",
        "negative_prompt": "blurry, distorted", 
        "num_outputs": 1,
        "scheduler": "ddim",
        "num_inference_steps": 50,
        "guidance_scale": 7,
        "seed": 42,
        "ratio": "16:9"  // Correct format: string in the format "width:height"
      }
    };
    
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
    // Log the headers we're using
    console.log('Using headers:', {
      'Authorization': 'Bearer API_KEY_HIDDEN',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Runway-Version': RUNWAY_API_VERSION
    });
    
    const response = await axios.post(
      RUNWAY_API_URL,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${RUNWAY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Runway-Version': RUNWAY_API_VERSION
        }
      }
    );
    
    console.log('✅ Image generation request succeeded!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Handle response data based on the structure
    if (response.data.status === 'succeeded') {
      console.log('Image generation completed successfully!');
      console.log('Output URL:', response.data.output);
    } else if (response.data.status === 'processing') {
      console.log('Image generation is still processing.');
      console.log('You can check the status with the prediction ID:', response.data.id);
    }
    
  } catch (error) {
    console.error('❌ Error testing Runway API:');
    console.error('Status code:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Full error:', error.message);
  }
}

testRunwayAPI();
