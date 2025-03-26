// Test script for the updated Runway service implementation
require('dotenv').config();
const { runwayService } = require('./services/runwayService');

async function testUpdatedRunwayService() {
  console.log('Testing the updated Runway service implementation...');
  
  try {
    // Test image generation with standard 16:9 aspect ratio
    console.log('Generating an image with 16:9 aspect ratio...');
    const job = await runwayService.generateImage({
      prompt: 'A serene landscape with mountains and a lake at sunset',
      negativePrompt: 'blurry, distorted, oversaturated',
      width: 1920,
      height: 1080, // 16:9 ratio
      numberOfImages: 1
    });
    
    console.log('✅ Image generation job created:');
    console.log('Job ID:', job.id);
    console.log('Status:', job.status);
    
    if (job.imageUrl) {
      console.log('Image URL:', job.imageUrl);
    } else {
      console.log('Image is still being generated, check status later.');
    }
    
  } catch (error) {
    console.error('❌ Error testing Runway service:', error.message);
  }
}

testUpdatedRunwayService();
