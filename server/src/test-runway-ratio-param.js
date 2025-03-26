// Test script using direct 'ratio' parameter
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';
const RUNWAY_API_VERSION = '2024-11-06';

async function testRunwayAPI() {
  console.log('Testing Runway API with direct ratio parameter...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  
  // Try different direct ratio formats
  const ratioFormats = [
    "1:1",
    "16:9",
    "4:3",
    "1",
    "1.0",
    "square"
  ];

  for (const ratioValue of ratioFormats) {
    try {
      console.log(`\n==== Testing with ratio: "${ratioValue}" ====`);
      
      const payload = {
        promptText: 'A cat sitting in a tree with sunlight filtering through the leaves',
        model: 'gen3a_turbo',
        ratio: ratioValue
      };
      
      console.log('Request payload:', JSON.stringify(payload, null, 2));
      
      const response = await axios.post(
        `${RUNWAY_API_URL}/text_to_image`,
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
      
      console.log('✅ SUCCESS with ratio:', ratioValue);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
      // Exit on first success
      console.log(`\n✅ Found working ratio format: "${ratioValue}"`);
      return;
      
    } catch (error) {
      console.error(`❌ Failed with ratio "${ratioValue}":`, 
                    error.response?.data?.error || error.message);
    }
  }
  
  console.log('\n❌ None of the tested ratio formats worked');
}

testRunwayAPI();
