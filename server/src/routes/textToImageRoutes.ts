import express from 'express';
import { textToImageService } from '../services/textToImageService';
import { authMiddleware } from '../middleware/authMiddleware';
import { createLogger } from '../utils/logger';

const logger = createLogger('TextToImageRoutes');
const router = express.Router();

/**
 * @route POST /api/text-to-image/generate
 * @desc Generate images from a text prompt with optional styling
 * @access Private
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { prompt, negativePrompt, width, height, numVariations, styleStrength, seed } = req.body;
    const clientId = req.body.client_id || req.query.client_id;
    const userId = req.user?.id;

    if (!clientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client ID is required' 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User authentication failed' 
      });
    }

    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        message: 'Prompt is required' 
      });
    }

    // Handle file upload if there's a style reference image
    let styleReference = undefined;
    if (req.files && req.files.styleReference) {
      const file = req.files.styleReference;
      // In a real implementation, we would save the file and pass its path
      // For now, we'll assume the file is already handled elsewhere
      styleReference = 'path/to/uploaded/image.jpg';
    }

    const result = await textToImageService.generateImages(clientId, userId, {
      prompt,
      negativePrompt,
      styleReference,
      width,
      height,
      numVariations,
      styleStrength,
      seed
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error(`Error in text-to-image generation: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during image generation'
    });
  }
});

/**
 * @route GET /api/text-to-image/status/:jobId
 * @desc Check the status of an image generation job
 * @access Private
 */
router.get('/status/:jobId', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const clientId = req.query.client_id as string;
    
    if (!clientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client ID is required' 
      });
    }

    const result = await textToImageService.getJobStatus(jobId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error(`Error checking text-to-image status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while checking job status'
    });
  }
});

/**
 * @route GET /api/text-to-image/jobs
 * @desc Get a list of recent image generation jobs for a client
 * @access Private
 */
router.get('/jobs', authMiddleware, async (req, res) => {
  try {
    const clientId = req.query.client_id as string;
    
    if (!clientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client ID is required' 
      });
    }

    const jobs = await textToImageService.getClientJobs(clientId);

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error: any) {
    logger.error(`Error retrieving text-to-image jobs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving jobs'
    });
  }
});

export default router;
