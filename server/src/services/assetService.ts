/**
 * Comprehensive Asset Service Implementation
 * Provides robust asset management functionality with consistent error handling,
 * metadata extraction, and proper abstraction layers
 */
import { supabase } from '../db/supabaseClient';
import { 
  Asset, DbAsset, AssetFilters, ServiceResult, AssetUploadOptions,
  AssetProcessor, AssetRepository, AssetCache, IAssetService
} from '../types/assetTypes';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
// Using a simple in-memory cache implementation instead of NodeCache
class SimpleCache {
  private data: Map<string, { value: any, expiry: number | null }> = new Map();

  set(key: string, value: any, ttlSeconds?: number): void {
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
    this.data.set(key, { value, expiry });
  }

  get<T>(key: string): T | undefined {
    const item = this.data.get(key);
    if (!item) return undefined;
    
    if (item.expiry && item.expiry < Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    
    return item.value as T;
  }

  del(key: string): void {
    this.data.delete(key);
  }

  keys(): string[] {
    return Array.from(this.data.keys());
  }
}

// Import logger or create a simple logger if it doesn't exist
let logger: { debug: Function; info: Function; warn: Function; error: Function; };

try {
  const loggerModule = require('../utils/logger');
  logger = loggerModule.createLogger('assetService');
} catch (error) {
  // Fallback logger if the module doesn't exist
  logger = {
    debug: (message: string, meta?: any) => console.debug(`[assetService] ${message}`, meta),
    info: (message: string, meta?: any) => console.info(`[assetService] ${message}`, meta),
    warn: (message: string, meta?: any) => console.warn(`[assetService] ${message}`, meta),
    error: (message: string, meta?: any) => console.error(`[assetService] ${message}`, meta)
  };
}

/**
 * Memory-based cache implementation
 */
class MemoryAssetCache implements AssetCache {
  private cache: SimpleCache;
  
  constructor(ttlSeconds = 300) { // Default TTL: 5 minutes
    this.cache = new SimpleCache();
  }
  
  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }
  
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value, ttlSeconds);
  }
  
  async invalidate(key: string): Promise<void> {
    this.cache.del(key);
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = this.cache.keys();
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.del(key);
      }
    }
  }
}

/**
 * File system asset processor implementation
 * Handles file processing, thumbnail generation, and metadata extraction
 */
/**
 * Supabase Asset Repository implementation
 * Handles CRUD operations for assets in Supabase
 */
class SupabaseAssetRepository implements AssetRepository {
  private tableName = 'assets';
  
  constructor() {
    this.ensureSupabaseConfigured();
  }
  
