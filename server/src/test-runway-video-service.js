// Test script for the updated Runway video generation functionality
require('dotenv').config();
// Import with the correct path for the TypeScript services
const { runwayService } = require('../dist/services/runwayService');

// Test image URL (this should be a publicly accessible image)
const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=600';
const TEST_PROMPT = 'Colorful abstract flowing gradient with smooth motion';

async function testVideoGeneration() {
  console.log('Testing Runway video generation service...');
  
  try {
    // Check if the service is properly configured
    if (!runwayService.isConfigured()) {
      console.error('Runway service is not properly configured. Please check your API key.');
      return;
    }
    
    console.log('Starting video generation with the following parameters:');
    console.log(`Image URL: ${TEST_IMAGE_URL}`);
    console.log(`Prompt: ${TEST_PROMPT}`);
    
    // Generate a video from the test image
    const job = await runwayService.generateVideo({
      promptImage: TEST_IMAGE_URL,
      promptText: TEST_PROMPT,
      model: 'gen3a_turbo',
      motionStrength: 0.6,
      duration: 4
    });
    
    console.log(`Video generation job started with ID: ${job.id}`);
    console.log('Initial job status:', job.status);
    console.log('The video generation is processing asynchronously.');
    console.log('You can monitor the job status by calling runwayService.getJobStatus(job.id)');
    
    // Poll for job status every 5 seconds to demonstrate status updates
    let attempts = 0;
    const maxAttempts = 20; // 100 seconds max
    
    const pollInterval = setInterval(async () => {
      attempts++;
      const currentJob = runwayService.getJobStatus(job.id);
      
      console.log(`[Attempt ${attempts}/${maxAttempts}] Job status: ${currentJob.status}`);
      
      if (currentJob.status === 'succeeded') {
        console.log('Video generation succeeded!');
        console.log(`Video URL: ${currentJob.videoUrl}`);
        clearInterval(pollInterval);
      } else if (currentJob.status === 'failed') {
        console.error('Video generation failed:', currentJob.error);
        clearInterval(pollInterval);
      } else if (attempts >= maxAttempts) {
        console.log('Reached maximum polling attempts. The job may still be processing.');
        console.log('Check the status later with runwayService.getJobStatus("' + job.id + '")');
        clearInterval(pollInterval);
      }
    }, 5000);
    
  } catch (error) {
    console.error('Error in video generation test:', error.message);
  }
}

// Run the test
testVideoGeneration();
