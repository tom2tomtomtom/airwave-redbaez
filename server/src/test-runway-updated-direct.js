// Direct test script for the updated Runway API implementation
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.runwayml.com/v1/generation';

async function testRunwayAPI() {
  console.log('Testing updated Runway API implementation...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  
  try {
    console.log('Generating an image with 16:9 aspect ratio...');
    
    // Using the same payload structure as our updated service
    const payload = {
      prompt: 'A serene landscape with mountains and a lake at sunset',
      negative_prompt: 'blurry, distorted, oversaturated',
      num_samples: 1,
      guidance_scale: 7,
      aspect_ratio: '16:9',
      // Add a seed for reproducibility
      seed: Math.floor(Math.random() * 1000000)
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
    
    console.log('✅ Image generation request succeeded!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Check if there's a task ID to poll
    if (response.data.id) {
      console.log(`\nTask started with ID: ${response.data.id}`);
      console.log('To check the status, you can use:');
      console.log(`curl -X GET "https://api.runwayml.com/v1/generations/${response.data.id}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Accept: application/json"`);
      
      // Optional: Poll for status a couple of times
      for (let i = 0; i < 2; i++) {
        console.log(`\nPolling for status, attempt ${i + 1}/2...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        try {
          const statusResponse = await axios.get(
            `https://api.runwayml.com/v1/generations/${response.data.id}`,
            { headers }
          );
          
          console.log('Status:', statusResponse.data.status);
          if (statusResponse.data.output) {
            console.log('Output available!');
            console.log('Output:', JSON.stringify(statusResponse.data.output, null, 2));
            break;
          }
        } catch (pollError) {
          console.error('Error polling for status:', pollError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Runway API:');
    console.error('Status code:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Full error:', error.message);
  }
}

testRunwayAPI();
