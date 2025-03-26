// Direct test script for Runway API with aspect ratio parameter
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';
const RUNWAY_API_VERSION = '2024-11-06';

async function testRunwayAPI() {
  console.log('Testing Runway API with aspect ratio parameter...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  console.log(`Using API Version: ${RUNWAY_API_VERSION}`);
  
  try {
    console.log('Generating an image with square aspect ratio...');
    
    const payload = {
      promptText: 'A cat sitting in a tree with sunlight filtering through the leaves',
      model: 'gen3a_turbo',
      aspectRatio: 'square'  // Using 'square' instead of width/height
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
    
    console.log('✅ Image generation task created successfully!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // If we have a task ID, start polling
    if (response.data.id) {
      const taskId = response.data.id;
      console.log(`Task started with ID: ${taskId}`);
      
      // Poll a few times to check progress
      for (let i = 0; i < 5; i++) {
        console.log(`\nPolling attempt ${i + 1}/5...`);
        
        // Wait before polling
        const waitSeconds = 5;
        console.log(`Waiting ${waitSeconds} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        
        // Check task status
        const statusResponse = await axios.get(
          `${RUNWAY_API_URL}/tasks/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${RUNWAY_API_KEY}`,
              'Accept': 'application/json',
              'X-Runway-Version': RUNWAY_API_VERSION
            }
          }
        );
        
        console.log('Task status:', statusResponse.data.status);
        
        if (statusResponse.data.status === 'SUCCEEDED') {
          console.log('✅ Task completed successfully!');
          if (statusResponse.data.output && statusResponse.data.output.images) {
            console.log('Generated images:');
            statusResponse.data.output.images.forEach((image, index) => {
              console.log(`Image ${index + 1}: ${image.url}`);
            });
          }
          break;
        } else if (statusResponse.data.status === 'FAILED') {
          console.error('❌ Task failed:', statusResponse.data.error || 'Unknown error');
          break;
        }
        
        // If this is the last polling attempt and task is still processing
        if (i === 4 && statusResponse.data.status !== 'SUCCEEDED' && statusResponse.data.status !== 'FAILED') {
          console.log('⏳ Task still processing after 5 polling attempts.');
          console.log('You can continue checking manually with:');
          console.log(`curl -X GET ${RUNWAY_API_URL}/tasks/${taskId} \\
  -H "Authorization: Bearer [YOUR_API_KEY]" \\
  -H "X-Runway-Version: ${RUNWAY_API_VERSION}"`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Runway API:');
    console.error('Status code:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Full error:', error.message);
  }
}

testRunwayAPI();
