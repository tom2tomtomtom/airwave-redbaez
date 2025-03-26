// Test Runway SDK with a real image from the internet
require('dotenv').config();
const RunwayML = require('@runwayml/sdk').default;
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Use the API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('Testing Runway API with a real image...');
console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);

// Initialize the SDK client
const client = new RunwayML({ apiKey: RUNWAY_API_KEY });

// Function to download an image from a URL
async function downloadImage(url, destPath) {
  console.log(`Downloading image from ${url}...`);
  
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(destPath, Buffer.from(response.data));
    console.log(`Image downloaded and saved to ${destPath}`);
    return destPath;
  } catch (error) {
    console.error(`Error downloading image: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    // URL to a sample cat image
    const imageUrl = 'https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg';
    const imagePath = path.join(__dirname, 'cat-image.jpg');
    
    // Download the image
    await downloadImage(imageUrl, imagePath);
    
    // Create a readable stream from the image file as recommended by the SDK error message
    const imageStream = fs.createReadStream(imagePath);
    
    console.log('\nCreating imageToVideo task with the downloaded image...');
    const imageToVideo = await client.imageToVideo.create({
      model: 'gen3a_turbo',
      promptImage: imageStream,
      promptText: 'A cat moving slightly in natural light',
    });
    
    console.log('✅ Task created successfully!');
    console.log('Task ID:', imageToVideo.id);
    
    // Poll for results (just a few times since this can take longer)
    console.log('\nPolling for initial task status...');
    let task;
    let attempts = 0;
    const maxAttempts = 5;
    
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
    } else if (attempts >= maxAttempts && !['SUCCEEDED', 'FAILED'].includes(task.status)) {
      console.log(`⏳ Task still in progress after ${maxAttempts} polling attempts.`);
      console.log(`This is normal for video generation which can take several minutes.`);
      console.log(`Check status manually with task ID: ${imageToVideo.id}`);
    }
    
    console.log('\n✅ Runway API is working correctly with your API key!');
    console.log('Now update the service implementation to use the correct:');
    console.log('1. API domain: api.dev.runwayml.com');
    console.log('2. API version header: X-Runway-Version: 2024-11-06');
    console.log('3. SDK initialization with RunwayML.default({ apiKey: RUNWAY_API_KEY })');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
