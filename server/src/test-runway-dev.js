// Test script using the correct Runway API domain and versioning

const axios = require('axios');
require('dotenv').config();

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.dev.runwayml.com'; // Note the .dev subdomain
const RUNWAY_VERSION = '2024-11-06';  // Use latest version from docs

async function testRunwayAPI() {
  console.log('Testing Runway API with correct domain and versioning...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  console.log(`Using API Version: ${RUNWAY_VERSION}`);
  
  try {
    // First try listing available models
    console.log('\n==== Checking available models ====');
    
    const modelsResponse = await axios.get(
      `${RUNWAY_API_URL}/v1/models`,
      {
        headers: {
          'Authorization': `Bearer ${RUNWAY_API_KEY}`,
          'Accept': 'application/json',
          'X-Runway-Version': RUNWAY_VERSION
        }
      }
    );
    
    console.log(`✅ Successfully retrieved models!`);
    console.log(`Response:`, JSON.stringify(modelsResponse.data, null, 2));
    
    // Try an image generation request based on latest docs
    console.log('\n==== Trying text-to-image generation ====');
    
    const generationResponse = await axios.post(
      `${RUNWAY_API_URL}/v1/text_to_image`,
      {
        promptText: "A cat in a tree",
        width: 1024,
        height: 1024,
        model: "gen3a_turbo" // Using model from documentation
      },
      {
        headers: {
          'Authorization': `Bearer ${RUNWAY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Runway-Version': RUNWAY_VERSION
        }
      }
    );
    
    console.log(`✅ Successfully started image generation!`);
    console.log(`Response ID:`, generationResponse.data.id);
    console.log(`Full response:`, JSON.stringify(generationResponse.data, null, 2));
    
    // Poll for the result if it's asynchronous
    if (generationResponse.data.id) {
      console.log('\n==== Polling for task status ====');
      const taskId = generationResponse.data.id;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        console.log(`Polling attempt ${attempts + 1}/${maxAttempts}...`);
        const taskResponse = await axios.get(
          `${RUNWAY_API_URL}/v1/tasks/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${RUNWAY_API_KEY}`,
              'Accept': 'application/json',
              'X-Runway-Version': RUNWAY_VERSION
            }
          }
        );
        
        console.log(`Status: ${taskResponse.data.status}`);
        
        if (taskResponse.data.status === 'SUCCEEDED') {
          console.log(`✅ Task completed successfully!`);
          console.log(`Result:`, JSON.stringify(taskResponse.data, null, 2));
          break;
        } else if (taskResponse.data.status === 'FAILED') {
          console.log(`❌ Task failed:`);
          console.log(JSON.stringify(taskResponse.data, null, 2));
          break;
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    }
    
  } catch (error) {
    console.error('Error testing Runway API:');
    console.error('Status code:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Full error:', error.message);
  }
}

testRunwayAPI();
