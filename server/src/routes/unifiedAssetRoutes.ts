import { Router, Request, Response, NextFunction } from 'express';
import { check, query } from 'express-validator';
import { unifiedAssetService } from '../services/unifiedAssetService';
import { checkAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest.middleware';
// Import correct types from assetTypes.ts
import { Asset, AssetFilters } from '../types/assetTypes';
import { logger } from '../utils/logger';

const router = Router();
// Using logger directly since child method might not be available
const routeLogger = logger;

/**
 * @route GET /api/v2/assets
 * @description Get assets with filtering, sorting and pagination
 * @access Private
 */
router.get(
  '/',
  [
    query('clientId').optional().isUUID().withMessage('Client ID must be a valid UUID'),
    query('type')
      .optional()
      .isIn(['all', 'image', 'video', 'audio', 'text'])
      .withMessage('Type must be one of: all, image, video, audio, text'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a positive integer'),
    query('sortBy').optional().isString().withMessage('Sort by must be a string'),
    query('sortDirection')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort direction must be either asc or desc'),
    query('search').optional().isString().withMessage('Search must be a string')
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: AssetFilters = {
        clientId: req.query.clientId as string,
        type: req.query.type as string | 'all',
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
        sortBy: req.query.sortBy as keyof Asset | undefined,
        sortDirection: req.query.sortDirection as 'asc' | 'desc',
        search: req.query.search as string
      };

      routeLogger.info('Getting assets with filters', { filters });
      const result = await unifiedAssetService.getAssets(filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v2/assets/:id
 * @description Get an asset by ID
 * @access Private
 */
router.get(
  '/:id',
  [
    check('id').isUUID().withMessage('Asset ID must be a valid UUID')
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assetId = req.params.id;
      const clientId = req.query.clientId as string;
      
      routeLogger.info('Getting asset by ID', { assetId, clientId });
      const asset = await unifiedAssetService.getAssetById(assetId, clientId);
      
      if (!asset) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Asset not found'
          }
        });
      }
      
      res.json({
        success: true,
        data: asset
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v2/assets/client/:slug
 * @description Get assets by client slug
 * @access Private
 */
router.get(
  '/client/:slug',
  [
    check('slug').isString().withMessage('Client slug must be a string')
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug;
      const options: AssetFilters = {
        type: req.query.type as string | 'all',
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
        sortBy: req.query.sortBy as keyof Asset | undefined,
        sortDirection: req.query.sortDirection as 'asc' | 'desc',
        search: req.query.search as string
      };
      
      routeLogger.info('Getting assets by client slug', { slug, options });
      const result = await unifiedAssetService.getAssetsByClientSlug(slug, options);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
