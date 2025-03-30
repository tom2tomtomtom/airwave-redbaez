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
import { validateRequest, validationSchemas } from '../middleware/validation';
// Use the refactored asset service
import { assetService, AssetFilters, ServiceResult, Asset } from '../services/assetService.new';
import { logger } from '../utils/logger';
import { ApiError } from '@/utils/ApiError';
import { ErrorCode } from '@/types/errorTypes';

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
  private async getAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    const clientId = this.validateClientId(req);
    
    // Explicitly type filters from req.query, ensuring defaults
    const filters: AssetFilters = {
      clientId,
      limit: parseInt(req.query.limit as string || '50', 10),
      offset: parseInt(req.query.offset as string || '0', 10),
      sortBy: (req.query.sortBy as AssetFilters['sortBy']) || 'createdAt',
      sortDirection: (req.query.sortDirection as AssetFilters['sortDirection']) || 'desc',
    };

    // Apply other query params safely, converting types as needed
    for (const key in req.query) {
      if (Object.prototype.hasOwnProperty.call(req.query, key) && !(key in filters)) {
        // Avoid overwriting explicitly set properties like limit, offset, etc.
        (filters as any)[key] = req.query[key];
      }
    }

    // Ensure correct type for tags (handle string or array from query)
    if (req.query.tags && typeof req.query.tags === 'string') {
      filters.tags = req.query.tags.split(',').map(tag => tag.trim());
    } else if (req.query.tags && Array.isArray(req.query.tags)) {
      // If it's already an array (e.g., ?tags=a&tags=b), ensure elements are strings
      filters.tags = req.query.tags.map(tag => String(tag));
    } // If undefined or other type, filters.tags remains undefined

    // Convert string boolean to actual boolean for favouritesOnly *after* potential assignment from query
    if ('favouritesOnly' in filters && typeof filters.favouritesOnly === 'string') {
      filters.favouritesOnly = filters.favouritesOnly.toLowerCase() === 'true';
    } else if ('favouritesOnly' in filters && typeof filters.favouritesOnly !== 'boolean') {
      // Handle cases where it might be assigned a non-string/non-boolean value from query
      filters.favouritesOnly = Boolean(filters.favouritesOnly);
    }

    logger.debug('Getting assets with filters', { filters });
    try {
      const result = await assetService.getAssets(filters);
      
      // New service returns { assets, total }
      res.success({ assets: result.assets, total: result.total }, 'Assets retrieved successfully');
      // Error handling should rely on service throwing errors which are caught by global handler
    } catch (error) {
      next(error); // Pass any errors (including ApiErrors from service) to the handler
    }
  }
  
  /**
   * Get asset by ID
   */
  private async getAssetById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const clientId = this.validateClientId(req);
    const { id } = req.params;
    
    logger.debug('Getting asset by ID', { id, clientId });
    try {
      const result = await assetService.getAssetById(id, clientId);
      
      // New service returns { asset, success, message }
      if (result.success && result.asset) {
        res.success(result.asset, 'Asset retrieved successfully');
      } else {
        // If service indicates failure without throwing, create appropriate ApiError
        // Assuming service sets a message indicating not found
        if (result.message?.toLowerCase().includes('not found')) {
          next(new ApiError(
            ErrorCode.RESOURCE_NOT_FOUND, 
            result.message || `Asset with ID ${id} not found for client ${clientId}`,
            { assetId: id, clientId }
          ));
        } else {
          // Keep as Internal Error for generic retrieval failure
          next(new ApiError(
            ErrorCode.INTERNAL_ERROR, 
            result.message || 'Failed to retrieve asset.',
            { assetId: id, clientId } 
          ));
        }
      }
    } catch (error) {
      next(error); // Pass any errors (including ApiErrors from service) to the handler
    }
  }
  
  /**
   * Upload a new asset
   */
  private async uploadAsset(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      // Corrected: Use VALIDATION_FAILED
      throw new ApiError(ErrorCode.VALIDATION_FAILED, 'No file uploaded');
    }
    
    const clientId = this.validateClientId(req);
    const ownerId = req.auth?.userId;
    if (!ownerId) {
      logger.error('User ID not found on authenticated request during asset upload', { clientId });
      // Corrected: Use AUTHENTICATION_REQUIRED
      throw new ApiError(ErrorCode.AUTHENTICATION_REQUIRED, 'Authentication required for asset upload');
    }
    
    const { name, description, tags } = req.body;
    
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
      ownerId, // Add ownerId from authenticated user
      name: name || req.file.originalname,
      description: description || '',
      type: this.getAssetTypeFromMimetype(req.file.mimetype),
      tags: parsedTags
    };
    
    logger.debug('Uploading asset', { 
      filename: req.file.originalname, 
      mimetype: req.file.mimetype,
      options
    });
    
    const result = await assetService.uploadAsset(req.file, ownerId, options);
    
    if (result.success && result.data) {
      res.success(result.data, 'Asset uploaded successfully', 201);
    } else {
      // Corrected: Use OPERATION_FAILED for specific upload failure
      throw new ApiError(ErrorCode.OPERATION_FAILED, result.message || 'Failed to upload asset', { clientId });
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
      // Correct: Resource not found
      throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, 'Asset not found', { id, clientId });
    } else {
      // Corrected: Use OPERATION_FAILED for specific update failure
      throw new ApiError(ErrorCode.OPERATION_FAILED, result.message || 'Failed to update asset', { id, clientId });
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
      // Correct: Resource not found
      throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, 'Asset not found', { id, clientId });
    } else {
      // Corrected: Use OPERATION_FAILED for specific delete failure
      throw new ApiError(ErrorCode.OPERATION_FAILED, result.message || 'Failed to delete asset', { id, clientId });
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
      // Corrected: Use VALIDATION_FAILED
      throw new ApiError(ErrorCode.VALIDATION_FAILED, 'isFavourite parameter is required');
    }
    
    logger.debug('Toggling asset favourite status', { id, clientId, isFavourite });
    const result = await assetService.toggleFavourite(id, clientId, isFavourite);
    
    if (result.success && result.data) {
      res.success(result.data, `Asset ${isFavourite ? 'added to' : 'removed from'} favourites`);
    } else if (!result.success && result.message?.includes('not found')) {
      // Correct: Resource not found
      throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, 'Asset not found', { id, clientId });
    } else {
      // Corrected: Use OPERATION_FAILED for specific favourite toggle failure
      throw new ApiError(ErrorCode.OPERATION_FAILED, result.message || 'Failed to update favourite status', { id, clientId });
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
