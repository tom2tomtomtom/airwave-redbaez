/**
 * Asset Routes
 * 
 * Handles all asset-related API endpoints
 * Includes routes for asset CRUD operations, search, filtering, and uploads
 */
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

import { BaseRouter } from './BaseRouter';
import { ApiError } from '../middleware/errorHandler';
import { validateRequest, validationSchemas } from '../middleware/validation';
import { assetService, AssetFilters, ServiceResult, Asset } from '../services/assetService';
import { logger } from '../utils/logger';

// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Configure multer upload settings
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now - can be restricted if needed
    cb(null, true);
  }
});

/**
 * Asset route validation schemas
 */
const assetValidation = {
  getAssets: Joi.object({
    clientId: validationSchemas.clientId,
    type: Joi.string().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().optional(),
    sortDirection: Joi.string().valid('asc', 'desc').optional(),
    search: Joi.string().optional(),
    tags: Joi.alternatives().try(
      Joi.array().items(Joi.string()),
      Joi.string().custom((value, helpers) => {
        try {
          return JSON.parse(value);
        } catch (err) {
          return value.split(',');
        }
      })
    ).optional(),
    isFavourite: Joi.boolean().optional()
  }),
  
  getAssetById: Joi.object({
    id: validationSchemas.id
  }),
  
  updateAsset: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().allow('').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    metadata: Joi.object().optional(),
    isFavourite: Joi.boolean().optional()
  })
};

/**
 * Asset routes implementation
 */
export class AssetRouter extends BaseRouter {
  constructor() {
    super('/assets');
  }
  
  /**
   * Initialize all asset routes
   */
  protected initializeRoutes(): void {
    // GET - Get all assets with filtering
    this.router.get(
      '/',
      validateRequest(assetValidation.getAssets, 'query'),
      this.protectedRoute(this.getAssets.bind(this))
    );
    
    // GET - Get asset by ID
    this.router.get(
      '/:id',
      validateRequest(assetValidation.getAssetById, 'params'),
      this.protectedRoute(this.getAssetById.bind(this))
    );
    
    // POST - Upload a new asset
    this.router.post(
      '/upload',
      upload.single('file'),
      this.protectedRoute(this.uploadAsset.bind(this))
    );
    
    // PUT - Update an asset
    this.router.put(
      '/:id',
      validateRequest(assetValidation.updateAsset),
      this.protectedRoute(this.updateAsset.bind(this))
    );
    
    // DELETE - Delete an asset
    this.router.delete(
      '/:id',
      this.protectedRoute(this.deleteAsset.bind(this))
    );
    
    // POST - Toggle asset favourite status
    this.router.post(
      '/:id/favourite',
      this.protectedRoute(this.toggleFavourite.bind(this))
    );
  }
  
  /**
   * Get assets with filtering
   */
  private async getAssets(req: Request, res: Response): Promise<void> {
    const clientId = this.validateClientId(req);
    
    // Build filters from query parameters
    const filters: AssetFilters = {
      clientId,
      ...req.query
    };
    
    // Convert string tags to array if needed
    if (typeof filters.tags === 'string') {
      try {
        // Parse JSON string to array
        const parsed = JSON.parse(filters.tags as string);
        filters.tags = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // Handle comma-separated list
        filters.tags = (filters.tags as string).split(',').map(tag => tag.trim());
      }
    }
    
    // Convert string boolean to actual boolean
    if (filters.favourite !== undefined) {
      // Handle both string and array cases
      if (Array.isArray(filters.favourite)) {
        // If it's an array, use the first element
        filters.favourite = String(filters.favourite[0]) === 'true';
      } else {
        filters.favourite = String(filters.favourite) === 'true';
      }
    }
    
    logger.debug('Getting assets with filters', { filters });
    const result = await assetService.getAssets(filters);
    
    if (result.success && result.data) {
      res.success(result.data, 'Assets retrieved successfully');
    } else {
      throw ApiError.internal(result.message || 'Failed to retrieve assets', { clientId });
    }
  }
  
