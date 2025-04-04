import express from 'express';
import { subtitleService } from '../services/subtitleService';
import { authenticateToken as authMiddleware } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('SubtitleRoutes');
const router = express.Router();

/**
 * @route POST /api/subtitles/generate
 * @desc Generate subtitles for a video asset
 * @access Private
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { assetId, videoUrl, sourceLanguage, targetLanguages, styleOptions } = req.body;
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

    if (!assetId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Asset ID is required' 
      });
    }

    if (!videoUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Video URL is required' 
      });
    }

    const result = await subtitleService.generateSubtitles(clientId, userId, {
      assetId,
      videoUrl,
      sourceLanguage,
      targetLanguages,
      styleOptions
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch ($1: unknown) {
    logger.error(`Error in subtitle generation: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during subtitle generation'
    });
  }
});

/**
 * @route GET /api/subtitles/status/:jobId
 * @desc Check the status of a subtitle generation job
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

    const result = await subtitleService.getJobStatus(jobId);
    
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
  } catch ($1: unknown) {
    logger.error(`Error checking subtitle status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while checking job status'
    });
  }
});

/**
 * @route GET /api/subtitles/languages
 * @desc Get list of available languages for subtitle generation
 * @access Private
 */
router.get('/languages', authMiddleware, async (_req, res) => {
  try {
    const languages = subtitleService.getAvailableLanguages();
    
    res.status(200).json({
      success: true,
      data: languages
    });
  } catch ($1: unknown) {
    logger.error(`Error retrieving available languages: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving languages'
    });
  }
});

/**
 * @route GET /api/subtitles/jobs
 * @desc Get a list of recent subtitle generation jobs for a client
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

    const jobs = await subtitleService.getClientJobs(clientId);

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch ($1: unknown) {
    logger.error(`Error retrieving subtitle jobs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving jobs'
    });
  }
});

export default router;
