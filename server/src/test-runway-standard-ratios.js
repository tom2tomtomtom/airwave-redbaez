// Test script trying standard aspect ratios with Runway API
const axios = require('axios');
require('dotenv').config();

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';
const RUNWAY_API_VERSION = '2024-11-06';

async function testRunwayAPI() {
  console.log('Testing Runway API with standard aspect ratios...');
  console.log(`API Key (first 10 chars): ${RUNWAY_API_KEY.substring(0, 10)}...`);
  
  // Try different standard aspect ratio formats
  const standardRatios = [
    { ratio: "1:1", width: 1024, height: 1024 },
    { ratio: "3:2", width: 1024, height: 683 },
    { ratio: "16:9", width: 1024, height: 576 },
    { ratio: "4:3", width: 1024, height: 768 },
    { ratio: "square", width: 1024, height: 1024 },
    { ratio: "portrait", width: 768, height: 1024 },
    { ratio: "landscape", width: 1024, height: 768 }
  ];

  for (const ratioConfig of standardRatios) {
    try {
      console.log(`\n==== Testing with ${ratioConfig.ratio} ratio (${ratioConfig.width}x${ratioConfig.height}) ====`);
      
      // Try both ways to specify dimensions
      const payload = {
        promptText: "A cat in a tree",
        model: "gen3a_turbo"
      };
      
      // Add dimensions
      if (ratioConfig.ratio === "square" || ratioConfig.ratio === "portrait" || ratioConfig.ratio === "landscape") {
        payload.ratio = ratioConfig.ratio;
      } else {
        payload.width = ratioConfig.width;
        payload.height = ratioConfig.height;
      }
      
      console.log(`Payload: ${JSON.stringify(payload)}`);
      
      const response = await axios.post(
        `${RUNWAY_API_URL}/text_to_image`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${RUNWAY_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Runway-Version': RUNWAY_API_VERSION
          }
        }
      );
      
      console.log(`✅ Success with ${ratioConfig.ratio} ratio!`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      
      // If we have a task ID, poll for results
      if (response.data.id) {
        console.log(`\nTask started with ID: ${response.data.id}`);
        console.log(`Check status with:\ncurl -X GET ${RUNWAY_API_URL}/tasks/${response.data.id} \\
  -H "Authorization: Bearer API_KEY_HIDDEN" \\
  -H "X-Runway-Version: ${RUNWAY_API_VERSION}"`);
      }
      
      // Exit after first success
      return;
      
    } catch (error) {
      console.error(`❌ Failed with ${ratioConfig.ratio} ratio:`, 
        error.response?.data?.error || error.message);
    }
  }
}

testRunwayAPI();
