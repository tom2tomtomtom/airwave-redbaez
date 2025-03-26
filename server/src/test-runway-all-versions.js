// Test Runway API with different version headers and payload formats
require('dotenv').config();
const axios = require('axios');

// Use the updated API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
console.log('Testing Runway API with comprehensive version testing...');
console.log(`API Key (first 8 chars): ${RUNWAY_API_KEY.substring(0, 8)}...`);

// Different API versions to try
const API_VERSIONS = [
  { header: 'X-Runway-Version', value: '2023-01-01' },
  { header: 'X-Runway-Version', value: '2023-11-27' },
  { header: 'X-Runway-Version', value: '2024-01-01' },
  { header: 'X-Runway-Version', value: '2024-03-01' },
  { header: 'X-Runway-API-Version', value: '2023-01-01' },
  { header: 'X-Runway-API-Version', value: '2023-11-27' },
  { header: 'X-Runway-API-Version', value: '2024-01-01' },
  { header: 'X-Runway-API-Version', value: '2024-03-01' },
  { header: 'X-API-Version', value: '2023-01-01' },
  { header: 'X-API-Version', value: '2023-11-27' },
  { header: 'X-API-Version', value: '2024-01-01' },
  { header: 'X-API-Version', value: '2024-03-01' },
  { header: 'Runway-Version', value: '2023-11-27' },
  { header: null, value: null } // No version header
];

// Different endpoints to try
const API_ENDPOINTS = [
  'https://api.runwayml.com/v1/generation',
  'https://api.runwayml.com/v1/inference',
  'https://api.runwayml.com/v1',
  'https://api.runwayml.com/v2/generation',
  'https://api.runwayml.com/generation'
];

// Different payload formats to try
const PAYLOAD_FORMATS = [
  // Format 1: Simple payload with aspect_ratio
  {
    name: 'Simple with aspect_ratio',
    payload: {
      prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
      negative_prompt: "blurry, distorted, pixelated, low quality",
      aspect_ratio: "16:9",
      num_samples: 1
    }
  },
  // Format 2: With model parameter
  {
    name: 'With model parameter',
    payload: {
      model: "gen3a_turbo",
      prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
      negative_prompt: "blurry, distorted, pixelated, low quality",
      aspect_ratio: "16:9",
      num_samples: 1
    }
  },
  // Format 3: Using older input structure
  {
    name: 'Older input structure',
    payload: {
      input: {
        prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
        negative_prompt: "blurry, distorted, pixelated, low quality"
      },
      aspect_ratio: "16:9",
      num_samples: 1
    }
  },
  // Format 4: With guidance_scale
  {
    name: 'With guidance_scale',
    payload: {
      prompt: "A beautiful mountain landscape with a lake reflecting the sunset",
      negative_prompt: "blurry, distorted, pixelated, low quality",
      aspect_ratio: "16:9",
      num_samples: 1,
      guidance_scale: 7
    }
  }
];

// Function to test a specific combination
async function testCombination(endpoint, versionHeader, payloadFormat) {
  // Create headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${RUNWAY_API_KEY}`
  };
  
  // Add version header if specified
  if (versionHeader.header) {
    headers[versionHeader.header] = versionHeader.value;
  }
  
  const testDescription = `Endpoint: ${endpoint}\nVersion: ${versionHeader.header ? `${versionHeader.header}: ${versionHeader.value}` : 'No version header'}\nPayload: ${payloadFormat.name}`;
  
  try {
    console.log(`\n----- TESTING -----\n${testDescription}`);
    
    const response = await axios.post(
      endpoint,
      payloadFormat.payload,
      { headers }
    );
    
    console.log('✅ SUCCESS! Response status:', response.status);
    if (response.data) {
      console.log('Response data keys:', Object.keys(response.data));
      
      // Check for artifacts or task ID
      if (response.data.artifacts && response.data.artifacts.length > 0) {
        console.log('Image URL:', response.data.artifacts[0].uri);
      }
      else if (response.data.id) {
        console.log('Task ID:', response.data.id);
      }
    }
    
    return {
      success: true,
      endpoint,
      versionHeader,
      payloadFormat,
      response: response.data
    };
  } catch (error) {
    console.log('❌ FAILED. Error:', error.response?.data?.error || error.message);
    return {
      success: false,
      endpoint,
      versionHeader,
      payloadFormat,
      error: error.response?.data?.error || error.message
    };
  }
}

async function main() {
  console.log('=================================================');
  console.log('COMPREHENSIVE RUNWAY API TESTING');
  console.log('=================================================');
  
  const successfulTests = [];
  
  // Test each combination of endpoint, version header, and payload format
  // We'll only try the first payload format with all endpoint/version combinations
  // to keep the number of tests manageable
  for (const endpoint of API_ENDPOINTS) {
    for (const versionHeader of API_VERSIONS) {
      const result = await testCombination(endpoint, versionHeader, PAYLOAD_FORMATS[0]);
      if (result.success) {
        successfulTests.push(result);
        
        // If we find a successful combination, try all payload formats with this combo
        if (successfulTests.length === 1) {
          console.log('\n🎉 Found working combination! Testing all payload formats with this...');
          
          for (let i = 1; i < PAYLOAD_FORMATS.length; i++) {
            const payloadResult = await testCombination(endpoint, versionHeader, PAYLOAD_FORMATS[i]);
            if (payloadResult.success) {
              successfulTests.push(payloadResult);
            }
          }
          
          // No need to test more combinations once we find one that works
          break;
        }
      }
    }
    
    // Exit early if we've found a successful combination
    if (successfulTests.length > 0) {
      break;
    }
  }
  
  // Display results summary
  console.log('\n=================================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('=================================================');
  
  if (successfulTests.length > 0) {
    console.log(`✅ Found ${successfulTests.length} successful combination(s)!`);
    
    successfulTests.forEach((test, index) => {
      console.log(`\nWorking Combination ${index + 1}:`);
      console.log(`Endpoint: ${test.endpoint}`);
      console.log(`Version Header: ${test.versionHeader.header ? `${test.versionHeader.header}: ${test.versionHeader.value}` : 'None'}`);
      console.log(`Payload Format: ${test.payloadFormat.name}`);
      console.log('Sample Payload:', JSON.stringify(test.payloadFormat.payload, null, 2));
    });
    
    // Show configuration for the RunwayService.ts file
    console.log('\n=================================================');
    console.log('RECOMMENDED CONFIGURATION FOR RunwayService.ts');
    console.log('=================================================');
    
    const bestTest = successfulTests[0];
    console.log(`const RUNWAY_API_URL = '${bestTest.endpoint}';`);
    
    if (bestTest.versionHeader.header) {
      console.log('\n// Add this to your headers in axios requests:');
      console.log(`headers['${bestTest.versionHeader.header}'] = '${bestTest.versionHeader.value}';`);
    }
    
    console.log('\n// Use this payload structure:');
    console.log(`const payload = ${JSON.stringify(bestTest.payloadFormat.payload, null, 2).replace(/"prompt": ".*?"/, '"prompt": options.prompt').replace(/"negative_prompt": ".*?"/, '"negative_prompt": options.negativePrompt || ""')};`);
  } else {
    console.log('❌ No successful combinations found.');
    console.log('\nPossible issues to check:');
    console.log('1. Verify API key validity in the Runway dashboard');
    console.log('2. Check your account subscription status');
    console.log('3. Check if there are IP restrictions on your account');
    console.log('4. Consider contacting Runway support for assistance');
  }
}

// Run the main function
main();