  private ensureSupabaseConfigured(): void {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }
  }
  
  /**
   * Helper method to map database asset to application asset
   */
  private mapDbAssetToAsset(dbAsset: DbAsset): Asset {
    return {
      id: dbAsset.id,
      name: dbAsset.name,
      description: dbAsset.description,
      url: dbAsset.file_path,
      thumbnailUrl: dbAsset.thumbnail_path,
      type: dbAsset.type,
      mimeType: dbAsset.mime_type,
      size: dbAsset.size,
      width: dbAsset.width,
      height: dbAsset.height,
      duration: dbAsset.duration,
      clientId: dbAsset.client_id,
      clientSlug: '', // This will be populated by the service
      ownerId: dbAsset.owner_id,
      tags: dbAsset.tags || [],
      categories: dbAsset.categories || [],
      isFavourite: dbAsset.is_favourite,
      status: dbAsset.status,
      alternativeText: dbAsset.alternative_text,
      metadata: dbAsset.metadata || {},
      createdAt: dbAsset.created_at.toISOString(),
      updatedAt: dbAsset.updated_at.toISOString(),
      ...(dbAsset.expires_at && { expiresAt: dbAsset.expires_at.toISOString() })
    };
  }
  
  /**
   * Find all assets matching the provided filters
   */
  async findAll(filters: AssetFilters): Promise<ServiceResult<Asset[]>> {
    try {
      this.ensureSupabaseConfigured();
      logger.info('Finding assets with filters', { filters });
      
      // Make sure we have a clientId for filtering
      const clientId = filters.clientId || filters.client_id;
      if (!clientId) {
        return {
          success: false,
          message: 'Client ID is required for filtering assets',
          error: 'MISSING_CLIENT_ID'
        };
      }
      
      // Start building query
      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('client_id', clientId);
      
      // Apply additional filters
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters.tags && filters.tags.length > 0) {
        // Supabase's array contains operator
        query = query.contains('tags', filters.tags);
      }
      
      if (filters.categories && filters.categories.length > 0) {
        query = query.contains('categories', filters.categories);
      }
      
      if (filters.favourite !== undefined) {
        query = query.eq('is_favourite', filters.favourite);
      }
      
      if (filters.ownerId) {
        query = query.eq('owner_id', filters.ownerId);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      } else {
        // Default to active assets only
        query = query.eq('status', 'active');
      }
      
      if (filters.search) {
        // Full text search on name and description
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      // Date range filtering
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      // Handle expired assets
      if (!filters.includeExpired) {
        query = query.or('expires_at.is.null,expires_at.gt.now()');
      }
      
      // Sorting
      if (filters.sortBy) {
        const direction = filters.sortDirection || 'desc';
        query = query.order(filters.sortBy, { ascending: direction === 'asc' });
      } else {
        // Default sort by created_at desc
        query = query.order('created_at', { ascending: false });
      }
      
      // Pagination
      if (filters.limit !== undefined) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }
      
      // Execute query
      const { data: dbAssets, error } = await query;
      
      if (error) {
        logger.error('Error fetching assets', { error });
        return {
          success: false,
          message: 'Failed to fetch assets',
          error
        };
      }
      
      // Map DB assets to application assets
      const assets = dbAssets.map(dbAsset => this.mapDbAssetToAsset(dbAsset as DbAsset));
      
      return {
        success: true,
        message: 'Assets fetched successfully',
        data: assets
      };
      
    } catch (error) {
      logger.error('Error in findAll', { error });
      return {
        success: false,
        message: 'An error occurred while fetching assets',
        error
      };
    }
  }
  
  /**
   * Find asset by ID and client ID
   */
  async findById(id: string, clientId: string): Promise<ServiceResult<Asset>> {
    try {
      this.ensureSupabaseConfigured();
      logger.info('Finding asset by ID', { id, clientId });
      
      const { data: dbAsset, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .eq('client_id', clientId)
        .single();
      
      if (error) {
        logger.error('Error fetching asset', { error, id, clientId });
        return {
          success: false,
          message: 'Failed to fetch asset',
          error
        };
      }
      
      if (!dbAsset) {
        return {
          success: false,
          message: 'Asset not found',
          error: 'NOT_FOUND'
        };
      }
      
      return {
        success: true,
        message: 'Asset fetched successfully',
        data: this.mapDbAssetToAsset(dbAsset as DbAsset)
      };
      
    } catch (error) {
      logger.error('Error in findById', { error, id, clientId });
      return {
        success: false,
        message: 'An error occurred while fetching the asset',
        error
      };
    }
  }
  
  /**
   * Create a new asset
   */
  async create(asset: Partial<Asset>): Promise<ServiceResult<Asset>> {
    try {
      this.ensureSupabaseConfigured();
      logger.info('Creating new asset', { asset });
      
      // Ensure required fields are present
      if (!asset.name || !asset.url || !asset.type || !asset.clientId) {
        return {
          success: false,
          message: 'Missing required fields for asset creation',
          error: 'MISSING_REQUIRED_FIELDS'
        };
      }
      
      // Map application asset to DB asset
      const dbAsset: Partial<DbAsset> = {
        id: asset.id || uuidv4(),
        name: asset.name,
        description: asset.description,
        file_path: asset.url,
        thumbnail_path: asset.thumbnailUrl,
        type: asset.type,
        mime_type: asset.mimeType,
        size: asset.size || 0,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        client_id: asset.clientId,
        owner_id: asset.ownerId,
        tags: asset.tags,
        categories: asset.categories,
        is_favourite: asset.isFavourite || false,
        status: asset.status || 'active',
        alternative_text: asset.alternativeText,
        metadata: asset.metadata,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Add asset to database
      const { data: createdDbAsset, error } = await supabase
        .from(this.tableName)
        .insert([dbAsset])
        .select()
        .single();
      
      if (error) {
        logger.error('Error creating asset', { error, asset });
        return {
          success: false,
          message: 'Failed to create asset',
          error
        };
      }
      
      return {
        success: true,
        message: 'Asset created successfully',
        data: this.mapDbAssetToAsset(createdDbAsset as DbAsset)
      };
      
    } catch (error) {
      logger.error('Error in create', { error, asset });
      return {
        success: false,
        message: 'An error occurred while creating the asset',
        error
      };
    }
  }
  
  /**
   * Update an existing asset
   */
  async update(id: string, clientId: string, updates: Partial<Asset>): Promise<ServiceResult<Asset>> {
    try {
      this.ensureSupabaseConfigured();
      logger.info('Updating asset', { id, clientId, updates });
      
      // Check if the asset exists first
      const assetResult = await this.findById(id, clientId);
      if (!assetResult.success || !assetResult.data) {
        return assetResult;
      }
      
      // Map application asset updates to DB asset updates
      const dbAssetUpdates: Partial<DbAsset> = {};
      
      if (updates.name !== undefined) dbAssetUpdates.name = updates.name;
      if (updates.description !== undefined) dbAssetUpdates.description = updates.description;
      if (updates.url !== undefined) dbAssetUpdates.file_path = updates.url;
      if (updates.thumbnailUrl !== undefined) dbAssetUpdates.thumbnail_path = updates.thumbnailUrl;
      if (updates.type !== undefined) dbAssetUpdates.type = updates.type;
      if (updates.mimeType !== undefined) dbAssetUpdates.mime_type = updates.mimeType;
      if (updates.size !== undefined) dbAssetUpdates.size = updates.size;
      if (updates.width !== undefined) dbAssetUpdates.width = updates.width;
      if (updates.height !== undefined) dbAssetUpdates.height = updates.height;
      if (updates.duration !== undefined) dbAssetUpdates.duration = updates.duration;
      if (updates.tags !== undefined) dbAssetUpdates.tags = updates.tags;
      if (updates.categories !== undefined) dbAssetUpdates.categories = updates.categories;
      if (updates.isFavourite !== undefined) dbAssetUpdates.is_favourite = updates.isFavourite;
      if (updates.status !== undefined) dbAssetUpdates.status = updates.status;
      if (updates.alternativeText !== undefined) dbAssetUpdates.alternative_text = updates.alternativeText;
      if (updates.metadata !== undefined) dbAssetUpdates.metadata = updates.metadata;
      
      // Always update the updated_at timestamp
      dbAssetUpdates.updated_at = new Date();
      
      // Update the asset in the database
      const { data: updatedDbAsset, error } = await supabase
        .from(this.tableName)
        .update(dbAssetUpdates)
        .eq('id', id)
        .eq('client_id', clientId)
        .select()
        .single();
      
      if (error) {
        logger.error('Error updating asset', { error, id, clientId, updates });
        return {
          success: false,
          message: 'Failed to update asset',
          error
        };
      }
      
      return {
        success: true,
        message: 'Asset updated successfully',
        data: this.mapDbAssetToAsset(updatedDbAsset as DbAsset)
      };
      
    } catch (error) {
      logger.error('Error in update', { error, id, clientId, updates });
      return {
        success: false,
        message: 'An error occurred while updating the asset',
        error
      };
    }
  }
  
  /**
   * Delete an asset
   */
  async delete(id: string, clientId: string): Promise<ServiceResult<boolean>> {
    try {
      this.ensureSupabaseConfigured();
      logger.info('Deleting asset', { id, clientId });
      
      // Check if the asset exists first
      const assetResult = await this.findById(id, clientId);
      if (!assetResult.success || !assetResult.data) {
        return {
          success: false,
          message: 'Asset not found',
          error: 'NOT_FOUND'
        };
      }
      
      // Delete the asset from the database
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .eq('client_id', clientId);
      
      if (error) {
        logger.error('Error deleting asset', { error, id, clientId });
        return {
          success: false,
          message: 'Failed to delete asset',
          error
        };
      }
      
      return {
        success: true,
        message: 'Asset deleted successfully',
        data: true
      };
      
    } catch (error) {
      logger.error('Error in delete', { error, id, clientId });
      return {
        success: false,
        message: 'An error occurred while deleting the asset',
        error
      };
    }
  }
  
  /**
   * Toggle an asset's favourite status
   */
  async toggleFavourite(id: string, clientId: string, isFavourite: boolean): Promise<ServiceResult<Asset>> {
    try {
      this.ensureSupabaseConfigured();
      logger.info('Toggling asset favourite status', { id, clientId, isFavourite });
      
      // Check if the asset exists first
      const assetResult = await this.findById(id, clientId);
      if (!assetResult.success || !assetResult.data) {
        return assetResult;
      }
      
      // Update the asset's favourite status
      const { data: updatedDbAsset, error } = await supabase
        .from(this.tableName)
        .update({ is_favourite: isFavourite, updated_at: new Date() })
        .eq('id', id)
        .eq('client_id', clientId)
        .select()
        .single();
      
      if (error) {
        logger.error('Error toggling asset favourite status', { error, id, clientId, isFavourite });
        return {
          success: false,
          message: 'Failed to update asset favourite status',
          error
        };
      }
      
      return {
        success: true,
        message: 'Asset favourite status updated successfully',
        data: this.mapDbAssetToAsset(updatedDbAsset as DbAsset)
      };
      
    } catch (error) {
      logger.error('Error in toggleFavourite', { error, id, clientId, isFavourite });
      return {
        success: false,
        message: 'An error occurred while updating the asset favourite status',
        error
      };
    }
  }
  
  /**
   * Batch update multiple assets
   */
  async batchUpdate(ids: string[], clientId: string, updates: Partial<Asset>): Promise<ServiceResult<number>> {
    try {
      this.ensureSupabaseConfigured();
      logger.info('Batch updating assets', { ids, clientId, updates });
      
      if (ids.length === 0) {
        return {
          success: false,
          message: 'No asset IDs provided',
          error: 'MISSING_IDS'
        };
      }
      
      // Map application asset updates to DB asset updates
      const dbAssetUpdates: Partial<DbAsset> = {};
      
      if (updates.tags !== undefined) dbAssetUpdates.tags = updates.tags;
      if (updates.categories !== undefined) dbAssetUpdates.categories = updates.categories;
      if (updates.status !== undefined) dbAssetUpdates.status = updates.status;
      if (updates.alternativeText !== undefined) dbAssetUpdates.alternative_text = updates.alternativeText;
      
      // Always update the updated_at timestamp
      dbAssetUpdates.updated_at = new Date();
      
      // Update the assets in the database
      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbAssetUpdates)
        .in('id', ids)
        .eq('client_id', clientId);
      
      if (error) {
        logger.error('Error batch updating assets', { error, ids, clientId, updates });
        return {
          success: false,
          message: 'Failed to batch update assets',
          error
        };
      }
      
      return {
        success: true,
        message: 'Assets updated successfully',
        data: Array.isArray(data) ? data.length : ids.length // Return the number of updated assets
      };
      
    } catch (error) {
      logger.error('Error in batchUpdate', { error, ids, clientId, updates });
      return {
        success: false,
        message: 'An error occurred while batch updating assets',
        error
      };
    }
  }
}

