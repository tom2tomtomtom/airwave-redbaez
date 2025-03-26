// Test Runway SDK's imageToVideo functionality
require('dotenv').config();
const RunwayML = require('@runwayml/sdk').default;
const fs = require('fs');
const path = require('path');

// Use the API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('Testing Runway imageToVideo API using the SDK...');
console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);

// Initialize the SDK client
const client = new RunwayML({ apiKey: RUNWAY_API_KEY });

// Function to create a placeholder image if needed
function createPlaceholderImage() {
  const placeholderPath = path.join(__dirname, 'placeholder.jpg');
  
  // Check if the placeholder already exists
  if (!fs.existsSync(placeholderPath)) {
    console.log('Creating a placeholder image file...');
    // Create a very simple image file with some content
    const buffer = Buffer.alloc(1024);
    fs.writeFileSync(placeholderPath, buffer);
  }
  
  return placeholderPath;
}

async function main() {
  try {
    console.log('Testing SDK imageToVideo functionality...');
    
    // Create a placeholder image for testing
    const imagePath = createPlaceholderImage();
    console.log(`Using image at path: ${imagePath}`);
    
    // Create a file object from the image path
    const imageFile = RunwayML.fileFromPath(imagePath);
    
    // Try the imageToVideo endpoint as documented
    console.log('Creating imageToVideo task...');
    const imageToVideo = await client.imageToVideo.create({
      model: 'gen3a_turbo',
      promptImage: imageFile,
      promptText: 'A cat in a tree moving slightly',
    });
    
    console.log('✅ Task created successfully!');
    console.log('Task ID:', imageToVideo.id);
    
    // Poll for results
    console.log('Polling for task completion...');
    let task;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      // Wait between polls
      const waitSeconds = 5;
      console.log(`Waiting ${waitSeconds} seconds before next poll...`);
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      
      attempts++;
      console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
      
      task = await client.tasks.retrieve(imageToVideo.id);
      console.log('Current status:', task.status);
      
      if (task.status === 'FAILED') {
        console.error('❌ Task failed:', task.error || 'Unknown error');
        break;
      }
      
    } while (!['SUCCEEDED', 'FAILED'].includes(task.status) && attempts < maxAttempts);
    
    if (task.status === 'SUCCEEDED') {
      console.log('✅ Task completed successfully!');
      console.log('Output:', JSON.stringify(task.output, null, 2));
    } else if (attempts >= maxAttempts) {
      console.log(`⏳ Task still in progress after ${maxAttempts} polling attempts.`);
      console.log(`Check status manually with task ID: ${imageToVideo.id}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
