// Test using the official Runway SDK with the suggested structure
require('dotenv').config();
const { RunwayML } = require('@runwayml/sdk');

// Use the API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('Testing the official Runway SDK with suggested structure...');
console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);

// Initialize the SDK as suggested
const runway = new RunwayML({ apiKey: RUNWAY_API_KEY });

// Use an async function to generate an image
async function generateImage() {
  try {
    console.log('\nExploring available SDK methods:');
    console.log('Top-level API methods:', Object.keys(runway));
    
    if (runway.tasks) {
      console.log('Tasks API methods:', Object.getOwnPropertyNames(runway.tasks).filter(prop => 
        typeof runway.tasks[prop] === 'function'));
    }
    
    if (runway.textToImage) {
      console.log('TextToImage API methods:', Object.getOwnPropertyNames(runway.textToImage).filter(prop => 
        typeof runway.textToImage[prop] === 'function'));
    }
    
    if (runway.imageToVideo) {
      console.log('ImageToVideo API methods:', Object.getOwnPropertyNames(runway.imageToVideo).filter(prop => 
        typeof runway.imageToVideo[prop] === 'function'));
    }
    
    console.log('\nGenerating image using the SDK...');
    
    // Try to use the SDK to generate an image - first check which method to use
    let result;
    
    if (runway.generateImage && typeof runway.generateImage === 'function') {
      console.log('Using runway.generateImage()');
      result = await runway.generateImage({
        prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
        negativePrompt: "blurry, distorted, pixelated, low quality",
        aspectRatio: "16:9",
      });
    } 
    else if (runway.textToImage && typeof runway.textToImage.create === 'function') {
      console.log('Using runway.textToImage.create()');
      result = await runway.textToImage.create({
        prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
        negativePrompt: "blurry, distorted, pixelated, low quality",
        aspectRatio: "16:9",
      });
    }
    else if (runway.tasks && typeof runway.tasks.create === 'function') {
      console.log('Using runway.tasks.create()');
      result = await runway.tasks.create({
        type: 'text-to-image',
        input: {
          prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
          negative_prompt: "blurry, distorted, pixelated, low quality",
          aspect_ratio: "16:9",
        }
      });
    }
    else {
      console.log('❌ No suitable SDK method found for image generation');
      return;
    }
    
    console.log('\n✅ Image generation initiated successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // If a task was created, poll for the result
    if (result && result.id) {
      const taskId = result.id;
      console.log(`\nTask ID: ${taskId}`);
      console.log('Polling for results...');
      
      let pollAttempts = 0;
      const maxAttempts = 12; // Try for about 1 minute
      
      while (pollAttempts < maxAttempts) {
        pollAttempts++;
        
        // Wait before polling
        const waitSeconds = 5;
        console.log(`\nWaiting ${waitSeconds} seconds before polling (attempt ${pollAttempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        
        // Check task status using the appropriate SDK method
        let status;
        
        if (runway.tasks && typeof runway.tasks.get === 'function') {
          console.log(`Checking status with runway.tasks.get('${taskId}')`);
          status = await runway.tasks.get(taskId);
        } 
        else if (runway.textToImage && typeof runway.textToImage.retrieve === 'function') {
          console.log(`Checking status with runway.textToImage.retrieve('${taskId}')`);
          status = await runway.textToImage.retrieve(taskId);
        }
        else if (runway.getTaskStatus && typeof runway.getTaskStatus === 'function') {
          console.log(`Checking status with runway.getTaskStatus('${taskId}')`);
          status = await runway.getTaskStatus(taskId);
        }
        else {
          console.log('❌ No suitable SDK method found for checking task status');
          break;
        }
        
        console.log('Task status:', status.status || 'unknown');
        
        // Check if task is complete
        if (status.status === 'SUCCEEDED' || status.status === 'COMPLETED') {
          console.log('\n✅ Task completed successfully!');
          
          if (status.output) {
            console.log('Task output:', JSON.stringify(status.output, null, 2));
          }
          
          if (status.artifacts && status.artifacts.length > 0) {
            console.log('Image URL:', status.artifacts[0].uri);
          }
          
          break;
        }
        else if (status.status === 'FAILED') {
          console.error('\n❌ Task failed:', status.error || 'Unknown error');
          break;
        }
      }
      
      if (pollAttempts >= maxAttempts) {
        console.log('\n⚠️ Reached maximum polling attempts without completion');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error using Runway SDK:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('Full error:', error);
  }
}

// Run the function
generateImage();
