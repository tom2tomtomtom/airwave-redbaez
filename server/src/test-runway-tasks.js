// Test script using the official Runway SDK with the available methods
require('dotenv').config();
const { RunwayML } = require('@runwayml/sdk');

// Use the API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('Testing Runway API using the official SDK tasks...');
console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);

// Initialize the SDK with our API key
const runway = new RunwayML({ apiKey: RUNWAY_API_KEY });

async function main() {
  try {
    console.log('Available methods on RunwayML object:', Object.keys(runway));
    console.log('Available methods on runway.tasks:', Object.keys(runway.tasks));
    
    // Attempt to create an image generation task
    console.log('\nAttempting to generate an image using tasks API...');
    
    // Create a task for text-to-image generation
    const task = await runway.tasks.create({
      model: 'text-to-image',  // or any supported model name
      input: {
        prompt: 'A serene landscape with mountains and a lake at sunset',
        negative_prompt: 'blurry, distorted, oversaturated',
        aspect_ratio: '16:9',
        num_samples: 1
      }
    });
    
    console.log('✅ Task created successfully!');
    console.log('Task details:', JSON.stringify(task, null, 2));
    
    // Poll for the results
    const taskId = task.id;
    console.log(`\nTask ID: ${taskId}`);
    console.log('Polling for completion...');
    
    // Poll for results every 5 seconds
    let attempts = 0;
    const maxAttempts = 12; // 1 minute max (12 * 5 seconds)
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      console.log(`\nChecking status, attempt ${attempts}/${maxAttempts}...`);
      
      try {
        // Get the task status
        const status = await runway.tasks.get(taskId);
        console.log('Status:', status.status);
        
        // Check if the task is complete
        if (status.status === 'COMPLETED' || status.status === 'SUCCEEDED') {
          console.log('✅ Task complete!');
          console.log('Full response:', JSON.stringify(status, null, 2));
          
          // Display the output if available
          if (status.output) {
            console.log('\nOutput:', JSON.stringify(status.output, null, 2));
          }
          
          break;
        } else if (status.status === 'FAILED') {
          console.log('❌ Task failed:', status.error || 'Unknown error');
          break;
        }
      } catch (pollError) {
        console.error('Error polling for status:', pollError.message);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('❌ Timed out waiting for task completion');
    }
    
  } catch (error) {
    console.error('❌ Error using Runway SDK:', error.message);
    if (error.response && error.response.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Log more details for debugging
    console.error('Error:', error);
  }
}

main();
