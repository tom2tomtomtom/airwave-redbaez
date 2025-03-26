// Test Runway API with the new API key
require('dotenv').config();
const axios = require('axios');
const { RunwayML } = require('@runwayml/sdk');

// Use the updated API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
console.log('Testing Runway API with new key...');
console.log(`API Key (first 8 chars): ${RUNWAY_API_KEY.substring(0, 8)}...`);

// Function to test using direct HTTP request
async function testWithDirectRequest() {
  console.log('\n==== Testing with direct API request ====');
  
  try {
    // Use the correct v1/generation endpoint
    const RUNWAY_API_URL = 'https://api.runwayml.com/v1/generation';
    console.log(`Using API URL: ${RUNWAY_API_URL}`);
    
    // Simplified payload structure based on latest docs
    const payload = {
      prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
      negative_prompt: "blurry, distorted, pixelated, low quality",
      aspect_ratio: "16:9",
      num_samples: 1
    };
    
    console.log('\nRequest payload:', JSON.stringify(payload, null, 2));
    
    // Make the API request without specific version headers
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
    
    console.log('\n✅ Direct API request successful!');
    console.log('Response status:', response.status);
    console.log('Response data structure:', Object.keys(response.data));
    
    // Process the response
    if (response.data.artifacts && response.data.artifacts.length > 0) {
      console.log('\n✅ Image generated immediately!');
      const imageUrl = response.data.artifacts[0].uri;
      console.log('Generated image URL:', imageUrl);
      return { success: true, method: 'direct', url: imageUrl };
    } 
    else if (response.data.id) {
      console.log(`\n⏳ Task created with ID: ${response.data.id}`);
      return { success: true, method: 'direct', taskId: response.data.id };
    }
    else {
      console.log('\n⚠️ Unexpected response format:', JSON.stringify(response.data, null, 2));
      return { success: false, method: 'direct', error: 'Unexpected response format' };
    }
  } catch (error) {
    console.error('\n❌ Direct API request failed:');
    if (error.response) {
      console.error('Status code:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('Error message:', error.message);
    return { success: false, method: 'direct', error: error.message };
  }
}

// Function to test using the official SDK
async function testWithSDK() {
  console.log('\n==== Testing with official Runway SDK ====');
  
  try {
    // Initialize the SDK with the new API key
    const runway = new RunwayML({ apiKey: RUNWAY_API_KEY });
    
    console.log('\nExploring available SDK methods:');
    console.log('Top-level API methods:', Object.keys(runway));
    
    // Try to generate an image using the SDK
    if (runway.tasks && typeof runway.tasks.create === 'function') {
      console.log('\nUsing runway.tasks.create() method...');
      const result = await runway.tasks.create({
        type: 'text-to-image',
        input: {
          prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
          negative_prompt: "blurry, distorted, pixelated, low quality",
          aspect_ratio: "16:9"
        }
      });
      
      console.log('\n✅ SDK request successful!');
      console.log('SDK response:', JSON.stringify(result, null, 2));
      return { success: true, method: 'sdk', result };
    } 
    else if (runway.textToImage && typeof runway.textToImage.create === 'function') {
      console.log('\nUsing runway.textToImage.create() method...');
      const result = await runway.textToImage.create({
        prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
        negativePrompt: "blurry, distorted, pixelated, low quality",
        aspectRatio: "16:9"
      });
      
      console.log('\n✅ SDK request successful!');
      console.log('SDK response:', JSON.stringify(result, null, 2));
      return { success: true, method: 'sdk', result };
    }
    else {
      console.log('\n⚠️ No suitable SDK method found for image generation');
      return { success: false, method: 'sdk', error: 'No suitable SDK method found' };
    }
  } catch (error) {
    console.error('\n❌ SDK request failed:');
    console.error('Error message:', error.message);
    return { success: false, method: 'sdk', error: error.message };
  }
}

// Main function to run both tests
async function main() {
  console.log('==================================================');
  console.log('TESTING RUNWAY API WITH NEW KEY');
  console.log('==================================================');
  
  // First try with direct HTTP request
  const directResult = await testWithDirectRequest();
  
  // Then try with the SDK
  const sdkResult = await testWithSDK();
  
  // Summary of results
  console.log('\n==================================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('==================================================');
  console.log(`Direct API Request: ${directResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`SDK Request: ${sdkResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (directResult.success) {
    if (directResult.url) {
      console.log(`\nGenerated image URL: ${directResult.url}`);
    } else if (directResult.taskId) {
      console.log(`\nCreated task with ID: ${directResult.taskId}`);
      console.log('You need to implement polling logic to get the final result');
    }
  }
  
  console.log('\nDone testing!');
}

// Run the main function
main();
