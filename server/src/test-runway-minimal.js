// Minimal test script for Runway API
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
// Let's try the base URL without the specific endpoint
const RUNWAY_API_URL = 'https://api.runwayml.com/v1';

async function testRunwayAPI() {
  console.log('Testing Runway API with minimal configuration...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  
  // Try different endpoints and structures
  const endpoints = [
    '/generation',
    '/generations',
    '/v1/generation',
    '/inference'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n==== Testing endpoint: ${RUNWAY_API_URL}${endpoint} ====`);
      
      // Minimal payload
      const payload = {
        prompt: "A serene landscape with mountains and a lake"
      };
      
      console.log('Request payload:', JSON.stringify(payload, null, 2));
      
      // Minimal headers
      const headers = {
        'Authorization': `Bearer ${RUNWAY_API_KEY}`
      };
      
      console.log('Using headers:', {
        ...headers,
        'Authorization': 'Bearer API_KEY_HIDDEN'
      });
      
      const response = await axios.post(`${RUNWAY_API_URL}${endpoint}`, payload, { headers });
      
      console.log('✅ Request succeeded!');
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      // Exit on first success
      return;
      
    } catch (error) {
      console.error(`❌ Error with endpoint ${endpoint}:`);
      console.error('Status code:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Full error:', error.message);
    }
  }
  
  console.log('\n❌ All endpoints failed');
  console.log('\nTroubleshooting suggestions:');
  console.log('1. Verify that your API key is valid and has sufficient permissions');
  console.log('2. Check if there are rate limits or quota restrictions on your account');
  console.log('3. Consider that the API structure might have changed - check the latest documentation');
  console.log('4. Try using the official Runway SDK if available');
}

testRunwayAPI();
