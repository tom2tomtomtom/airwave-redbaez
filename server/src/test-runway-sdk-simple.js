// Simple test of the Runway SDK
require('dotenv').config();
const RunwayML = require('@runwayml/sdk');

// Use the API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('Testing Runway API with a simple SDK approach...');
console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
console.log('SDK module structure:', Object.keys(RunwayML));

// Try different ways to initialize the SDK
try {
  // Approach 1: Use as default export
  const client1 = new RunwayML.default({ apiKey: RUNWAY_API_KEY });
  console.log('Successfully initialized client with RunwayML.default');
  console.log('Client1 methods:', Object.keys(client1));
} catch (error) {
  console.error('Error initializing with RunwayML.default:', error.message);
}

try {
  // Approach 2: Use directly
  const client2 = new RunwayML({ apiKey: RUNWAY_API_KEY });
  console.log('Successfully initialized client with RunwayML directly');
  console.log('Client2 methods:', Object.keys(client2));
} catch (error) {
  console.error('Error initializing directly:', error.message);
}

// Try with a plain axios request to text-to-image endpoint
const axios = require('axios');

async function testDirectRequest() {
  try {
    console.log('\nAttempting direct API request...');
    
    const response = await axios.post(
      'https://api.dev.runwayml.com/v1/text_to_image',
      {
        promptText: 'A cat in a tree',
        model: 'gen3a_turbo',
        ratio: 'square' // Try with the ratio parameter
      },
      {
        headers: {
          'Authorization': `Bearer ${RUNWAY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Runway-Version': '2024-11-06'
        }
      }
    );
    
    console.log('✅ Direct API request succeeded!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Direct API request failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDirectRequest();
