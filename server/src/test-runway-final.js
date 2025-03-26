// Final test script using all corrected Runway API parameters
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.runwayml.com/v1/generation';

async function testRunwayAPI() {
  console.log('Testing Runway API with all corrected parameters...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  
  // Try multiple API version formats
  const versionFormats = [
    null,  // No version header
    "v1",  // Simple version
    "2022-01-01",  // Date format
    "latest"  // Latest version
  ];
  
  for (const version of versionFormats) {
    try {
      console.log(`\n==== Testing with API version: ${version || 'NO VERSION HEADER'} ====`);
      
      // Flatter payload structure with correct parameter names
      const payload = {
        "prompt": "A serene landscape with mountains and a lake",
        "negative_prompt": "blurry, distorted", 
        "num_samples": 1,
        "guidance_scale": 7,
        "aspect_ratio": "16:9",
        "seed": 42
      };
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${RUNWAY_API_KEY}`
      };
      
      // Add version header if specified
      if (version) {
        headers['X-Runway-Version'] = version;
      }
      
      console.log('Using headers:', {
        ...headers,
        'Authorization': 'Bearer API_KEY_HIDDEN'
      });
      
      const response = await axios.post(RUNWAY_API_URL, payload, { headers });
      
      console.log('✅ SUCCESS with version:', version);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
      // Exit on first success
      console.log(`\n✅ Found working API version: ${version || 'NO VERSION HEADER'}`);
      return;
      
    } catch (error) {
      console.error(`❌ FAILED with version ${version || 'NO VERSION'}:`,
                    error.response?.data?.error || error.message);
      
      // Print more detailed error info if available
      if (error.response && error.response.data && typeof error.response.data === 'object') {
        console.error('Detailed error data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
  
  console.log('\n❌ None of the tested version formats worked');
  console.log('\nPossible Solutions:');
  console.log('1. Check if your API key has sufficient permissions for image generation');
  console.log('2. Check if your account has sufficient credits');
  console.log('3. Verify the API has not changed since the documentation was written');
  console.log('4. Contact Runway support for up-to-date integration instructions');
}

testRunwayAPI();
