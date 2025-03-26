import express from 'express';
import clientRoutes from './clientRoutes';
import assetRoutes from './assetRoutes';

const router = express.Router();

// Register v2 routes
router.use('/clients', clientRoutes);
router.use('/assets', assetRoutes);

export default router;
