import express from 'express';
import { voiceoverService } from '../services/voiceoverService';
import { authMiddleware } from '../middleware/authMiddleware';
import { createLogger } from '../utils/logger';

const logger = createLogger('VoiceoverRoutes');
const router = express.Router();

/**
 * @route POST /api/voiceover/generate
 * @desc Generate voiceover from text with various voice options
 * @access Private
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { text, voice, speed, pitch, enhanceAudio } = req.body;
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

    if (!text) {
      return res.status(400).json({ 
        success: false, 
        message: 'Text content is required' 
      });
    }

    if (!voice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Voice selection is required' 
      });
    }

    const result = await voiceoverService.generateVoiceover(clientId, userId, {
      text,
      voice,
      speed,
      pitch,
      enhanceAudio
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error(`Error in voiceover generation: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during voiceover generation'
    });
  }
});

/**
 * @route GET /api/voiceover/status/:jobId
 * @desc Check the status of a voiceover generation job
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

    const result = await voiceoverService.getJobStatus(jobId);
    
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
    logger.error(`Error checking voiceover status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while checking job status'
    });
  }
});

/**
 * @route GET /api/voiceover/voices
 * @desc Get list of available voices
 * @access Private
 */
router.get('/voices', authMiddleware, async (_req, res) => {
  try {
    const voices = voiceoverService.getAvailableVoices();
    
    res.status(200).json({
      success: true,
      data: voices
    });
  } catch (error: any) {
    logger.error(`Error retrieving available voices: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving voices'
    });
  }
});

/**
 * @route GET /api/voiceover/jobs
 * @desc Get a list of recent voiceover generation jobs for a client
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

    // This method would need to be added to the voiceoverService
    const jobs = []; // Replace with actual implementation

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error: any) {
    logger.error(`Error retrieving voiceover jobs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving jobs'
    });
  }
});

export default router;
