import { Router, Request, Response } from 'express';
import { BaseRouter } from './BaseRouter';
import { textToImageService } from '../services/textToImageService';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from '../utils/logger';

// Create a logger with the appropriate context
const logger = createLogger('TextToImageRouter');

import { AuthenticatedUser } from '../types/shared';

// Extend the Express Request type to include authenticated user properties
interface AuthenticatedRequest extends Request {
  userId?: string;
  clientId?: string;
  user?: AuthenticatedUser & {
    sessionId: string;
    [key: string]: any;
  };
}

// Set up multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'ref-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed') as any);
    }
  }
});

/**
 * Router for text-to-image generation endpoints
 */
export class TextToImageRouter extends BaseRouter {
  constructor() {
    super('/text-to-image', true);
  }

  protected initializeRoutes(): void {
    // Generate images from text prompt
    this.router.post('/generate', authenticateToken, upload.single('styleReference'), this.generateImages);
    
    // Check status of a job
    this.router.get('/status/:jobId', authenticateToken, this.checkStatus);
    
    // Get all jobs for a client
    this.router.get('/jobs', authenticateToken, this.getClientJobs);
    
    // Cancel a job
    this.router.post('/cancel/:jobId', authenticateToken, this.cancelJob);
  }

  /**
   * Generate images from text prompt
   */
  private generateImages = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { prompt, negativePrompt, width, height, numVariations, styleStrength, seed } = req.body;
    const clientId = req.clientId as string;
    const userId = req.userId as string;
    
    // Handle style reference file if uploaded
    let styleReference;
    if (req.file) {
      styleReference = `/uploads/${req.file.filename}`;
    }
    
    const result = await textToImageService.generateImages(clientId, userId, {
      prompt,
      negativePrompt,
      styleReference,
      width: parseInt(width) || undefined,
      height: parseInt(height) || undefined,
      numVariations: parseInt(numVariations) || undefined,
      styleStrength: parseFloat(styleStrength) || undefined,
      seed: parseInt(seed) || undefined,
    });
    
    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * Check status of a text-to-image job
   */
  private checkStatus = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;
    
    const result = await textToImageService.checkStatus(jobId);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * Get all jobs for a client
   */
  private getClientJobs = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const clientId = req.clientId as string;
    
    const jobs = await textToImageService.getClientJobs(clientId);
    
    res.status(200).json({
      success: true,
      data: jobs,
    });
  });

  /**
   * Cancel a text-to-image job
   */
  private cancelJob = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;
    const clientId = req.clientId as string;
    
    const success = await textToImageService.cancelJob(jobId);
    
    res.status(200).json({
      success,
      message: success ? 'Job cancelled successfully' : 'Failed to cancel job or job already completed',
    });
  });


}

// Create router instance
const textToImageRouter = new TextToImageRouter();

// Export configured router
export default textToImageRouter.router;
