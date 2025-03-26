// Test script that mimics the exact curl example from Runway docs
require('dotenv').config();
const { exec } = require('child_process');

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

console.log('Testing Runway API using curl command exactly as in docs...');
console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);

// Create curl command exactly as shown in the Runway documentation
const curlCommand = `curl -X POST https://api.dev.runwayml.com/v1/text_to_image \\
  -d '{
    "promptText": "A cat in a tree",
    "model": "gen3a_turbo"
  }' \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${RUNWAY_API_KEY}" \\
  -H "X-Runway-Version: 2024-11-06"`;

console.log('\nExecuting curl command:');
console.log(curlCommand.replace(RUNWAY_API_KEY, 'API_KEY_HIDDEN') + '\n');

// Execute the curl command
exec(curlCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('Error executing curl command:', error);
    return;
  }
  
  if (stderr) {
    console.error('Curl error:', stderr);
  }
  
  console.log('Response:');
  
  try {
    // Pretty print the JSON response
    const response = JSON.parse(stdout);
    console.log(JSON.stringify(response, null, 2));
    
    // If there's a task ID, recommend next steps
    if (response.id) {
      console.log(`\nTask ID: ${response.id}`);
      console.log('\nTo check task status, run:');
      console.log(`curl -X GET https://api.dev.runwayml.com/v1/tasks/${response.id} \\
  -H "Authorization: Bearer API_KEY_HIDDEN" \\
  -H "X-Runway-Version: 2024-11-06"`);
    }
  } catch (err) {
    // If it's not JSON, just print the raw output
    console.log(stdout);
  }
});