/**
 * File system asset processor implementation
 * Handles file processing, thumbnail generation, and metadata extraction
 */
class FileSystemAssetProcessor implements AssetProcessor {
  private uploadDir: string;
  private allowedTypes: {
    image: string[];
    video: string[];
    audio: string[];
    document: string[];
  };
  
  constructor(uploadDir = path.join(process.cwd(), 'uploads')) {
    this.uploadDir = uploadDir;
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    
    // Define allowed file types by extension
    this.allowedTypes = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'tiff'],
      video: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv'],
      audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'],
      document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'json']
    };
  }
  
  async processAsset(file: Express.Multer.File, options: AssetUploadOptions): Promise<ServiceResult<Asset>> {
    try {
      logger.info('Processing asset', { filename: file.originalname });
      
      // Determine asset type
      const assetType = this.getAssetType(file.mimetype, path.extname(file.originalname).slice(1));
      
      if (!assetType || assetType === 'unknown') {
        return {
          success: false,
          message: 'Unsupported file type',
          error: 'UNSUPPORTED_FILE_TYPE'
        };
      }
      
      // Generate thumbnail
      const thumbnailPath = await this.generateThumbnail(file, assetType);
      
      // Extract metadata
      const metadata = await this.extractMetadata(file, assetType);
      
      // Create asset object
      const asset: Asset = {
        id: uuidv4(),
        name: options.name || file.originalname,
        description: options.description || '',
        // Using the correct property name according to Asset interface
        url: file.path, 
        thumbnailPath: thumbnailPath,
        type: assetType,
        mimeType: file.mimetype,
        size: file.size,
        clientId: options.clientId,
        tags: options.tags || [],
        categories: options.categories || [],
        isFavourite: false,
        status: 'active',
        alternativeText: options.alternativeText,
        metadata: {
          ...metadata,
          originalFilename: file.originalname,
          ...options.metadata
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(options.expiresAt && { expiresAt: options.expiresAt.toISOString() })
      };
      
      // Add dimensions if available in metadata
      if (metadata.width) asset.width = metadata.width;
      if (metadata.height) asset.height = metadata.height;
      if (metadata.duration) asset.duration = metadata.duration;
      
      return {
        success: true,
        message: 'Asset processed successfully',
        data: asset
      };
      
    } catch (error) {
      logger.error('Error processing asset', { error, filename: file.originalname });
      return {
        success: false,
        message: 'Failed to process asset',
        error
      };
    }
  }
  
  /**
   * Determine asset type based on mime type and extension
   */
  private getAssetType(mimeType: string, extension: string): string {
    const type = mimeType.split('/')[0];
    extension = extension.toLowerCase();
    
    if (type === 'image' || this.allowedTypes.image.includes(extension)) {
      return 'image';
    } else if (type === 'video' || this.allowedTypes.video.includes(extension)) {
      return 'video';
    } else if (type === 'audio' || this.allowedTypes.audio.includes(extension)) {
      return 'audio';
    } else if (this.allowedTypes.document.includes(extension)) {
      return 'document';
    }
    
    return 'unknown';
  }
  
  /**
   * Generate thumbnail for asset
   */
  async generateThumbnail(file: Express.Multer.File, assetType: string): Promise<string | undefined> {
    try {
      const thumbDir = path.join(this.uploadDir, 'thumbnails');
      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
      }
      
      const thumbnailPath = path.join(thumbDir, `${path.parse(file.originalname).name}_thumb.jpg`);
      
      switch (assetType) {
        case 'image':
          await sharp(file.path)
            .resize(200, 200, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
          return thumbnailPath;
          
        case 'video':
          return new Promise((resolve, reject) => {
            ffmpeg(file.path)
              .screenshots({
                count: 1,
                folder: thumbDir,
                filename: `${path.parse(file.originalname).name}_thumb.jpg`,
                size: '200x?'
              })
              .on('end', () => resolve(thumbnailPath))
              .on('error', reject);
          });
          
        default:
          return undefined;
      }
    } catch (error) {
      logger.error('Error generating thumbnail', { error, filename: file.originalname });
      return undefined;
    }
  }
  
  /**
   * Extract metadata from asset
   */
  async extractMetadata(file: Express.Multer.File, assetType: string): Promise<Record<string, any>> {
    try {
      switch (assetType) {
        case 'image':
          const metadata = await sharp(file.path).metadata();
          return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            space: metadata.space,
            hasAlpha: metadata.hasAlpha,
            orientation: metadata.orientation
          };
          
        case 'video':
          return new Promise<Record<string, any>>((resolve, reject) => {
            ffmpeg.ffprobe(file.path, (err: Error, metadata: any) => {
              if (err) return reject(err);
              
              const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
              if (!videoStream) return resolve({});
              
              resolve({
                width: videoStream.width,
                height: videoStream.height,
                duration: metadata.format.duration,
                codec: videoStream.codec_name,
                bitrate: metadata.format.bit_rate,
                fps: eval(videoStream.r_frame_rate)
              });
            });
          });
          
        case 'audio':
          return new Promise<Record<string, any>>((resolve, reject) => {
            ffmpeg.ffprobe(file.path, (err: Error, metadata: any) => {
              if (err) return reject(err);
              
              const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
              if (!audioStream) return resolve({});
              
              resolve({
                duration: metadata.format.duration,
                codec: audioStream.codec_name,
                bitrate: metadata.format.bit_rate,
                sampleRate: audioStream.sample_rate,
                channels: audioStream.channels
              });
            });
          });
          
        default:
          return {};
      }
    } catch (error) {
      logger.error('Error extracting metadata', { error, filename: file.originalname });
      return {};
    }
  }
}

