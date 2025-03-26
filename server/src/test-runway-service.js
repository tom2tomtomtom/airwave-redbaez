// Test script for the updated runwayService with correct aspect ratio
require('dotenv').config();
const { runwayService } = require('./services/runwayService');

async function main() {
  try {
    console.log('Testing the updated runwayService with aspect ratio...');
    
    // Test image generation with four different aspect ratios
    const aspectRatios = [
      { width: 1024, height: 1024, description: 'Square (1:1)' },
      { width: 1920, height: 1080, description: 'Landscape (16:9)' },
      { width: 1080, height: 1920, description: 'Portrait/Story (9:16)' },
      { width: 1200, height: 900, description: 'Classic (4:3)' }
    ];
    
    // Just test one aspect ratio for now - can test others if this works
    const testRatio = aspectRatios[1]; // Landscape 16:9
    
    console.log(`\nTesting with ${testRatio.description} aspect ratio (${testRatio.width}x${testRatio.height})...`);
    
    // Make the request with the image service
    const job = await runwayService.generateImage({
      prompt: 'A beautiful mountain landscape with a lake reflecting the sunset',
      negativePrompt: 'blurry, distorted, pixelated, low quality',
      width: testRatio.width,
      height: testRatio.height,
      numberOfImages: 1
    });
    
    console.log('Job created:', JSON.stringify(job, null, 2));
    
    // If the image was generated immediately, show the result
    if (job.status === 'succeeded' && job.imageUrl) {
      console.log('✅ Image was generated immediately!');
      console.log('Image URL:', job.imageUrl);
    } 
    // Otherwise, poll for the result if we have a job ID
    else if (job.id) {
      console.log('⏳ Job is pending, starting to poll for results...');
      let attempts = 0;
      const maxAttempts = 30;
      const pollInterval = 5000; // 5 seconds
      
      // Manual polling loop to check the job status
      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        console.log(`Checking job status (attempt ${attempts}/${maxAttempts})...`);
        
        // Get the current job status
        const updatedJob = runwayService.getJobStatus(job.id);
        
        if (updatedJob) {
          console.log('Job status:', updatedJob.status);
          
          if (updatedJob.status === 'succeeded' && updatedJob.imageUrl) {
            console.log('✅ Image generation complete!');
            console.log('Image URL:', updatedJob.imageUrl);
            break;
          } else if (updatedJob.status === 'failed') {
            console.log('❌ Image generation failed:', updatedJob.error || 'Unknown error');
            break;
          }
        } else {
          console.log('⚠️ Job not found in active jobs, it may have completed or failed');
          console.log('Will continue checking for a few more attempts in case it\'s a timing issue');
        }
        
        // If we've been polling for a while with no result, try logging in to the backend service logs
        if (attempts >= 10 && attempts % 5 === 0) {
          console.log('⚠️ Still waiting after several attempts. Check server logs for details.');
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log('❌ Timed out waiting for image generation');
      }
    } else {
      console.log('❌ No job ID was returned');
    }
    
  } catch (error) {
    console.error('❌ Error testing runway service:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    }
  }
}

main();
