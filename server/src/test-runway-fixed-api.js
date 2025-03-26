// Test Runway API with correct structure based on SDK docs
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
// The correct API endpoint is very important - must be v1/generation
const RUNWAY_API_URL = 'https://api.runwayml.com/v1/generation';

async function testRunwayAPI() {
  console.log('Testing Runway API with correct endpoint and parameters...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  
  try {
    // Using the simplified parameters structure
    const payload = {
      prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
      negative_prompt: "blurry, distorted, pixelated, low quality",
      aspect_ratio: "16:9",
      num_samples: 1,
      guidance_scale: 7
    };
    
    console.log('\nRequest payload:', JSON.stringify(payload, null, 2));
    
    console.log('Making request with headers:');
    console.log({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer API_KEY_HIDDEN'
    });
    
    // Make API request
    console.log(`\nMaking request to ${RUNWAY_API_URL}...`);
    const response = await axios.post(
      RUNWAY_API_URL,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${RUNWAY_API_KEY}`
        }
      }
    );
    
    console.log('\n✅ API request successful!');
    console.log('Response status:', response.status);
    console.log('Response data structure:', Object.keys(response.data));
    
    // Check if we have immediate results
    if (response.data.artifacts && response.data.artifacts.length > 0) {
      console.log('\n✅ Image generated immediately!');
      const imageUrl = response.data.artifacts[0].uri;
      console.log('Generated image URL:', imageUrl);
    }
    // Otherwise check for a task ID and poll
    else if (response.data.id) {
      const taskId = response.data.id;
      console.log(`\n⏳ Task created with ID: ${taskId}`);
      console.log('Starting to poll for results...');
      
      // Poll for results
      let attempts = 0;
      const maxAttempts = 12; // Try for about 1 minute
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // Wait before polling
        const waitSeconds = 5;
        console.log(`\nWaiting ${waitSeconds} seconds before polling (attempt ${attempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        
        // Check task status
        console.log(`Checking status for task ${taskId}...`);
        const statusResponse = await axios.get(
          `${RUNWAY_API_URL}/${taskId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${RUNWAY_API_KEY}`
            }
          }
        );
        
        console.log('Status response status:', statusResponse.status);
        console.log('Task status:', statusResponse.data.status || 'unknown');
        
        // Check if the task is complete
        if (statusResponse.data.status === 'SUCCEEDED' || statusResponse.data.status === 'COMPLETED') {
          console.log('\n✅ Task completed successfully!');
          
          // Check for artifacts
          if (statusResponse.data.artifacts && statusResponse.data.artifacts.length > 0) {
            const imageUrl = statusResponse.data.artifacts[0].uri;
            console.log('Generated image URL:', imageUrl);
            break;
          }
          // Check other possible output formats
          else if (statusResponse.data.output) {
            console.log('Task output:', JSON.stringify(statusResponse.data.output, null, 2));
            break;
          }
          else {
            console.log('⚠️ Task completed but no image URL found in response');
            break;
          }
        }
        else if (statusResponse.data.status === 'FAILED') {
          console.error('\n❌ Task failed:', statusResponse.data.error || 'Unknown error');
          break;
        }
        
        console.log(`Task still in progress, status: ${statusResponse.data.status || 'unknown'}`);
      }
      
      if (attempts >= maxAttempts) {
        console.log('\n⚠️ Reached maximum polling attempts without completion');
      }
    }
    else {
      console.log('\n⚠️ No artifacts or task ID found in the response');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error testing Runway API:');
    if (error.response) {
      console.error('Status code:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('Error message:', error.message);
  }
}

testRunwayAPI();