/**
 * Main Asset Service implementation
 * Provides a comprehensive API for asset management
 * Implemented as a singleton for consistent usage throughout the application
 */
class AssetService implements IAssetService {
  private static instance: AssetService;
  private repository: AssetRepository;
  private processor: AssetProcessor;
  private cache: AssetCache;
  private uploadQueue: {
    add: (data: { file: Express.Multer.File, userId: string, options: AssetUploadOptions }) => Promise<{ id: string }>
  };
  // Using the logger defined at the top level
  private readonly logger = logger;
  private clientMap: Map<string, string> = new Map(); // clientId to clientSlug mapping
  
  private constructor() {
    this.repository = new SupabaseAssetRepository();
    this.processor = new FileSystemAssetProcessor();
    this.cache = new MemoryAssetCache();
    
    // Set up a processing queue for uploads
    // Note: Queue implementation would be added here in a real implementation
    this.uploadQueue = {
      add: async (data: { file: Express.Multer.File, userId: string, options: AssetUploadOptions }) => {
        try {
          const result = await this.processAndUploadAsset(data.file, data.userId, data.options);
          return { id: result.data?.id || '' };
        } catch (error) {
          logger.error('Error in upload queue', { error });
          throw error;
        }
      }
    };
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): AssetService {
    if (!AssetService.instance) {
      AssetService.instance = new AssetService();
    }
    return AssetService.instance;
  }
  
