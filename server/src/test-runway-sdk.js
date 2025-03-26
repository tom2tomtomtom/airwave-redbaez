// Test script using the official Runway SDK
require('dotenv').config();
const RunwayML = require('@runwayml/sdk').default;

// Use the API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('Testing Runway API using the official SDK...');
console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);

// Initialize the SDK with our API key
const client = new RunwayML({ apiKey: RUNWAY_API_KEY });

async function main() {
  try {
    console.log('Attempting to generate an image using the SDK...');
    
    // Create a new image generation task using the SDK with latest parameters
    // Use parameters that match what we've seen in the React component
    const textToImage = await client.textToImage.create({
      // Try without specifying model to use default
      promptText: 'A serene landscape with mountains and a lake at sunset',
      negativePromptText: 'blurry, distorted, oversaturated',
      aspectRatio: '16:9', // Using aspectRatio parameter
      numOutputs: 1, // Number of images to generate
    });
    
    console.log('✅ Image generation task created successfully!');
    console.log('Task ID:', textToImage.id);
    
    // Poll the task until it's complete
    console.log('Polling for task completion...');
    let task;
    let attempts = 0;
    const maxAttempts = 30;
    
    do {
      // Wait for a few seconds before polling
      const waitSeconds = 5;
      console.log(`Waiting ${waitSeconds} seconds before polling...`);
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      
      attempts++;
      console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
      
      // Retrieve the task status
      task = await client.tasks.retrieve(textToImage.id);
      console.log('Current status:', task.status);
      
      // If the task has failed, log the error
      if (task.status === 'FAILED') {
        console.error('❌ Task failed:', task.error);
        break;
      }
      
    } while (!['SUCCEEDED', 'FAILED'].includes(task.status) && attempts < maxAttempts);
    
    // Check if we succeeded
    if (task.status === 'SUCCEEDED') {
      console.log('✅ Task complete with status:', task.status);
      console.log('Output:', JSON.stringify(task.output, null, 2));
      
      // Log the image URLs if available - handle different response formats
      if (task.output) {
        console.log('\nOutput structure:', JSON.stringify(task.output, null, 2));
        
        // Check for images in the standard SDK format
        if (task.output.images && task.output.images.length > 0) {
          console.log('\nGenerated Images:');
          task.output.images.forEach((image, index) => {
            console.log(`Image ${index + 1}: ${image.url}`);
          });
        }
        // Check for artifacts format as seen in the React component
        else if (task.output.artifacts && task.output.artifacts.length > 0) {
          console.log('\nGenerated Artifacts:');
          task.output.artifacts.forEach((artifact, index) => {
            console.log(`Artifact ${index + 1}: ${artifact.uri}`);
          });
        }
        // Check if output is directly an array of URLs
        else if (Array.isArray(task.output) && task.output.length > 0) {
          console.log('\nGenerated URLs:');
          task.output.forEach((url, index) => {
            console.log(`URL ${index + 1}: ${url}`);
          });
        }
        // If it's just a string
        else if (typeof task.output === 'string') {
          console.log(`\nGenerated URL: ${task.output}`);
        }
        // No recognized output format
        else {
          console.log('\nUnrecognized output format');
        }
      }
    } else if (attempts >= maxAttempts) {
      console.log(`❌ Timed out waiting for task completion after ${maxAttempts} attempts`);
    }
    
  } catch (error) {
    console.error('❌ Error using Runway SDK:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
  }
}

main();
