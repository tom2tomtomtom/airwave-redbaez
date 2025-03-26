// Test script for Runway API with explicit aspect ratio parameter
const axios = require('axios');
require('dotenv').config();

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';
const RUNWAY_API_VERSION = '2024-11-06';

async function testRunwayAPI() {
  console.log('Testing Runway API with explicit aspect ratio...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  console.log(`Using API Version: ${RUNWAY_API_VERSION}`);
  
  // Try different ratio formats to see which one works
  const testParams = [
    {
      name: "Basic request with no dimensions",
      payload: {
        promptText: "A cat in a tree",
        model: "gen3a_turbo"
      }
    },
    {
      name: "With aspectRatio parameter as number",
      payload: {
        promptText: "A cat in a tree",
        model: "gen3a_turbo",
        aspectRatio: 1.0
      }
    },
    {
      name: "With aspectRatio parameter as string",
      payload: {
        promptText: "A cat in a tree",
        model: "gen3a_turbo",
        aspectRatio: "1:1"
      }
    },
    {
      name: "With aspectRatio parameter as string 16:9",
      payload: {
        promptText: "A cat in a tree",
        model: "gen3a_turbo",
        aspectRatio: "16:9"
      }
    },
    {
      name: "With width and height in 1:1 ratio",
      payload: {
        promptText: "A cat in a tree",
        model: "gen3a_turbo",
        width: 1024,
        height: 1024
      }
    },
    {
      name: "With width and height in 16:9 ratio",
      payload: {
        promptText: "A cat in a tree",
        model: "gen3a_turbo",
        width: 1920,
        height: 1080
      }
    },
    {
      name: "With explicit ratio parameter",
      payload: {
        promptText: "A cat in a tree",
        model: "gen3a_turbo",
        ratio: "1:1"
      }
    },
    {
      name: "With explicit ratio parameter 16:9",
      payload: {
        promptText: "A cat in a tree",
        model: "gen3a_turbo",
        ratio: "16:9"
      }
    }
  ];

  // Test each parameter variation
  for (const test of testParams) {
    try {
      console.log(`\n==== Testing: ${test.name} ====`);
      console.log(`Payload: ${JSON.stringify(test.payload, null, 2)}`);
      
      const response = await axios.post(
        `${RUNWAY_API_URL}/text_to_image`,
        test.payload,
        {
          headers: {
            'Authorization': `Bearer ${RUNWAY_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Runway-Version': RUNWAY_API_VERSION
          }
        }
      );
      
      console.log(`✅ Success! Response:`, JSON.stringify(response.data, null, 2));
      
      // If successful, no need to test the other variations
      console.log(`\n✅ Found working format: ${test.name}`);
      console.log(`Working payload: ${JSON.stringify(test.payload, null, 2)}`);
      break;
      
    } catch (error) {
      console.error(`❌ Failed with error:`, 
        error.response?.data?.error || error.message);
    }
  }
}

testRunwayAPI();