  /**
   * Get assets based on filters
   */
  async getAssets(filters: AssetFilters): Promise<ServiceResult<Asset[]>> {
    try {
      // Generate cache key based on filters
      const cacheKey = `assets:${JSON.stringify(filters)}`;
      
      // Check cache first
      const cachedResult = await this.cache.get<ServiceResult<Asset[]>>(cacheKey);
      if (cachedResult) {
        logger.debug('Returning cached assets', { filters });
        return cachedResult;
      }
      
      // Get assets from repository
      const result = await this.repository.findAll(filters);
      
      // If successful, cache the result
      if (result.success && result.data) {
        // Map client IDs to slugs
        result.data = await this.mapClientIdsToSlugs(result.data);
        
        // Cache for 5 minutes
        await this.cache.set(cacheKey, result, 300);
      }
      
      return result;
    } catch (error) {
      logger.error('Error in getAssets', { error, filters });
      return {
        success: false,
        message: 'An error occurred while fetching assets',
        error
      };
    }
  }
  
  /**
   * Get asset by ID
   */
  async getAssetById(id: string, clientId: string): Promise<ServiceResult<Asset>> {
    try {
      if (!id || !clientId) {
        return {
          success: false,
          message: 'Asset ID and client ID are required',
          error: 'MISSING_PARAMETERS'
        };
      }
      
      // Generate cache key
      const cacheKey = `asset:${id}:${clientId}`;
      
      // Check cache first
      const cachedResult = await this.cache.get<ServiceResult<Asset>>(cacheKey);
      if (cachedResult) {
        logger.debug('Returning cached asset', { id, clientId });
        return cachedResult;
      }
      
      // Get asset from repository
      const result = await this.repository.findById(id, clientId);
      
      // If successful, cache the result
      if (result.success && result.data) {
        // Map client ID to slug
        const assets = await this.mapClientIdsToSlugs([result.data]);
        result.data = assets[0];
        
        // Cache for 5 minutes
        await this.cache.set(cacheKey, result, 300);
      }
      
      return result;
    } catch (error) {
      logger.error('Error in getAssetById', { error, id, clientId });
      return {
        success: false,
        message: 'An error occurred while fetching the asset',
        error
      };
    }
  }
  
