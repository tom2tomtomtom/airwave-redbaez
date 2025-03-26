// Test Runway API for video capabilities (text-to-video and image-to-video)
require('dotenv').config();
const { RunwayML } = require('@runwayml/sdk');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Use environment variables for API key
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
console.log('Testing Runway API for video generation...');
console.log(`API Key (first 8 chars): ${RUNWAY_API_KEY.substring(0, 8)}...`);

// Initialize the Runway SDK with the API key
const runway = new RunwayML({ apiKey: RUNWAY_API_KEY });

// Function to check status of task
async function pollTaskStatus(taskId, maxAttempts = 30, interval = 5000) {
  console.log(`Polling for task ${taskId}...`);
  
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      console.log(`\nAttempt ${attempts + 1}/${maxAttempts}`);
      const status = await runway.tasks.get(taskId);
      
      console.log(`Status: ${status.status}`);
      
      if (status.status === 'COMPLETED' || status.status === 'SUCCEEDED') {
        console.log('✅ Task completed successfully!');
        return status;
      } else if (status.status === 'FAILED') {
        console.error('❌ Task failed:', status.error || 'Unknown error');
        throw new Error(`Task failed: ${status.error || 'Unknown error'}`);
      }
      
      // Wait before next attempt
      console.log(`Waiting ${interval/1000} seconds before next poll...`);
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    } catch (error) {
      console.error('Error polling task status:', error.message);
      throw error;
    }
  }
  
  throw new Error(`Timed out after ${maxAttempts} attempts`);
}

// Function to test text-to-video generation
async function testTextToVideo() {
  console.log('\n==== TESTING TEXT TO VIDEO ====');
  
  try {
    // Check if the SDK has the right methods
    console.log('Checking available SDK methods:', Object.keys(runway));
    console.log('Checking tasks methods:', Object.keys(runway.tasks));
    
    // Directly use the SDK task methods
    console.log('Creating text-to-video task directly...');
    
    // Trying direct API call as the SDK methods may not match documentation
    const response = await axios.post(
      'https://api.runwayml.com/v1/text-to-video',
      {
        prompt: 'A cinematic shot of a mountain landscape with clouds and a sunset',
        negative_prompt: 'blurry, low quality, distorted',
        num_frames: 24,
        fps: 6,
        guidance_scale: 7.5
      },
      {
        headers: {
          'Authorization': `Bearer ${RUNWAY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    const task = response.data;
    
    console.log('Task created:', task);
    console.log('Task ID:', task.id);
    
    // Poll for task completion
    const result = await pollTaskStatus(task.id);
    
    // Check for video URL in the response
    if (result.artifacts && result.artifacts.length > 0) {
      const videoUrl = result.artifacts[0].uri;
      console.log('🎬 Video URL:', videoUrl);
      return { success: true, videoUrl };
    } else {
      console.log('⚠️ No video URL found in the response');
      return { success: false, error: 'No video URL in response' };
    }
    
  } catch (error) {
    console.error('❌ Error in text-to-video test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

// Function to test image-to-video generation
async function testImageToVideo() {
  console.log('\n==== TESTING IMAGE TO VIDEO ====');
  
  try {
    // SDK exploration
    console.log('ImageToVideo methods:', Object.keys(runway.imageToVideo));
    
    // Sample image URL (this should be replaced with a valid image URL)
    // Use an image URL that's known to work well with Runway
    const sampleImageUrl = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000';
    
    console.log('Starting image-to-video task using direct API call...');
    console.log('Using sample image:', sampleImageUrl);
    
    // Try direct API call with different parameter format
    const response = await axios.post(
      'https://api.runwayml.com/v1/image-to-video',
      {
        prompt_image: sampleImageUrl, // Changed from 'image' to 'prompt_image' based on error
        motion_strength: 0.5,
        duration: 4
      },
      {
        headers: {
          'Authorization': `Bearer ${RUNWAY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    const task = response.data;
    
    console.log('Task created:', task);
    console.log('Task ID:', task.id);
    
    // Poll for task completion
    const result = await pollTaskStatus(task.id);
    
    // Check for video URL in the response
    if (result.artifacts && result.artifacts.length > 0) {
      const videoUrl = result.artifacts[0].uri;
      console.log('🎬 Video URL:', videoUrl);
      return { success: true, videoUrl };
    } else {
      console.log('⚠️ No video URL found in the response');
      return { success: false, error: 'No video URL in response' };
    }
    
  } catch (error) {
    console.error('❌ Error in image-to-video test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

// Main function to run the tests
async function main() {
  console.log('=================================================');
  console.log('TESTING RUNWAY VIDEO CAPABILITIES');
  console.log('=================================================');
  
  try {
    // First try text-to-video
    const textToVideoResult = await testTextToVideo();
    
    // Then try image-to-video
    const imageToVideoResult = await testImageToVideo();
    
    // Summary of results
    console.log('\n=================================================');
    console.log('TEST RESULTS SUMMARY');
    console.log('=================================================');
    console.log(`Text-to-Video: ${textToVideoResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (textToVideoResult.videoUrl) {
      console.log(`- Video URL: ${textToVideoResult.videoUrl}`);
    } else if (textToVideoResult.error) {
      console.log(`- Error: ${textToVideoResult.error}`);
    }
    
    console.log(`\nImage-to-Video: ${imageToVideoResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (imageToVideoResult.videoUrl) {
      console.log(`- Video URL: ${imageToVideoResult.videoUrl}`);
    } else if (imageToVideoResult.error) {
      console.log(`- Error: ${imageToVideoResult.error}`);
    }
    
  } catch (error) {
    console.error('\n❌ Unexpected error during testing:', error.message);
  }
}

// Run the main function
main();
