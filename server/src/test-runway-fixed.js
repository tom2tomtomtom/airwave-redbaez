// Test script for the updated Runway API implementation
// Uses the correct .dev domain and proper API versioning headers

const axios = require('axios');
require('dotenv').config();

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1'; // Using .dev as per documentation
const RUNWAY_API_VERSION = '2024-11-06';  // Latest API version from docs

async function testRunwayAPI() {
  console.log('Testing Runway API with correct domain and versioning...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  console.log(`Using API Version: ${RUNWAY_API_VERSION}`);
  
  try {
    // Try a text-to-image generation request based on documentation
    console.log('\n==== Trying text-to-image generation ====');
    
    const generationResponse = await axios.post(
      `${RUNWAY_API_URL}/text_to_image`,
      {
        promptText: "A beautiful landscape with mountains and trees",
        width: 1024,
        height: 1024, // Using 1:1 aspect ratio for testing
        model: "gen3a_turbo", // Using model from documentation
        numOutputs: 1
      },
      {
        headers: {
          'Authorization': `Bearer ${RUNWAY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Runway-Version': RUNWAY_API_VERSION
        }
      }
    );
    
    console.log(`✅ Successfully started image generation!`);
    console.log(`Response:`, JSON.stringify(generationResponse.data, null, 2));
    
    // Poll for the task result
    if (generationResponse.data.id) {
      console.log('\n==== Polling for task status ====');
      const taskId = generationResponse.data.id;
      await pollForTaskResults(taskId);
    }
    
  } catch (error) {
    console.error('❌ Error testing Runway API:');
    console.error('Status code:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Full error:', error.message);
  }
}

async function pollForTaskResults(taskId, maxAttempts = 30, interval = 5000) {
  console.log(`Polling for task ${taskId}...`);
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      console.log(`Polling attempt ${attempts + 1}/${maxAttempts}...`);
      
      const taskResponse = await axios.get(
        `${RUNWAY_API_URL}/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${RUNWAY_API_KEY}`,
            'Accept': 'application/json',
            'X-Runway-Version': RUNWAY_API_VERSION
          }
        }
      );
      
      console.log(`Status: ${taskResponse.data.status}`);
      
      if (taskResponse.data.status === 'SUCCEEDED') {
        console.log(`✅ Task completed successfully!`);
        // Check for images in the output
        if (taskResponse.data.output && 
            taskResponse.data.output.images && 
            taskResponse.data.output.images.length > 0) {
          console.log(`Generated image URL:`, taskResponse.data.output.images[0].url);
          console.log(`All images:`, JSON.stringify(taskResponse.data.output.images, null, 2));
          return taskResponse.data.output.images;
        } else {
          console.log(`No images found in output:`, JSON.stringify(taskResponse.data, null, 2));
        }
        break;
      } else if (taskResponse.data.status === 'FAILED') {
        console.log(`❌ Task failed:`);
        console.log(JSON.stringify(taskResponse.data, null, 2));
        break;
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    } catch (error) {
      console.error(`❌ Error polling for task:`, error.message);
      console.error('Status code:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      break;
    }
  }
  
  if (attempts >= maxAttempts) {
    console.log(`❌ Timed out waiting for task to complete after ${maxAttempts} attempts`);
  }
}

testRunwayAPI();
