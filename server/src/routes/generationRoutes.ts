import express from 'express';
import textToImageRoutes from './textToImageRoutes';
import voiceoverRoutes from './voiceoverRoutes';
import musicGenerationRoutes from './musicGenerationRoutes';
import { authenticateToken as authMiddleware } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('GenerationRoutes');
const router = express.Router();

// Apply auth middleware to all generation routes
router.use(authMiddleware);

// Register all generation-related routes
router.use('/text-to-image', textToImageRoutes);
router.use('/voiceover', voiceoverRoutes);
router.use('/music', musicGenerationRoutes);

// Get generation service status
router.get('/status', (req, res) => {
  const status = {
    textToImage: process.env.STABILITY_API_KEY ? 'available' : 'unavailable',
    voiceover: process.env.ELEVENLABS_API_KEY ? 'available' : 'unavailable',
    music: process.env.MUBERT_API_KEY ? 'available' : 'unavailable',
    imageToVideo: true // Assuming this is already implemented
  };

  res.status(200).json({
    success: true,
    data: {
      status,
      message: 'Generation services status'
    }
  });
});

export default router;
