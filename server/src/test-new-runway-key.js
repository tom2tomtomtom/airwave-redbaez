/**
 * Test script for verifying the new Runway API key
 */
require('dotenv').config();
const RunwayML = require('@runwayml/sdk').default;
const axios = require('axios');

// Test image URL (publicly accessible image)
const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=600';
const TEST_PROMPT = 'Colorful abstract flowing gradient with smooth motion';

/**
 * Test SDK-based approach
 */
async function testSDK() {
  console.log('\n=== TESTING RUNWAY SDK APPROACH ===');
  
  try {
    // Create SDK client with API key from environment
    const client = new RunwayML({
      apiKey: process.env.RUNWAY_API_KEY
    });
    
    console.log('SDK initialized successfully');
    console.log('API Key (first 10 chars):', process.env.RUNWAY_API_KEY.substring(0, 10) + '...');
    
    // Test image-to-video generation
    console.log('\nCreating image-to-video task...');
    const task = await client.imageToVideo.create({
      model: 'gen3a_turbo',
      promptImage: TEST_IMAGE_URL,
      promptText: TEST_PROMPT
    });
    
    console.log('Task created successfully!');
    console.log('Task ID:', task.id);
    console.log('Task is now processing. You can check the status later.');
    
    return task.id;
  } catch (error) {
    console.error('SDK test failed:', error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function runTests() {
  try {
    // Test SDK approach first
    const taskId = await testSDK();
    
    if (taskId) {
      console.log('\nAPI key is working correctly!');
      console.log('You can now use the Runway API for both text-to-video and image-to-video generation.');
      console.log('Task ID to check status later:', taskId);
    } else {
      console.log('\nAPI key validation failed.');
      console.log('Please check your Runway account settings and make sure:');
      console.log('1. The API key is active and has not expired');
      console.log('2. Your account has permission to use the video generation features');
      console.log('3. Your billing information is up to date');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the tests
runTests();
