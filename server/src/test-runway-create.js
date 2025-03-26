// Test script using the confirmed imageToVideo.create method from the SDK
require('dotenv').config();
const { RunwayML } = require('@runwayml/sdk');

// Use the API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('Testing Runway SDK using imageToVideo.create method...');
console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);

// Initialize the SDK with our API key
const runway = new RunwayML({ apiKey: RUNWAY_API_KEY });

async function main() {
  try {
    console.log('Attempting to use the imageToVideo.create method...');
    
    // We'll use a placeholder URL for an image since we don't have a real one
    const placeholderImageUrl = 'https://example.com/placeholder.jpg';
    
    // Attempt to create an image-to-video task
    const task = await runway.imageToVideo.create({
      image: placeholderImageUrl,
      // These are guesses at the parameter names
      motion_strength: 'medium',
      duration: 4 // seconds
    });
    
    console.log('✅ Task created successfully!');
    console.log('Task response:', JSON.stringify(task, null, 2));
    
    // Based on the discovery, let's try to understand what methods are available
    console.log('\nLet\'s try to update our runwayService.ts implementation based on what we\'ve learned:');
    console.log('1. The SDK has an imageToVideo.create method but we haven\'t confirmed a textToImage method');
    console.log('2. Without complete SDK documentation, we should consider direct HTTP requests');
    console.log('3. The React component approach using direct fetch calls might be more reliable');
    
  } catch (error) {
    console.error('❌ Error using Runway SDK:', error.message);
    
    // Log more detailed error information if available
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('\nBased on our tests, we should:');
    console.log('1. Update our runwayService.ts to use direct HTTP requests with the exact format from the React component');
    console.log('2. Use the proper endpoint: https://api.runwayml.com/v1/generation');
    console.log('3. Use the parameters format: prompt, negative_prompt, num_samples, guidance_scale, aspect_ratio');
    console.log('4. Handle the response format checking for "artifacts" array');
  }
}

main();
