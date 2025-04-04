import express from 'express';
import { musicGenerationService } from '../services/musicGenerationService';
import { authenticateToken as authMiddleware } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('MusicGenerationRoutes');
const router = express.Router();

/**
 * @route POST /api/music-generation/generate
 * @desc Generate music from a text prompt with genre and mood options
 * @access Private
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { prompt, genre, mood, tempo, duration, includeTracks } = req.body;
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

    const result = await musicGenerationService.generateMusic(clientId, userId, {
      prompt,
      genre,
      mood,
      tempo,
      duration,
      includeTracks
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch ($1: unknown) {
    logger.error(`Error in music generation: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during music generation'
    });
  }
});

/**
 * @route GET /api/music-generation/status/:jobId
 * @desc Check the status of a music generation job
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

    const result = await musicGenerationService.getJobStatus(jobId);
    
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
    logger.error(`Error checking music generation status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while checking job status'
    });
  }
});

/**
 * @route GET /api/music-generation/genres
 * @desc Get list of available music genres
 * @access Private
 */
router.get('/genres', authMiddleware, async (_req, res) => {
  try {
    const genres = musicGenerationService.getAvailableGenres();
    
    res.status(200).json({
      success: true,
      data: genres
    });
  } catch ($1: unknown) {
    logger.error(`Error retrieving available genres: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving genres'
    });
  }
});

/**
 * @route GET /api/music-generation/moods
 * @desc Get list of available music moods
 * @access Private
 */
router.get('/moods', authMiddleware, async (_req, res) => {
  try {
    const moods = musicGenerationService.getAvailableMoods();
    
    res.status(200).json({
      success: true,
      data: moods
    });
  } catch ($1: unknown) {
    logger.error(`Error retrieving available moods: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving moods'
    });
  }
});

/**
 * @route GET /api/music-generation/jobs
 * @desc Get a list of recent music generation jobs for a client
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

    // This method would need to be added to the musicGenerationService
    const jobs = []; // Replace with actual implementation

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch ($1: unknown) {
    logger.error(`Error retrieving music generation jobs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving jobs'
    });
  }
});

export default router;
