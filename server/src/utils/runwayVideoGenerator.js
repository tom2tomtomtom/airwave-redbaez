/**
 * Runway Video Generator Utility
 * 
 * This utility directly uses the Runway SDK for image-to-video generation
 * without relying on the TypeScript service implementation.
 */
const RunwayML = require('@runwayml/sdk').default;
require('dotenv').config();

// API key from environment variables
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

/**
 * Generate a video from an image using Runway API
 * 
 * @param {Object} options - Video generation options
 * @param {string} options.imageUrl - URL to the source image
 * @param {string} options.prompt - Text prompt describing how to animate the image
 * @param {string} options.model - Model to use (default: 'gen3a_turbo')
 * @param {number} options.motionStrength - How much motion to apply (0.0 to 1.0)
 * @param {number} options.duration - Video duration in seconds
 * @returns {Promise<string>} - URL to the generated video
 */
async function generateVideoFromImage(options) {
  if (!options.imageUrl) {
    throw new Error('Image URL is required');
  }

  const {
    imageUrl,
    prompt = '',
    model = 'gen3a_turbo',
    motionStrength = 0.5,
    duration = 4
  } = options;
  
  console.log(`Generating video from image with model: ${model}`);
  console.log(`Prompt: "${prompt}"`);
  console.log(`Image: ${imageUrl}`);
  
  try {
    // Create SDK client
    const client = new RunwayML({
      apiKey: RUNWAY_API_KEY
    });
    
    // Create the image-to-video task
    const task = await client.imageToVideo.create({
      model: model,
      promptImage: imageUrl,
      promptText: prompt,
      motionStrength: motionStrength,
      duration: duration
    });
    
    console.log(`Task created with ID: ${task.id}`);
    
    // Poll for task completion
    let taskStatus;
    let isComplete = false;
    
    console.log('Waiting for generation to complete (this may take a minute)...');
    
    while (!isComplete) {
      // Wait 5 seconds between status checks
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check task status
      taskStatus = await client.tasks.retrieve(task.id);
      console.log(`Status: ${taskStatus.status}`);
      
      if (['SUCCEEDED', 'FAILED'].includes(taskStatus.status)) {
        isComplete = true;
      }
    }
    
    // Handle the completed task
    if (taskStatus.status === 'SUCCEEDED') {
      if (Array.isArray(taskStatus.output) && taskStatus.output.length > 0) {
        const videoUrl = taskStatus.output[0];
        console.log(`Video generation successful!`);
        return videoUrl;
      } else {
        throw new Error('No output URL found in the completed task');
      }
    } else {
      throw new Error(`Task failed: ${taskStatus.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('Video generation failed:', error.message);
    throw error;
  }
}

module.exports = {
  generateVideoFromImage
};
