// Test script for Runway API using latest parameters with aspect ratio format
require('dotenv').config();
const axios = require('axios');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.runwayml.com/v1/generation';

async function testRunwayAPI() {
  console.log('Testing Runway API with correct aspect ratio parameter...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  console.log(`Using API URL: ${RUNWAY_API_URL}`);
  
  // Helper function to create aspect ratio string from dimensions
  const calculateAspectRatioString = (width, height) => {
    // Function to calculate GCD
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    
    const divisor = gcd(width, height);
    const simplifiedWidth = width / divisor;
    const simplifiedHeight = height / divisor;
    
    // Common aspect ratios
    if (simplifiedWidth === simplifiedHeight) {
      return '1:1'; // Square
    } else if ((simplifiedWidth === 16 && simplifiedHeight === 9) || 
        (Math.abs(width / height - 16 / 9) < 0.01)) {
      return '16:9'; // Landscape
    } else if ((simplifiedWidth === 9 && simplifiedHeight === 16) || 
        (Math.abs(width / height - 9 / 16) < 0.01)) {
      return '9:16'; // Portrait/Story
    } else if ((simplifiedWidth === 4 && simplifiedHeight === 3) || 
        (Math.abs(width / height - 4 / 3) < 0.01)) {
      return '4:3'; // Classic
    }
    
    // Return simplified ratio
    return `${simplifiedWidth}:${simplifiedHeight}`;
  };
  
  try {
    // Test different aspect ratios
    const aspectRatios = [
      { width: 1024, height: 1024, description: 'Square (1:1)' },
      { width: 1920, height: 1080, description: 'Landscape (16:9)' },
      { width: 1080, height: 1920, description: 'Portrait (9:16)' },
      { width: 1200, height: 900, description: 'Classic (4:3)' }
    ];
    
    // Use landscape ratio for this test
    const selectedRatio = aspectRatios[1];
    const aspectRatio = calculateAspectRatioString(selectedRatio.width, selectedRatio.height);
    
    console.log(`\nTesting with ${selectedRatio.description}`);
    console.log(`Dimensions: ${selectedRatio.width}x${selectedRatio.height}`);
    console.log(`Calculated aspect ratio: ${aspectRatio}`);
    
    // Create payload using the latest API parameters
    const payload = {
      prompt: 'A beautiful mountain landscape with a lake reflecting the sunset',
      negative_prompt: 'blurry, distorted, pixelated, low quality',
      num_samples: 1,
      guidance_scale: 7,
      aspect_ratio: aspectRatio
    };
    
    console.log('\nRequest payload:', JSON.stringify(payload, null, 2));
    
    // Make API request
    console.log(`\nMaking request to ${RUNWAY_API_URL}...`);
    const response = await axios.post(
      RUNWAY_API_URL,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${RUNWAY_API_KEY}`
        }
      }
    );
    
    console.log('\n✅ API request successful!');
    console.log('Response status:', response.status);
    console.log('Response data structure:', Object.keys(response.data));
    
    // Check if we have immediate results
    if (response.data.artifacts && response.data.artifacts.length > 0) {
      console.log('\n✅ Image generated immediately!');
      const imageUrl = response.data.artifacts[0].uri;
      console.log('Generated image URL:', imageUrl);
    }
    // Otherwise check for a task ID and poll
    else if (response.data.id) {
      const taskId = response.data.id;
      console.log(`\n⏳ Task created with ID: ${taskId}`);
      console.log('Starting to poll for results...');
      
      // Poll for results
      let attempts = 0;
      const maxAttempts = 12; // Try for about 1 minute
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // Wait before polling
        const waitSeconds = 5;
        console.log(`\nWaiting ${waitSeconds} seconds before polling (attempt ${attempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        
        // Check task status
        console.log(`Checking status for task ${taskId}...`);
        const statusResponse = await axios.get(
          `${RUNWAY_API_URL}/${taskId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${RUNWAY_API_KEY}`
            }
          }
        );
        
        console.log('Status response status:', statusResponse.status);
        console.log('Task status:', statusResponse.data.status || 'unknown');
        
        // Check if the task is complete
        if (statusResponse.data.status === 'SUCCEEDED' || statusResponse.data.status === 'COMPLETED') {
          console.log('\n✅ Task completed successfully!');
          
          // Check for artifacts
          if (statusResponse.data.artifacts && statusResponse.data.artifacts.length > 0) {
            const imageUrl = statusResponse.data.artifacts[0].uri;
            console.log('Generated image URL:', imageUrl);
            break;
          }
          // Check other possible output formats
          else if (statusResponse.data.output) {
            console.log('Task output:', JSON.stringify(statusResponse.data.output, null, 2));
            break;
          }
          else {
            console.log('⚠️ Task completed but no image URL found in response');
            break;
          }
        }
        else if (statusResponse.data.status === 'FAILED') {
          console.error('\n❌ Task failed:', statusResponse.data.error || 'Unknown error');
          break;
        }
        
        console.log(`Task still in progress, status: ${statusResponse.data.status || 'unknown'}`);
      }
      
      if (attempts >= maxAttempts) {
        console.log('\n⚠️ Reached maximum polling attempts without completion');
      }
    }
    else {
      console.log('\n⚠️ No artifacts or task ID found in the response');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error testing Runway API:');
    if (error.response) {
      console.error('Status code:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('Error message:', error.message);
  }
}

testRunwayAPI();