  /**
   * Upload a new asset
   */
  async uploadAsset(file: Express.Multer.File, userId: string, options: AssetUploadOptions): Promise<ServiceResult<Asset>> {
    try {
      if (!file || !userId || !options.clientId) {
        return {
          success: false,
          message: 'File, user ID, and client ID are required',
          error: 'MISSING_PARAMETERS'
        };
      }
      
      // Add to queue for processing
      logger.info('Adding asset to upload queue', { filename: file.originalname, userId, clientId: options.clientId });
      const { id } = await this.uploadQueue.add({ file, userId, options });
      
      if (!id) {
        return {
          success: false,
          message: 'Failed to queue asset for processing',
          error: 'QUEUE_ERROR'
        };
      }
      
      return {
        success: true,
        message: 'Asset uploaded and queued for processing',
        data: { id } as Asset
      };
    } catch (error) {
      logger.error('Error in uploadAsset', { error, filename: file.originalname, userId, clientId: options.clientId });
      return {
        success: false,
        message: 'An error occurred while uploading the asset',
        error
      };
    }
  }
  
  /**
   * Process and upload asset (called by queue)
   */
  private async processAndUploadAsset(file: Express.Multer.File, userId: string, options: AssetUploadOptions): Promise<ServiceResult<Asset>> {
    try {
      // Process the asset with the processor
      const result = await this.processor.processAsset(file, options);
      if (!result.success || !result.data) {
        return result;
      }
      
      // Set the owner ID
      result.data.ownerId = userId;
      
      // Get the client slug
      const clientSlug = await this.getClientSlug(options.clientId);
      if (clientSlug) {
        result.data.clientSlug = clientSlug;
      }
      
      // Create the asset in the repository
      const createResult = await this.repository.create(result.data);
      
      // Invalidate cache for this client's assets
      await this.cache.invalidatePattern(`assets:${options.clientId}`);
      
      return createResult;
    } catch (error) {
      logger.error('Error in processAndUploadAsset', { error, filename: file.originalname, userId, clientId: options.clientId });
      return {
        success: false,
        message: 'An error occurred while processing and uploading the asset',
        error
      };
    }
  }
  
