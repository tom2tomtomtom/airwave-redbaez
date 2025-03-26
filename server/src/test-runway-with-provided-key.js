const RunwayML = require('@runwayml/sdk').default;

// Configure the API key with the one you provided
const RUNWAY_API_KEY = 'key_92788b3aed93ea33b3539eea138c3113c5c0fc452f0d0322b28f4a50c21ee367020b249288a65dc46f304813000bac475bdf66fabd33ea91b8af072086bb467a';

// Create SDK client
const client = new RunwayML({
  apiKey: RUNWAY_API_KEY // You can also set process.env.RUNWAYML_API_SECRET instead
});

/**
 * Generate a video from an image using Runway's API
 * 
 * @param {string} imageUrl - URL to the image
 * @param {string} prompt - Text prompt describing how the image should be animated
 * @param {string} model - Model to use (default: 'gen3a_turbo')
 * @returns {Promise<string>} - URL to the generated video
 */
async function generateVideoFromImage(imageUrl, prompt, model = 'gen3a_turbo') {
  console.log(`Generating video from image with model: ${model}`);
  console.log(`Prompt: "${prompt}"`);
  console.log(`Image: ${imageUrl}`);
  
  try {
    // Create the image-to-video task
    const task = await client.imageToVideo.create({
      model: model,
      promptImage: imageUrl,
      promptText: prompt,
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

// Example usage
async function runExample() {
  try {
    // Generate a video from an image
    const videoUrl = await generateVideoFromImage(
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=600', // Sample abstract image
      'Colorful abstract flowing gradient with smooth motion', // Animation prompt
      'gen3a_turbo' // Model
    );
    
    console.log('\n=== GENERATION SUCCESSFUL ===');
    console.log('Generated video URL:');
    console.log(videoUrl);
    
  } catch (error) {
    console.error('\n=== GENERATION FAILED ===');
    console.error('Error:', error.message);
  }
}

// Run the example
runExample();
