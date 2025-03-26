// Test script using the official Runway SDK with correct methods
require('dotenv').config();
const { RunwayML } = require('@runwayml/sdk');

// Use the API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('Testing Runway API using the official SDK...');
console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);

// Initialize the SDK with our API key
const runway = new RunwayML({ apiKey: RUNWAY_API_KEY });

async function main() {
  try {
    console.log('Attempting to generate an image using the SDK...');
    
    // Log available methods on the SDK for debugging
    console.log('Available methods on RunwayML object:', Object.keys(runway));
    
    // Generate an image using the Runway SDK
    // Try to use the generation method that's likely to be available
    const generation = await runway.generate({
      prompt: 'A serene landscape with mountains and a lake at sunset',
      negative_prompt: 'blurry, distorted, oversaturated',
      aspect_ratio: '16:9',
      num_samples: 1
    });
    
    console.log('✅ Generation request successful!');
    console.log('Response:', JSON.stringify(generation, null, 2));
    
    // If we have an ID, poll for the results
    if (generation.id) {
      console.log(`\nGeneration ID: ${generation.id}`);
      console.log('Polling for completion...');
      
      // Poll for results every 5 seconds
      let attempts = 0;
      const maxAttempts = 12; // 1 minute max (12 * 5 seconds)
      
      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        console.log(`\nChecking status, attempt ${attempts}/${maxAttempts}...`);
        
        try {
          // Try different methods that might exist to get the status
          let status;
          
          if (typeof runway.getGeneration === 'function') {
            status = await runway.getGeneration(generation.id);
          } else if (typeof runway.getJob === 'function') {
            status = await runway.getJob(generation.id);
          } else if (typeof runway.checkStatus === 'function') {
            status = await runway.checkStatus(generation.id);
          } else {
            console.log('No known status checking method available');
            break;
          }
          
          console.log('Status response:', JSON.stringify(status, null, 2));
          
          // Check if the image is ready
          if (status.status === 'COMPLETED' || status.status === 'SUCCEEDED') {
            console.log('✅ Image generation complete!');
            
            // Display the image URL if available
            if (status.output && status.output.images) {
              console.log('Image URL:', status.output.images[0].url);
            } else if (status.artifacts && status.artifacts.length > 0) {
              console.log('Image URL:', status.artifacts[0].uri);
            } else {
              console.log('Image URL not found in response');
            }
            
            break;
          } else if (status.status === 'FAILED') {
            console.log('❌ Image generation failed:', status.error || 'Unknown error');
            break;
          }
          
          console.log(`Status: ${status.status}. Waiting for completion...`);
          
        } catch (pollError) {
          console.error('Error polling for status:', pollError.message);
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log('❌ Timed out waiting for image generation');
      }
    }
    
  } catch (error) {
    console.error('❌ Error using Runway SDK:', error.message);
    if (error.response && error.response.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Log the error stack for debugging
    console.error('Error stack:', error.stack);
  }
}

main();