  /**
   * Get asset by ID
   */
  private async getAssetById(req: Request, res: Response): Promise<void> {
    const clientId = this.validateClientId(req);
    const { id } = req.params;
    
    logger.debug('Getting asset by ID', { id, clientId });
    const result = await assetService.getAssetById(id, clientId);
    
    if (result.success && result.data) {
      res.success(result.data, 'Asset retrieved successfully');
    } else if (!result.success && result.message?.includes('not found')) {
      throw ApiError.notFound('Asset not found', { id, clientId });
    } else {
      throw ApiError.internal(result.message || 'Failed to retrieve asset', { id, clientId });
    }
  }
  
  /**
   * Upload a new asset
   */
  private async uploadAsset(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw ApiError.validation('No file uploaded');
    }
    
    const clientId = this.validateClientId(req);
    const userId = req.user?.id;
    
    if (!userId) {
      throw ApiError.unauthorized('User ID is required');
    }
    
    const { name, description, type, tags } = req.body;
    
    // Process tags if provided
    let parsedTags: string[] | undefined;
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = typeof tags === 'string' ? tags.split(',') : undefined;
      }
    }
    
    // Upload options
    const options = {
      clientId,
      name: name || req.file.originalname,
      description: description || '',
      type: type || this.getAssetTypeFromMimetype(req.file.mimetype),
      tags: parsedTags
    };
    
    logger.debug('Uploading asset', { 
      filename: req.file.originalname, 
      mimetype: req.file.mimetype,
      options
    });
    
    const result = await assetService.uploadAsset(req.file, userId, options);
    
    if (result.success && result.data) {
      res.success(result.data, 'Asset uploaded successfully', 201);
    } else {
      throw ApiError.internal(result.message || 'Failed to upload asset', { clientId });
    }
  }
  
  /**
   * Update an asset
   */
  private async updateAsset(req: Request, res: Response): Promise<void> {
    const clientId = this.validateClientId(req);
    const { id } = req.params;
    
    logger.debug('Updating asset', { id, clientId, updates: req.body });
    const result = await assetService.updateAsset(id, clientId, req.body);
    
    if (result.success && result.data) {
      res.success(result.data, 'Asset updated successfully');
    } else if (!result.success && result.message?.includes('not found')) {
      throw ApiError.notFound('Asset not found', { id, clientId });
    } else {
      throw ApiError.internal(result.message || 'Failed to update asset', { id, clientId });
    }
  }
  
  /**
   * Delete an asset
   */
  private async deleteAsset(req: Request, res: Response): Promise<void> {
    const clientId = this.validateClientId(req);
    const { id } = req.params;
    
    logger.debug('Deleting asset', { id, clientId });
    const result = await assetService.deleteAsset(id, clientId);
    
    if (result.success) {
      res.success(null, 'Asset deleted successfully');
    } else if (!result.success && result.message?.includes('not found')) {
      throw ApiError.notFound('Asset not found', { id, clientId });
    } else {
      throw ApiError.internal(result.message || 'Failed to delete asset', { id, clientId });
    }
  }
  
  /**
   * Toggle asset favourite status
   */
  private async toggleFavourite(req: Request, res: Response): Promise<void> {
    const clientId = this.validateClientId(req);
    const { id } = req.params;
    const { isFavourite } = req.body;
    
    if (isFavourite === undefined) {
      throw ApiError.validation('isFavourite parameter is required');
    }
    
    logger.debug('Toggling asset favourite status', { id, clientId, isFavourite });
    const result = await assetService.toggleFavourite(id, clientId, isFavourite);
    
    if (result.success && result.data) {
      res.success(result.data, `Asset ${isFavourite ? 'added to' : 'removed from'} favourites`);
    } else if (!result.success && result.message?.includes('not found')) {
      throw ApiError.notFound('Asset not found', { id, clientId });
    } else {
      throw ApiError.internal(result.message || 'Failed to update favourite status', { id, clientId });
    }
  }
  
  /**
   * Helper to determine asset type from mimetype
   */
  private getAssetTypeFromMimetype(mimetype: string): string {
    if (mimetype.startsWith('image/')) {
      return 'image';
    } else if (mimetype.startsWith('video/')) {
      return 'video';
    } else if (mimetype.startsWith('audio/')) {
      return 'audio';
    } else {
      return 'document';
    }
  }
}

// Export an instance of the router
export default new AssetRouter().getRouter();
