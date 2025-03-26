/**
 * Test script for the Runway video generation endpoint
 */
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');

// Test image URL (publicly accessible image)
const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=600';
const TEST_PROMPT = 'Colorful abstract flowing gradient with smooth motion';

async function testVideoEndpoint() {
  console.log('Testing Runway video generation endpoint...');
  
  try {
    // Call the video generation endpoint
    const response = await axios.post('http://localhost:3001/api/runway/generate-video', {
      imageUrl: TEST_IMAGE_URL,
      prompt: TEST_PROMPT,
      model: 'gen3a_turbo',
      motionStrength: 0.6,
      duration: 4
    });
    
    console.log('Response:', response.data);
    
    if (response.data.success && response.data.jobId) {
      console.log('\nVideo generation job created successfully!');
      console.log('Job ID:', response.data.jobId);
      console.log('Status:', response.data.status);
      console.log('\nNow the system will automatically poll for the results in the background.');
      console.log('You can check the status later using:');
      console.log(`curl http://localhost:3001/api/runway/video-status/${response.data.jobId}`);
      
      return response.data.jobId;
    } else {
      console.log('Failed to create video generation job:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('Error testing video endpoint:', error.response?.data || error.message);
    return null;
  }
}

// Run the test
testVideoEndpoint();
