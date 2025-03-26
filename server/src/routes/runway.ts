import express, { Request, Response } from 'express';
import { runwayService } from '../services/runwayService';

const router = express.Router();

/**
 * Generate a video from an image using Runway API
 * 
 * Required body parameters:
 * - imageUrl: URL to the source image
 * - prompt: Text prompt describing how to animate the image
 * 
 * Optional parameters:
 * - model: Model to use (default: 'gen3a_turbo')
 * - motionStrength: How much motion to apply (0.0 to 1.0)
 * - duration: Video duration in seconds
 */
router.post('/video/from-image', async (req: Request, res: Response) => {
    try {
      const { 
        imageUrl, 
        prompt, 
        model, 
        motionStrength, 
        duration 
      } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ 
          error: 'Missing required parameter: imageUrl' 
        });
      }

      console.log('Received request to generate video from image');
      console.log(`Image URL: ${imageUrl}`);
      console.log(`Prompt: ${prompt || 'None provided'}`);

      // Check if Runway service is properly configured
      if (!runwayService.isConfigured()) {
        return res.status(503).json({ 
          error: 'Runway service is not properly configured' 
        });
      }

      // Generate video from image
      const job = await runwayService.generateVideo({
        promptImage: imageUrl,
        promptText: prompt || '',
        model: model || 'gen3a_turbo',
        motionStrength: motionStrength || 0.5,
        duration: duration || 4
      });

      // Return the job details
      res.status(200).json({
        status: 'processing',
        jobId: job.id,
        message: 'Video generation started successfully'
      });
    } catch (error: any) {
      console.error('Error generating video:', error.message);
      res.status(500).json({
        error: 'Failed to generate video',
        details: error.message
      });
    }
  }
);

/**
 * Get the status of a video generation job
 */
router.get('/video/status/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({ 
          error: 'Missing required parameter: jobId' 
        });
      }

      // Get the job status
      const job = runwayService.getJobStatus(jobId);

      if (!job) {
        return res.status(404).json({
          error: 'Job not found'
        });
      }

      // Return the job details
      res.status(200).json({
        jobId: job.id,
        status: job.status,
        videoUrl: job.videoUrl,
        error: job.error
      });
    } catch (error: any) {
      console.error('Error getting video status:', error.message);
      res.status(500).json({
        error: 'Failed to get video status',
        details: error.message
      });
    }
  }
);

export default router;
