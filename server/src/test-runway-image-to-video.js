// Test script for Runway SDK's imageToVideo method
require('dotenv').config();
const { RunwayML } = require('@runwayml/sdk');

// Use the API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('Testing Runway SDK imageToVideo method...');
console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);

// Initialize the SDK with our API key
const runway = new RunwayML({ apiKey: RUNWAY_API_KEY });

async function main() {
  try {
    console.log('Available methods on the imageToVideo object:');
    for (const key in runway.imageToVideo) {
      if (typeof runway.imageToVideo[key] === 'function') {
        console.log(`- ${key}()`);
      } else {
        console.log(`- ${key}`);
      }
    }
    
    // Let's attempt to create a task using a method that is likely to exist
    let createMethod = null;
    let possibleMethods = ['create', 'generateVideo', 'generate'];
    
    for (const method of possibleMethods) {
      if (typeof runway.imageToVideo[method] === 'function') {
        console.log(`Found method: imageToVideo.${method}`);
        createMethod = method;
        break;
      }
    }
    
    if (!createMethod) {
      console.log('No suitable creation method found');
      return;
    }
    
    // Now let's try to use the SDK to check available models or operations
    console.log('\nExploring SDK capabilities...');
    
    // This is a discovery approach - these attempts may not work
    try {
      if (typeof runway.listModels === 'function') {
        console.log('Listing available models...');
        const models = await runway.listModels();
        console.log('Available models:', models);
      }
    } catch (e) {
      console.log('listModels not available:', e.message);
    }
    
    // Let's try getting help info from the SDK
    try {
      if (typeof runway.help === 'function') {
        console.log('Getting SDK help...');
        const help = await runway.help();
        console.log('SDK help:', help);
      }
    } catch (e) {
      console.log('help method not available:', e.message);
    }
    
    console.log('\nFull SDK investigation complete. Here are some next steps:');
    console.log('1. Check the official Runway SDK documentation for the exact method signatures');
    console.log('2. Consider using direct HTTP requests instead of the SDK if the SDK methods are not working');
    console.log('3. Try using the SDK on the client side for direct integration');
    
  } catch (error) {
    console.error('❌ Error using Runway SDK:', error.message);
    console.error('Error stack:', error.stack);
  }
}

main();
