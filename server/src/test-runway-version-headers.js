// Test Runway API with exhaustive version headers
require('dotenv').config();
const axios = require('axios');

// Use the updated API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
console.log('Testing Runway API with comprehensive version header testing...');
console.log(`API Key (first 8 chars): ${RUNWAY_API_KEY.substring(0, 8)}...`);

// Define all possible version headers and versions to try
const versionHeaders = [
  'X-Runway-Version',
  'X-Runway-API-Version',
  'X-API-Version',
  'Runway-Version',
  'API-Version',
  'Accept-Version'
];

// Define all possible versions to try
const versions = [
  '2023-07-01',
  '2023-09-01', 
  '2023-11-01',
  '2023-11-27',
  '2023-12-01',
  '2024-01-01',
  '2024-02-01', 
  '2024-03-01',
  'latest'
];

// Define endpoints to test
const endpoints = [
  'v1/image-to-video',
  'v1/text-to-video',
  'v1/generation',
  'v1/inference'
];

// Test a specific combination of version header, version, and endpoint
async function testCombination(versionHeader, version, endpoint) {
  const url = `https://api.runwayml.com/${endpoint}`;
  
  // Sample payload (will be different for different endpoints)
  const payload = endpoint.includes('image-to-video') 
    ? {
        prompt_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000',
        motion_strength: 0.5,
        duration: 4
      }
    : {
        prompt: 'A cinematic shot of a mountain landscape with clouds and a sunset',
        negative_prompt: 'blurry, low quality, distorted',
        num_frames: 24,
        fps: 6,
        guidance_scale: 7.5
      };
  
  // Create headers
  const headers = {
    'Authorization': `Bearer ${RUNWAY_API_KEY}`,
    'Content-Type': 'application/json',
    [versionHeader]: version
  };
  
  console.log(`\nTesting: ${url}`);
  console.log(`Header: ${versionHeader}: ${version}`);
  console.log(`Payload type: ${endpoint.includes('image-to-video') ? 'Image-to-Video' : 'Text-to-Video/Generation'}`);
  
  try {
    const response = await axios.post(url, payload, { headers });
    
    console.log(`✅ SUCCESS! Status: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    
    return {
      success: true,
      url,
      versionHeader,
      version,
      data: response.data
    };
  } catch (error) {
    console.log(`❌ FAILED. Status: ${error.response?.status || 'Unknown'}`);
    console.log(`Error: ${error.response?.data?.error || error.message}`);
    
    return {
      success: false,
      url,
      versionHeader,
      version,
      error: error.response?.data?.error || error.message
    };
  }
}

// Also try without any version header
async function testWithoutVersionHeader(endpoint) {
  const url = `https://api.runwayml.com/${endpoint}`;
  
  // Sample payload (will be different for different endpoints)
  const payload = endpoint.includes('image-to-video') 
    ? {
        prompt_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000',
        motion_strength: 0.5,
        duration: 4
      }
    : {
        prompt: 'A cinematic shot of a mountain landscape with clouds and a sunset',
        negative_prompt: 'blurry, low quality, distorted',
        num_frames: 24,
        fps: 6,
        guidance_scale: 7.5
      };
  
  // Create headers without version
  const headers = {
    'Authorization': `Bearer ${RUNWAY_API_KEY}`,
    'Content-Type': 'application/json'
  };
  
  console.log(`\nTesting without version header: ${url}`);
  console.log(`Payload type: ${endpoint.includes('image-to-video') ? 'Image-to-Video' : 'Text-to-Video/Generation'}`);
  
  try {
    const response = await axios.post(url, payload, { headers });
    
    console.log(`✅ SUCCESS! Status: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    
    return {
      success: true,
      url,
      data: response.data
    };
  } catch (error) {
    console.log(`❌ FAILED. Status: ${error.response?.status || 'Unknown'}`);
    console.log(`Error: ${error.response?.data?.error || error.message}`);
    
    return {
      success: false,
      url,
      error: error.response?.data?.error || error.message
    };
  }
}

// Try with just the default SDK initialization
async function testWithRunwaySDK() {
  try {
    console.log('\nTesting with official Runway SDK default initialization...');
    
    const { RunwayML } = require('@runwayml/sdk');
    const runway = new RunwayML({ apiKey: RUNWAY_API_KEY });
    
    console.log('SDK initialized with these methods:', Object.keys(runway));
    console.log('SDK initialized with these imageToVideo methods:', Object.keys(runway.imageToVideo));
    console.log('SDK initialized with these tasks methods:', Object.keys(runway.tasks));
    
    // Try getting user info
    if (runway.users && typeof runway.users.me === 'function') {
      console.log('\nAttempting to get user info...');
      const user = await runway.users.me();
      console.log('User info:', user);
    }
    
    // Try getting models
    if (runway.models && typeof runway.models.list === 'function') {
      console.log('\nAttempting to list available models...');
      const models = await runway.models.list();
      console.log('Models:', models);
    }
    
    return { success: true, message: 'SDK initialized successfully' };
  } catch (error) {
    console.log(`❌ SDK test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  console.log('=================================================');
  console.log('EXHAUSTIVE RUNWAY API VERSION TESTING');
  console.log('=================================================');
  
  // First test with the SDK default settings
  await testWithRunwaySDK();
  
  const successfulCombinations = [];
  
  // Test each endpoint with no version header first
  for (const endpoint of endpoints) {
    const result = await testWithoutVersionHeader(endpoint);
    if (result.success) {
      successfulCombinations.push(result);
    }
  }
  
  // If no success without headers, try all combinations
  if (successfulCombinations.length === 0) {
    // We'll limit testing to just a couple key endpoints to keep run time reasonable
    const priorityEndpoints = ['v1/text-to-video', 'v1/image-to-video'];
    
    for (const endpoint of priorityEndpoints) {
      for (const versionHeader of versionHeaders) {
        // Just try the most likely versions
        for (const version of ['2023-11-27', '2024-01-01', '2024-03-01', 'latest']) {
          const result = await testCombination(versionHeader, version, endpoint);
          if (result.success) {
            successfulCombinations.push(result);
            // Break out of inner loops once we have a successful combination
            break;
          }
        }
        
        // Break out of version header loop if we found a successful combination
        if (successfulCombinations.length > 0) {
          break;
        }
      }
      
      // Break out of endpoint loop if we found a successful combination
      if (successfulCombinations.length > 0) {
        break;
      }
    }
  }
  
  // Summary of results
  console.log('\n=================================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('=================================================');
  
  if (successfulCombinations.length > 0) {
    console.log(`✅ Found ${successfulCombinations.length} successful combinations!`);
    successfulCombinations.forEach((combo, index) => {
      console.log(`\nWorking Combination ${index + 1}:`);
      console.log(`URL: ${combo.url}`);
      if (combo.versionHeader) {
        console.log(`Version Header: ${combo.versionHeader}: ${combo.version}`);
      } else {
        console.log('No version header needed');
      }
      console.log(`Response data: ${JSON.stringify(combo.data, null, 2)}`);
    });
    
    // Recommendation for implementation
    const bestCombo = successfulCombinations[0];
    console.log('\n=================================================');
    console.log('RECOMMENDED CONFIGURATION');
    console.log('=================================================');
    console.log(`URL: ${bestCombo.url}`);
    if (bestCombo.versionHeader) {
      console.log(`Add this header: '${bestCombo.versionHeader}': '${bestCombo.version}'`);
    } else {
      console.log('No version header needed');
    }
  } else {
    console.log('❌ No successful combinations found.');
    console.log('\nRecommendations:');
    console.log('1. Verify this API key is intended for text-to-video or image-to-video capabilities');
    console.log('2. Check with Runway support about correct API version requirements');
    console.log('3. Consider that the key might be restricted to other API capabilities');
    console.log('4. Review Runway subscription plan to ensure it includes video generation capabilities');
  }
}

main();
