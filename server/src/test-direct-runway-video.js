/**
 * Test script for the Runway Video Generator utility
 */
require('dotenv').config();
const { generateVideoFromImage } = require('./utils/runwayVideoGenerator');

// Test image URL (publicly accessible image)
const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=600';
const TEST_PROMPT = 'Colorful abstract flowing gradient with smooth motion';

async function runTest() {
  console.log('Testing direct Runway video generation utility...');
  
  try {
    console.log('Starting video generation with the following parameters:');
    console.log(`Image URL: ${TEST_IMAGE_URL}`);
    console.log(`Prompt: ${TEST_PROMPT}`);
    
    // Generate a video from the test image
    const videoUrl = await generateVideoFromImage({
      imageUrl: TEST_IMAGE_URL,
      prompt: TEST_PROMPT,
      model: 'gen3a_turbo',
      motionStrength: 0.6,
      duration: 4
    });
    
    console.log('\n=== GENERATION SUCCESSFUL ===');
    console.log('Generated video URL:');
    console.log(videoUrl);
    
    // Provide instructions on how to use the utility in an application
    console.log('\n=== INTEGRATION INSTRUCTIONS ===');
    console.log('To integrate this functionality in your application:');
    console.log('1. Import the utility: const { generateVideoFromImage } = require(\'./utils/runwayVideoGenerator\');');
    console.log('2. Call the function with your parameters');
    console.log('3. Use the returned video URL for display or download');
    
  } catch (error) {
    console.error('\n=== GENERATION FAILED ===');
    console.error('Error:', error.message);
  }
}

// Run the test
runTest();
