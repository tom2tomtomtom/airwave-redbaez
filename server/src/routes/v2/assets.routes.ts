/**
 * V2 Asset Routes
 * 
 * Handles asset operations using slug-based endpoints
 * These endpoints are used by the debugging tools and must maintain compatibility
 */
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

import { BaseRouter } from '../BaseRouter';
import { ApiError } from '../../middleware/errorHandler';
import { validateRequest } from '../../middleware/validation';
import { assetService } from '../../services/assetService'; 
import { logger } from '../../utils/logger';
import { supabase } from '../../db/supabaseClient';

// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/temp');
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

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

/**
 * V2 asset validation schemas
 */
const assetValidation = {
  getAssetsBySlug: Joi.object({
    slug: Joi.string().required()
  })
};

/**
 * V2 Asset Router implementation
 */
export class V2AssetRouter extends BaseRouter {
  constructor() {
    super('/assets');
  }
  
  /**
   * Initialize all V2 asset routes
   */
  protected initializeRoutes(): void {
    // GET - Get assets by client slug
    this.router.get(
      '/by-client/:slug',
      validateRequest(assetValidation.getAssetsBySlug, 'params'),
      this.protectedRoute(this.getAssetsByClientSlug.bind(this))
    );
    
    // GET - Get known working client for debug purposes
    this.router.get(
      '/debug-client',
      this.asyncHandler(this.getDebugClient.bind(this))
    );
    
    // POST - Upload asset with client slug
    this.router.post(
      '/upload/by-client/:slug',
      upload.single('file'),
      this.protectedRoute(this.uploadAssetBySlug.bind(this))
    );
  }
  
  /**
   * Get assets by client slug
   * This is used by the debug tools and must remain compatible
   */
  private async getAssetsByClientSlug(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    
    // First, get the client ID from the slug
    logger.debug('Looking up client ID from slug', { slug });
    
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('slug', slug)
      .single();
    
    if (error || !client) {
      logger.error('Client not found for slug', { slug, error });
      throw new ApiError(404, 'Client not found');
    }
    
    const clientId = client.id;
    logger.debug('Found client ID for slug', { slug, clientId, clientName: client.name });
    
    // Now get the assets using the client ID
    const filters = {
      clientId,
      ...req.query
    };
    
    const result = await assetService.getAssets(filters);
    
    if (result.success && result.data) {
      res.success(result.data, 'Assets retrieved successfully');
    } else {
      throw new ApiError(500, result.message || 'Failed to retrieve assets');
    }
  }
  
  /**
   * Get debug client info - returns the known working client ID
   * This is specifically implemented to maintain compatibility with the debug tools
   */
  private async getDebugClient(req: Request, res: Response): Promise<void> {
    // This is the known working client ID mentioned in the system memory
    const knownWorkingClientId = 'fe418478-806e-411a-ad0b-1b9a537a8081';
    
    // Get the client details from Supabase
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name, slug')
      .eq('id', knownWorkingClientId)
      .single();
    
    if (error || !client) {
      logger.warn('Debug client not found, using fallback values', { clientId: knownWorkingClientId });
      // Return hardcoded values if the client is not found
      return res.success({
        id: knownWorkingClientId,
        name: 'Debug Client',
        slug: 'debug-client'
      }, 'Debug client info retrieved');
    }
    
    res.success(client, 'Debug client info retrieved');
  }
  
  /**
   * Upload asset by client slug
   */
  private async uploadAssetBySlug(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }
    
    const { slug } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ApiError(401, 'User ID is required');
    }
    
    // Get the client ID from the slug
    const { data: client, error } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (error || !client) {
      logger.error('Client not found for slug', { slug, error });
      throw new ApiError(404, 'Client not found');
    }
    
    const clientId = client.id;
    
    // Extract upload options from the request body
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
    
    logger.debug('Uploading asset by slug', { 
      slug,
      clientId,
      filename: req.file.originalname
    });
    
    const result = await assetService.uploadAsset(req.file, userId, options);
    
    if (result.success && result.data) {
      res.success(result.data, 'Asset uploaded successfully', 201);
    } else {
      throw new ApiError(500, result.message || 'Failed to upload asset');
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

// Export the router instance
export default new V2AssetRouter().getRouter();
