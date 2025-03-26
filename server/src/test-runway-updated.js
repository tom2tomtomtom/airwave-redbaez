// Test script for the updated Runway service implementation
require('dotenv').config();
const { runwayService } = require('./services/runwayService.ts');

async function testRunwayService() {
  console.log('Testing updated Runway service implementation...');
  
  try {
    // Test image generation with square aspect ratio
    console.log('Generating a square image (1:1)...');
    const job = await runwayService.generateImage({
      prompt: 'A cat sitting in a tree with sunlight filtering through the leaves',
      width: 1024,
      height: 1024, // 1:1 ratio
      numberOfImages: 1
    });
    
    console.log('✅ Image generation job created successfully!');
    console.log('Job ID:', job.id);
    console.log('Status:', job.status);
    
    if (job.imageUrl) {
      console.log('Image URL:', job.imageUrl);
    } else {
      console.log('Waiting for image to be generated...');
    }
    
  } catch (error) {
    console.error('❌ Error testing Runway service:', error.message);
  }
}

testRunwayService();
