// Simple script to test Runway API connection directly

const axios = require('axios');
require('dotenv').config();

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
// Try different API endpoints
const BASE_URL = 'https://api.runwayml.com';
const INFERENCES_URL = `${BASE_URL}/v1/inferences`;
const GENERATIONS_URL = `${BASE_URL}/v1/generations`;

async function testRunwayAPI() {
  console.log('Testing Runway API connection...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  
  // Try both API endpoints with different versions
  const apiVersions = [
    null, // No version header
    '2023-11-20',
    '2023-12-01',
    '2024-01-01',
    '2024-03-01'
  ];
  
  const models = [
    'runwayml/stable-diffusion-v1-5',
    'stability-ai/stable-diffusion',
    'runwayml/gen-2',
    'stability-ai/sdxl'
  ];
  
  // Try different payload formats
  const payloads = [
    {
      model: 'stability-ai/stable-diffusion',
      input: {
        prompt: 'A cat in a tree',
        width: 1024,
        height: 1024,
        num_outputs: 1
      }
    },
    {
      model: 'runwayml/gen-2',
      inputs: {
        prompt: 'A cat in a tree',
        negative_prompt: '',
        width: 1024,
        height: 1024,
        num_samples: 1
      }
    }
  ];

  // First try a simple API status check
  try {
    console.log('\n==== CHECKING API STATUS ====');
    for (const version of apiVersions) {
      try {
        const headers = {
          'Authorization': `Bearer ${RUNWAY_API_KEY}`,
          'Accept': 'application/json'
        };
        
        if (version) {
          headers['X-API-Version'] = version;
        }
        
        console.log(`\nTrying API status check with ${version ? 'version ' + version : 'no version header'}...`);
        const response = await axios.get(`${BASE_URL}/v1/models`, { headers });
        console.log('SUCCESS! Status code:', response.status);
        console.log('Available models:', response.data);
        // If successful, break out of the loop
        break;
      } catch (error) {
        console.error(`FAILED with version ${version}:`, error.response?.data || error.message);
      }
    }
  } catch (error) {
    console.error('All API status checks failed');
  }

  // Then try image generation with different combinations
  try {
    console.log('\n==== TESTING IMAGE GENERATION ====');
    
    for (const payload of payloads) {
      for (const version of apiVersions) {
        const headers = {
          'Authorization': `Bearer ${RUNWAY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        if (version) {
          headers['X-API-Version'] = version;
        }
        
        try {
          console.log(`\nTrying with payload:`, JSON.stringify(payload));
          console.log(`Using version: ${version || 'none'}`);
          
          const generationResponse = await axios.post(
            INFERENCES_URL,
            payload,
            { headers }
          );
    
          console.log('SUCCESS! Generation request accepted!');
          console.log('Response:', JSON.stringify(generationResponse.data, null, 2));
          // If successful, break out of the loop
          return;
        } catch (error) {
          console.error(`FAILED with version ${version}:`, error.response?.data || error.message);
        }
      }
    }
    
    console.error('All generation attempts failed');
  } catch (error) {
    console.error('Error in generation test structure:', error.message);
  }
}

testRunwayAPI();
