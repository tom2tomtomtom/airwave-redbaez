// Test Runway API with different version formats
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.runwayml.com/v1/inference';

// Try different version formats
const API_VERSIONS = [
  '2023-01-01',  // Early date format
  '2023-11-27',  // Format we tried earlier
  '2023-12-01',  // Recent date
  '2024-03-01',  // Very recent date
  null           // No version header at all
];

async function testWithVersion(version) {
  try {
    console.log(`\n==== Testing with API version: ${version || 'NO VERSION HEADER'} ====`);
    
    // Create standard payload
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
        "ratio": "16:9"
      }
    };
    
    // Create headers based on whether version is provided
    const headers = {
      'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Only add version header if provided
    if (version) {
      headers['X-Runway-Version'] = version;
    }
    
    console.log('Using headers:', {
      ...headers,
      'Authorization': 'Bearer API_KEY_HIDDEN'
    });
    
    const response = await axios.post(
      RUNWAY_API_URL,
      payload,
      { headers }
    );
    
    console.log('✅ SUCCESS with version:', version);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
    
  } catch (error) {
    console.error(`❌ FAILED with version ${version || 'NO VERSION'}:`, 
                 error.response?.data?.error || error.message);
    return false;
  }
}

async function main() {
  console.log('Testing Runway API with different version formats...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  
  let foundWorking = false;
  
  for (const version of API_VERSIONS) {
    const success = await testWithVersion(version);
    if (success) {
      console.log(`\n✅ Found working version: ${version || 'NO VERSION HEADER'}`);
      foundWorking = true;
      break;
    }
  }
  
  if (!foundWorking) {
    console.log('\n❌ None of the tested versions worked');
  }
}

main();
