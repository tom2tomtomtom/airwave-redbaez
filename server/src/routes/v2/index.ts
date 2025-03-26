/**
 * V2 API Routes
 * 
 * Registry of all V2 API routes
 * Uses slug-based design for better URL structure
 */
import express from 'express';
import clientRoutes from './clients.routes';
import assetRoutes from './assets.routes';
import { logger } from '../../utils/logger';

const router = express.Router();

// Register v2 routes
router.use('/clients', clientRoutes);
router.use('/assets', assetRoutes);

logger.info('V2 API routes initialized');

export default router;