  /**
   * Update an existing asset
   */
  async updateAsset(id: string, clientId: string, updates: Partial<Asset>): Promise<ServiceResult<Asset>> {
    try {
      if (!id || !clientId || !updates) {
        return {
          success: false,
          message: 'Asset ID, client ID, and updates are required',
          error: 'MISSING_PARAMETERS'
        };
      }
      
      // Update the asset in the repository
      const result = await this.repository.update(id, clientId, updates);
      
      // If successful, invalidate cache
      if (result.success) {
        // Invalidate specific asset cache
        await this.cache.invalidate(`asset:${id}:${clientId}`);
        
        // Invalidate assets list cache for this client
        await this.cache.invalidatePattern(`assets:${clientId}`);
        
        // Map client ID to slug
        if (result.data) {
          const assets = await this.mapClientIdsToSlugs([result.data]);
          result.data = assets[0];
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error in updateAsset', { error, id, clientId, updates });
      return {
        success: false,
        message: 'An error occurred while updating the asset',
        error
      };
    }
  }
  
  /**
   * Delete an asset
   */
  async deleteAsset(id: string, clientId: string): Promise<ServiceResult<boolean>> {
    try {
      if (!id || !clientId) {
        return {
          success: false,
          message: 'Asset ID and client ID are required',
          error: 'MISSING_PARAMETERS'
        };
      }
      
      // Delete the asset in the repository
      const result = await this.repository.delete(id, clientId);
      
      // If successful, invalidate cache
      if (result.success) {
        // Invalidate specific asset cache
        await this.cache.invalidate(`asset:${id}:${clientId}`);
        
        // Invalidate assets list cache for this client
        await this.cache.invalidatePattern(`assets:${clientId}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Error in deleteAsset', { error, id, clientId });
      return {
        success: false,
        message: 'An error occurred while deleting the asset',
        error
      };
    }
  }
  
  /**
   * Toggle an asset's favourite status
   */
  async toggleFavourite(id: string, clientId: string, isFavourite: boolean): Promise<ServiceResult<Asset>> {
    try {
      if (!id || !clientId) {
        return {
          success: false,
          message: 'Asset ID and client ID are required',
          error: 'MISSING_PARAMETERS'
        };
      }
      
      // Toggle favourite status in the repository
      const result = await this.repository.toggleFavourite(id, clientId, isFavourite);
      
      // If successful, invalidate cache
      if (result.success) {
        // Invalidate specific asset cache
        await this.cache.invalidate(`asset:${id}:${clientId}`);
        
        // Invalidate assets list cache for this client
        await this.cache.invalidatePattern(`assets:${clientId}`);
        
        // Map client ID to slug
        if (result.data) {
          const assets = await this.mapClientIdsToSlugs([result.data]);
          result.data = assets[0];
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error in toggleFavourite', { error, id, clientId, isFavourite });
      return {
        success: false,
        message: 'An error occurred while toggling the asset favourite status',
        error
      };
    }
  }
  
  /**
   * Batch update multiple assets
   */
  async batchUpdateAssets(ids: string[], clientId: string, updates: Partial<Asset>): Promise<ServiceResult<number>> {
    try {
      if (!ids || ids.length === 0 || !clientId || !updates) {
        return {
          success: false,
          message: 'Asset IDs, client ID, and updates are required',
          error: 'MISSING_PARAMETERS'
        };
      }
      
      // Batch update assets in the repository
      const result = await this.repository.batchUpdate(ids, clientId, updates);
      
      // If successful, invalidate cache
      if (result.success) {
        // Invalidate specific asset caches
        for (const id of ids) {
          await this.cache.invalidate(`asset:${id}:${clientId}`);
        }
        
        // Invalidate assets list cache for this client
        await this.cache.invalidatePattern(`assets:${clientId}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Error in batchUpdateAssets', { error, ids, clientId, updates });
      return {
        success: false,
        message: 'An error occurred while batch updating assets',
        error
      };
    }
  }
  
  /**
   * Check if Supabase is configured
   */
  isSupabaseConfigured(): boolean {
    try {
      return !!supabase;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Search assets by search term
   */
  async searchAssets(searchTerm: string, clientId: string, filters?: Partial<AssetFilters>): Promise<ServiceResult<Asset[]>> {
    try {
      if (!searchTerm || !clientId) {
        return {
          success: false,
          message: 'Search term and client ID are required',
          error: 'MISSING_PARAMETERS'
        };
      }
      
      // Create full filters object
      const fullFilters: AssetFilters = {
        clientId,
        search: searchTerm,
        ...filters
      };
      
      // Use getAssets method to leverage caching
      return this.getAssets(fullFilters);
    } catch (error) {
      logger.error('Error in searchAssets', { error, searchTerm, clientId, filters });
      return {
        success: false,
        message: 'An error occurred while searching assets',
        error
      };
    }
  }
  
  /**
   * Get assets by tags
   */
  async getAssetsByTags(tags: string[], clientId: string, filters?: Partial<AssetFilters>): Promise<ServiceResult<Asset[]>> {
    try {
      if (!tags || tags.length === 0 || !clientId) {
        return {
          success: false,
          message: 'Tags and client ID are required',
          error: 'MISSING_PARAMETERS'
        };
      }
      
      // Create full filters object
      const fullFilters: AssetFilters = {
        clientId,
        tags,
        ...filters
      };
      
      // Use getAssets method to leverage caching
      return this.getAssets(fullFilters);
    } catch (error) {
      logger.error('Error in getAssetsByTags', { error, tags, clientId, filters });
      return {
        success: false,
        message: 'An error occurred while fetching assets by tags',
        error
      };
    }
  }
  
  /**
   * Helper method to get client slug from ID
   * In a real implementation, this would query a client service
   */
  private async getClientSlug(clientId: string): Promise<string | undefined> {
    try {
      // Check the cache map first
      if (this.clientMap.has(clientId)) {
        return this.clientMap.get(clientId);
      }
      
      // In a real implementation, this would query a client service
      // For now, just return a placeholder
      // This would be replaced with a real implementation that fetches from the database
      const clientSlug = `client-${clientId.substring(0, 8)}`;
      
      // Cache the mapping
      this.clientMap.set(clientId, clientSlug);
      
      return clientSlug;
    } catch (error) {
      logger.error('Error getting client slug', { error, clientId });
      return undefined;
    }
  }
  
  /**
   * Helper method to map client IDs to slugs for an array of assets
   */
  private async mapClientIdsToSlugs(assets: Asset[]): Promise<Asset[]> {
    try {
      const result: Asset[] = [];
      
      for (const asset of assets) {
        if (asset.clientId && !asset.clientSlug) {
          const clientSlug = await this.getClientSlug(asset.clientId);
          if (clientSlug) {
            asset.clientSlug = clientSlug;
          }
        }
        result.push(asset);
      }
      
      return result;
    } catch (error) {
      logger.error('Error mapping client IDs to slugs', { error });
      return assets; // Return original assets on error
    }
  }
}

// Export the AssetService instance as a singleton
export const assetService = AssetService.getInstance();

// Export types for external usage
export {
  Asset,
  AssetFilters,
  AssetUploadOptions,
  ServiceResult
};

// Export enums if they exist in your types file
// If these don't exist, you'll need to import or define them
// export { AssetType, AssetStatus };

// Export interfaces for testing and dependency injection
export {
  IAssetService,
  AssetRepository,
  AssetProcessor,
  AssetCache
};
