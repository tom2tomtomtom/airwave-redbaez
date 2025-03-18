import { supabase } from '../db/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';

// Convert fs methods to promise-based
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

// Database schema representation (matches Supabase columns)
export interface DbAsset {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnail_url?: string;
  user_id?: string;
  owner_id?: string;
  meta?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Application interface with camelCase properties
export interface Asset {
  id: string;
  name: string;
  type: string;
  description?: string;
  url: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  tags?: string[];
  categories?: string[];
  isFavourite?: boolean;
  usageCount?: number;
  userId?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ServiceResult<T> {
  success: boolean;
  message?: string;
  code?: number;
  asset?: Asset;
  data?: T;
}

export interface AssetUploadResult extends ServiceResult<Asset> {
  asset: Asset;
}

export interface AssetFilters {
  type?: string[];
  tags?: string[];
  categories?: string[];
  favouritesOnly?: boolean;
  searchTerm?: string;
  userId?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  sortDirection?: 'asc' | 'desc';
  // Pagination parameters
  limit?: number;
  offset?: number;
}

class AssetService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadsDir();
  }

  private async ensureUploadsDir(): Promise<void> {
    try {
      await mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Upload a new asset
   */
  /**
   * Upload a new asset with enhanced security and error handling
   * @param file The uploaded file
   * @param userId The ID of the user uploading the asset
   * @param assetData Additional metadata for the asset
   */
  async uploadAsset(
    file: Express.Multer.File,
    userId: string,
    assetData: {
      name: string;
      type: string;
      description?: string;
      tags?: string[];
      categories?: string[];
      organisationId?: string; // Allow setting organisation ID for multi-tenant support
      additionalMetadata?: Record<string, any>; // Allow arbitrary additional metadata
    }
  ): Promise<AssetUploadResult> {
    try {
      // Verify user exists in database to prevent foreign key constraint issues
      if (!userId) {
        throw new Error('User ID is required to upload an asset');
      }
      
      // In production, we should verify the user has permission to upload
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (!isDevelopment) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .single();
          
        if (userError || !userData) {
          throw new Error(`User with ID ${userId} not found or not authorised`);
        }
      }
      
      // Generate unique IDs and filenames
      const assetId = uuidv4();
      const fileExt = path.extname(file.originalname).toLowerCase();
      const sanitizedName = assetData.name.replace(/[^a-zA-Z0-9]/g, '-');
      const assetFileName = `asset-${sanitizedName}-${assetId}${fileExt}`;
      const assetFilePath = path.join(this.uploadsDir, assetFileName);
      
      // Get file stats for metadata
      const fileStats = await stat(file.path);
      
      // Validate file type against claimed type
      const validTypes: Record<string, string[]> = {
        image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
        video: ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
        audio: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
        document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv']
      };
      
      if (assetData.type in validTypes && !validTypes[assetData.type].includes(fileExt)) {
        throw new Error(`File extension ${fileExt} does not match claimed type ${assetData.type}`);
      }
      
      // Initialize asset object with enhanced metadata
      const asset: Asset = {
        id: assetId,
        name: assetData.name || file.originalname,
        type: assetData.type,
        description: assetData.description || '',
        url: `/uploads/${assetFileName}`,
        size: fileStats.size,
        tags: assetData.tags || [],
        categories: assetData.categories || [],
        isFavourite: false,
        usageCount: 0,
        userId: userId,
        ownerId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: assetData.additionalMetadata || {}
      };

      // Ensure uploads directory exists
      await this.ensureUploadsDir();
      
      // Move file to uploads directory with proper error handling
      try {
        fs.renameSync(file.path, assetFilePath);
      } catch (error: any) {
        console.error('Error moving uploaded file:', error);
        throw new Error(`Failed to save asset file: ${error.message || 'Unknown error'}`);
      }
      
      // Process asset based on type
      try {
        if (assetData.type === 'image') {
          await this.processImageAsset(asset, assetFilePath);
        } else if (assetData.type === 'video') {
          await this.processVideoAsset(asset, assetFilePath);
        } else if (assetData.type === 'audio') {
          await this.processAudioAsset(asset, assetFilePath);
        } else if (assetData.type === 'document') {
          // Set default thumbnail for documents
          asset.thumbnailUrl = '/uploads/default-document-thumb.jpg';
        }
      } catch (processingError) {
        console.error(`Error processing ${assetData.type} asset:`, processingError);
        // Continue with upload even if processing fails, but log the error
      }
      
      // Prepare database record with enhanced metadata
      const dbRecord = {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        url: asset.url,
        thumbnail_url: asset.thumbnailUrl,
        user_id: asset.userId,
        owner_id: asset.ownerId,
        organisation_id: assetData.organisationId, // Optional organisation ID for multi-tenant support
        meta: {
          description: asset.description,
          previewUrl: asset.previewUrl,
          size: asset.size,
          width: asset.width,
          height: asset.height,
          duration: asset.duration,
          tags: asset.tags,
          categories: asset.categories,
          isFavourite: asset.isFavourite,
          usageCount: asset.usageCount,
          uploadedAt: asset.createdAt,
          ...asset.metadata
        },
        created_at: asset.createdAt,
        updated_at: asset.updatedAt
      };
      
      // Save asset to database with proper error handling for foreign key constraints
      const { data, error } = await supabase
        .from('assets')
        .insert([dbRecord])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to save asset to database: ${error.message}`);
      }
      
      return {
        asset: this.transformAssetFromDb(data),
        success: true
      };
    } catch (error: any) {
      console.error('Error uploading asset:', error);
      return {
        asset: null as any,
        success: false,
        message: `Failed to upload asset: ${error.message}`
      };
    }
  }
  
  /**
   * Process image asset
   * Enhanced with better error handling and metadata extraction
   */
  private async processImageAsset(asset: Asset, filePath: string): Promise<void> {
    try {
      // Generate unique thumbnail filename
      const thumbnailFileName = `thumb-${asset.id}.jpg`;
      const thumbnailPath = path.join(this.uploadsDir, thumbnailFileName);
      
      // Extract comprehensive metadata
      const metadata = await sharp(filePath).metadata();
      
      // Store standard dimensions
      asset.width = metadata.width;
      asset.height = metadata.height;
      
      // Store additional metadata for enhanced search and filtering
      asset.metadata = {
        ...asset.metadata,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        isProgressive: metadata.isProgressive
      };
      
      // Create optimised thumbnail
      await sharp(filePath)
        .resize({
          width: 320,
          height: 240,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 85,
          progressive: true
        })
        .toFile(thumbnailPath);
      
      // Create preview (medium-sized version for details view)
      const previewFileName = `preview-${asset.id}.jpg`;
      const previewPath = path.join(this.uploadsDir, previewFileName);
      
      await sharp(filePath)
        .resize({
          width: 1024,
          height: 768,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 90,
          progressive: true
        })
        .toFile(previewPath);
      
      // Update asset with URLs
      asset.thumbnailUrl = `/uploads/${thumbnailFileName}`;
      asset.previewUrl = `/uploads/${previewFileName}`;
    } catch (error: any) {
      console.error('Error processing image asset:', error);
      // Set a default thumbnail if processing fails
      asset.thumbnailUrl = '/uploads/default-image-thumb.jpg';
      asset.previewUrl = asset.url;
    }
  }
  
  /**
   * Process video asset
   * Enhanced with better thumbnail generation, preview GIF creation, and metadata extraction
   */
  private async processVideoAsset(asset: Asset, filePath: string): Promise<void> {
    try {
      // Generate unique thumbnail and preview filenames
      const thumbnailFileName = `thumb-${asset.id}.jpg`;
      const thumbnailPath = path.join(this.uploadsDir, thumbnailFileName);
      const previewFileName = `preview-${asset.id}.gif`;
      const previewPath = path.join(this.uploadsDir, previewFileName);
      
      // Create promise for ffmpeg thumbnail generation (from 10% into the video)
      const thumbnailPromise = new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .screenshots({
            timestamps: ['10%'],
            filename: thumbnailFileName,
            folder: this.uploadsDir,
            size: '320x240',
            quality: 90
          });
      });
      
      // Create promise for ffmpeg preview GIF generation (short clip from middle)
      const previewPromise = new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .outputOptions([
            '-vf', 'fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
            '-t', '3'
          ])
          .output(previewPath)
          .run();
      });
      
      // Create promise for ffmpeg metadata extraction
      const metadataPromise = new Promise<void>((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err: Error, metadata: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Store basic dimensions and duration
          if (metadata && metadata.streams) {
            const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
            if (videoStream) {
              asset.width = videoStream.width;
              asset.height = videoStream.height;
              asset.duration = metadata.format.duration;
              
              // Store detailed metadata for enhanced search and filtering
              asset.metadata = {
                ...asset.metadata,
                codec: videoStream.codec_name,
                framerate: videoStream.r_frame_rate,
                bitrate: metadata.format.bit_rate,
                format: metadata.format.format_name,
                container: metadata.format.format_long_name
              };
              
              // Extract audio metadata if available
              const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
              if (audioStream) {
                asset.metadata.audioCodec = audioStream.codec_name;
                asset.metadata.audioChannels = audioStream.channels;
                asset.metadata.audioSampleRate = audioStream.sample_rate;
              }
            }
          }
          
          resolve();
        });
      });
      
      // Wait for all processes to complete
      await Promise.all([thumbnailPromise, previewPromise, metadataPromise]);
      
      // Update asset with URLs
      asset.thumbnailUrl = `/uploads/${thumbnailFileName}`;
      asset.previewUrl = `/uploads/${previewFileName}`;
    } catch (error: any) {
      console.error('Error processing video asset:', error);
      // Set a default thumbnail if processing fails
      asset.thumbnailUrl = '/uploads/default-video-thumb.jpg';
      asset.previewUrl = asset.url;
    }
  }
  
  /**
   * Process audio asset
   * Enhanced with waveform generation and detailed metadata extraction
   */
  private async processAudioAsset(asset: Asset, filePath: string): Promise<void> {
    try {
      // Create unique filenames
      const thumbnailFileName = `thumb-${asset.id}.jpg`;
      const thumbnailPath = path.join(this.uploadsDir, thumbnailFileName);
      const waveformFileName = `waveform-${asset.id}.png`;
      const waveformPath = path.join(this.uploadsDir, waveformFileName);
      
      // Use a default audio thumbnail or generate a dynamic one
      const defaultAudioThumb = 'audio-thumb.jpg';
      const defaultThumbPath = path.join(__dirname, '../../public', defaultAudioThumb);
      
      if (fs.existsSync(defaultThumbPath)) {
        fs.copyFileSync(defaultThumbPath, thumbnailPath);
        asset.thumbnailUrl = `/uploads/${thumbnailFileName}`;
      } else {
        // Create a default thumbnail if none exists
        await sharp({
          create: {
            width: 320,
            height: 240,
            channels: 4,
            background: { r: 37, g: 99, b: 235, alpha: 1 }
          }
        })
        .composite([{
          input: Buffer.from(`<svg width="320" height="240">
            <rect width="100%" height="100%" fill="none"/>
            <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
              ${asset.name.substring(0, 20)}
            </text>
          </svg>`),
          top: 0,
          left: 0
        }])
        .jpeg({ quality: 90 })
        .toFile(thumbnailPath);
        
        asset.thumbnailUrl = `/uploads/${thumbnailFileName}`;
      }
      
      // Extract comprehensive audio metadata
      const metadataPromise = new Promise<void>((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err: Error, metadata: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (metadata && metadata.format) {
            // Basic duration
            asset.duration = metadata.format.duration;
            
            // Extract detailed audio metadata
            asset.metadata = {
              ...asset.metadata,
              format: metadata.format.format_name,
              container: metadata.format.format_long_name,
              bitrate: metadata.format.bit_rate
            };
            
            // Extract audio stream info if available
            const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
            if (audioStream) {
              asset.metadata.audioCodec = audioStream.codec_name;
              asset.metadata.audioChannels = audioStream.channels;
              asset.metadata.audioSampleRate = audioStream.sample_rate;
              asset.metadata.audioBitrate = audioStream.bit_rate;
            }
          }
          
          resolve();
        });
      });
      
      // Generate audio waveform as a preview
      const waveformPromise = new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .outputOptions([
            '-filter_complex', 'showwavespic=s=1000x200:colors=37:99:235',
            '-frames:v', '1'
          ])
          .output(waveformPath)
          .run();
      });
      
      // Wait for all processes to complete
      await Promise.all([metadataPromise, waveformPromise]);
      
      // Set the waveform as the preview
      asset.previewUrl = `/uploads/${waveformFileName}`;
    } catch (error: any) {
      console.error('Error processing audio asset:', error);
      // Use defaults if processing fails
      if (!asset.thumbnailUrl) {
        asset.thumbnailUrl = '/uploads/default-audio-thumb.jpg';
      }
      asset.previewUrl = asset.url;
    }
  }
  
  /**
   * Get assets with optional filtering and pagination
   * Enhanced to handle nested metadata, security considerations, and pagination
   * @returns Object containing paginated assets and total count
   */
  async getAssets(filters: AssetFilters = {}): Promise<{assets: Asset[], total: number}> {
    try {
      // Default pagination values
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      
      // Security consideration: Always filter by user_id in production
      // In development, we allow access to all assets
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (!isDevelopment && !filters.userId) {
        console.warn('Security warning: Attempting to fetch assets without userId filter in production');
        // In production, return empty result if no userId provided
        // This ensures security until proper RLS policies are implemented
        return { assets: [], total: 0 };
      }

      // First, get the total count of matching records
      let countQuery = supabase
        .from('assets')
        .select('id', { count: 'exact' });

      // Apply all filters to the count query
      countQuery = this.applyFiltersToQuery(countQuery, filters);

      const { count: total, error: countError } = await countQuery;
      
      if (countError) {
        throw new Error(`Failed to count assets: ${countError.message}`);
      }
      
      // Then, get the paginated data
      let dataQuery = supabase
        .from('assets')
        .select('*');

      // Apply all filters to the data query
      dataQuery = this.applyFiltersToQuery(dataQuery, filters);
      
      // Apply sorting with proper field mapping
      const sortBy = filters.sortBy || 'createdAt';
      const sortDirection = filters.sortDirection || 'desc';
      const sortField = this.getDbFieldName(sortBy);
      
      dataQuery = dataQuery.order(sortField, { ascending: sortDirection === 'asc' });
      
      // Apply pagination
      dataQuery = dataQuery.range(offset, offset + limit - 1);
      
      // Execute data query
      const { data, error: dataError } = await dataQuery;
      
      if (dataError) {
        throw new Error(`Failed to fetch assets: ${dataError.message}`);
      }
      
      // Transform results
      const assets = (data || []).map(item => this.transformAssetFromDb(item));
      
      return {
        assets,
        total: total || 0
      };
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      throw new Error(`Failed to fetch assets: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Helper method to apply filters to a Supabase query
   * @param query The base Supabase query
   * @param filters The filters to apply
   * @returns The query with filters applied
   */
  private applyFiltersToQuery(query: any, filters: AssetFilters): any {
    // Apply user ID filter if provided
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    // Apply type filters
    if (filters.type && filters.type.length > 0) {
      query = query.in('type', filters.type);
    }
    
    // Apply enhanced text search filters
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.trim();
      
      // For simple searches, use a combined approach with OR conditions
      if (searchTerm.length < 3 || !searchTerm.includes(' ')) {
        // For short or single-word searches, use pattern matching for better performance
        query = query.or(
          `name.ilike.%${searchTerm}%,` +
          `meta->description.ilike.%${searchTerm}%`
        );
      } else {
        // For more complex searches, use PostgreSQL's full-text search capabilities
        // Convert the search term to a format suitable for full-text search
        const formattedSearchTerm = searchTerm
          .split(' ')
          .filter(word => word.length > 0)
          .map(word => word + ':*')
          .join(' & ');
        
        // Use full-text search on both name and meta->description
        // This provides more relevant results for multi-word searches
        query = query.or(
          `name.wfts.${formattedSearchTerm},` +
          `meta->description.wfts.${formattedSearchTerm}`
        );
        
        // Optionally, we could add a search_vector column to the assets table
        // and use that for even more efficient searching if performance becomes an issue
      }
      
      // Also search in tags and categories
      const words = searchTerm.split(' ').filter(word => word.length > 0);
      words.forEach(word => {
        // Check if any tag contains this word
        query = query.or(`meta->tags.cs.{${word}}`);
        // Check if any category contains this word
        query = query.or(`meta->categories.cs.{${word}}`);
      });
    }
    
    // Filter by tags (inside meta->tags)
    if (filters.tags && filters.tags.length > 0) {
      // For each tag, check if it's contained in the meta->tags array
      filters.tags.forEach(tag => {
        query = query.or(`meta->tags.cs.{${tag}}`);
      });
    }
    
    // Filter by categories (inside meta->categories)
    if (filters.categories && filters.categories.length > 0) {
      filters.categories.forEach(category => {
        query = query.or(`meta->categories.cs.{${category}}`);
      });
    }
    
    // Filter by favourites
    if (filters.favouritesOnly) {
      query = query.eq('meta->isFavourite', true);
    }
    
    return query;
  }
  
  /**
   * Get asset by ID
   */
  async getAssetById(id: string): Promise<Asset | null> {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        throw new Error(`Failed to fetch asset: ${error.message}`);
      }
      
      return data ? this.transformAssetFromDb(data) : null;
    } catch (error: any) {
      console.error(`Error fetching asset with ID ${id}:`, error);
      throw new Error(`Failed to fetch asset: ${error.message}`);
    }
  }
  
  /**
   * Update asset
   * Enhanced to handle Supabase meta field structure and security checks
   */
  async updateAsset(id: string, userId: string, updates: Partial<Asset>): Promise<ServiceResult<Asset>> {
    try {
      // Get current asset
      const asset = await this.getAssetById(id);
      if (!asset) {
        return {
          success: false,
          message: `Asset with ID ${id} not found`,
          code: 404
        };
      }
      
      // Security check: Verify user is authorized to update this asset
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (!isDevelopment && asset.ownerId !== userId) {
        console.warn(`Security warning: User ${userId} attempted to update asset ${id} owned by ${asset.ownerId}`);
        return {
          success: false,
          message: 'You do not have permission to update this asset',
          code: 403
        };
      }
      
      // Prepare base updates for database
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      
      // Handle top-level fields
      if (updates.name !== undefined) {
        dbUpdates.name = updates.name;
      }
      
      // Initialize meta updates based on existing meta data
      const metaUpdates: Record<string, any> = {};
      
      // Handle nested meta fields
      if (updates.description !== undefined) metaUpdates.description = updates.description;
      if (updates.tags !== undefined) metaUpdates.tags = updates.tags;
      if (updates.categories !== undefined) metaUpdates.categories = updates.categories;
      if (updates.isFavourite !== undefined) metaUpdates.isFavourite = updates.isFavourite;
      
      // Only add meta update if there are changes
      if (Object.keys(metaUpdates).length > 0) {
        // Get the current meta to update
        const { data: currentData, error: fetchError } = await supabase
          .from('assets')
          .select('meta')
          .eq('id', id)
          .single();
        
        if (fetchError) {
          return {
            success: false,
            message: `Failed to fetch current asset metadata: ${fetchError.message}`,
            code: 500
          };
        }
        
        // Merge current meta with updates
        const currentMeta = currentData?.meta || {};
        dbUpdates.meta = {
          ...currentMeta,
          ...metaUpdates
        };
      }
      
      // Update the asset with transaction support
      const { data, error } = await supabase
        .from('assets')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        if (error.code === '23503') { // Foreign key constraint error
          return {
            success: false,
            message: 'Failed to update asset: Referenced entity does not exist',
            code: 400
          };
        } else if (error.code === '23505') { // Unique constraint error
          return {
            success: false,
            message: 'Failed to update asset: Duplicate key violation',
            code: 409
          };
        } else {
          return {
            success: false,
            message: `Failed to update asset: ${error.message}`,
            code: 500
          };
        }
      }
      
      // Transform the updated asset for response
      const updatedAsset = this.transformAssetFromDb(data);
      return {
        success: true,
        message: 'Asset updated successfully',
        asset: updatedAsset
      };
    } catch (error: any) {
      console.error(`Error updating asset with ID ${id}:`, error);
      return {
        success: false,
        message: `Failed to update asset: ${error.message || 'Unknown error'}`,
        code: 500
      };
    }
  }
  
  /**
   * Delete asset with enhanced security and file cleanup
   * @param id Asset ID to delete
   * @param userId User requesting the delete operation
   */
  async deleteAsset(id: string, userId: string): Promise<ServiceResult<boolean>> {
    try {
      // Get asset details first
      const asset = await this.getAssetById(id);
      if (!asset) {
        return {
          success: false,
          message: `Asset with ID ${id} not found`,
          code: 404,
          data: false
        };
      }
      
      // Security check: Verify user is authorized to delete this asset
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (!isDevelopment && asset.ownerId !== userId) {
        console.warn(`Security warning: User ${userId} attempted to delete asset ${id} owned by ${asset.ownerId}`);
        return {
          success: false,
          message: 'You do not have permission to delete this asset',
          code: 403,
          data: false
        };
      }

      // Check for asset references before deletion to maintain data integrity
      // This is a placeholder - in a real app, you would check if this asset is referenced
      // by other entities like projects, collections, etc.
      const isReferenced = false; // Replace with actual check
      if (isReferenced) {
        return {
          success: false,
          message: 'Cannot delete asset because it is referenced by other items',
          code: 409,
          data: false
        };
      }
      
      // First collect files to delete - to ensure we still have the references even if DB delete succeeds
      const filesToDelete = [
        asset.url, 
        asset.thumbnailUrl, 
        asset.previewUrl
      ].filter(Boolean).map(url => {
        // Extract the filename from URL, handling both relative and absolute paths
        const urlStr = url as string;
        const filename = urlStr.includes('/uploads/') ? 
          urlStr.substring(urlStr.lastIndexOf('/uploads/') + 9) : 
          urlStr;
        return path.join(this.uploadsDir, filename);
      });
      
      // Delete from database with proper error handling
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);
      
      if (error) {
        // Handle specific database error cases
        if (error.code === '23503') { // Foreign key violation
          return {
            success: false,
            message: 'Cannot delete asset because it is referenced by other items',
            code: 409,
            data: false
          };
        } else {
          return {
            success: false,
            message: `Failed to delete asset from database: ${error.message}`,
            code: 500,
            data: false
          };
        }
      }
      
      // Now delete files from storage with proper error handling
      let fileErrors = [];
      for (const filePath of filesToDelete) {
        try {
          if (fs.existsSync(filePath)) {
            await unlink(filePath);
          }
        } catch (fileError: any) {
          // Log but don't fail if file deletion fails
          console.error(`Failed to delete file ${filePath}:`, fileError);
          fileErrors.push({
            path: filePath,
            error: fileError.message || 'Unknown error'
          });
        }
      }
      
      return {
        success: true,
        message: fileErrors.length > 0 ?
          `Asset deleted but with ${fileErrors.length} file cleanup issues` :
          'Asset deleted successfully',
        data: true
      };
    } catch (error: any) {
      console.error(`Error deleting asset with ID ${id}:`, error);
      return {
        success: false,
        message: `Failed to delete asset: ${error.message || 'Unknown error'}`,
        code: 500,
        data: false
      };
    }
  }
  
  /**
   * Toggle asset favourite status
   * Enhanced to handle Supabase meta field structure and security checks
   * @param id Asset ID to toggle favourite status for
   * @param userId User requesting the operation
   * @param isFavourite Optional explicit favourite status to set
   */
  async toggleFavourite(id: string, userId: string, isFavourite?: boolean): Promise<ServiceResult<Asset>> {
    try {
      // Get current asset data
      const asset = await this.getAssetById(id);
      if (!asset) {
        return {
          success: false,
          message: `Asset with ID ${id} not found`,
          code: 404
        };
      }
      
      // Security check: Verify user is authorized to modify this asset
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (!isDevelopment && asset.userId !== userId) {
        console.warn(`Security warning: User ${userId} attempted to modify asset ${id} owned by ${asset.userId}`);
        return {
          success: false,
          message: 'You do not have permission to modify this asset',
          code: 403
        };
      }
      
      // Set the favourite status either to the provided value or toggle it
      const newFavouriteStatus = isFavourite !== undefined ? isFavourite : !asset.isFavourite;
      
      // Get the current meta to update
      const { data: currentData, error: fetchError } = await supabase
        .from('assets')
        .select('meta')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        return {
          success: false,
          message: `Failed to fetch current asset metadata: ${fetchError.message}`,
          code: 500
        };
      }
      
      // Merge current meta with the favourite status update
      const currentMeta = currentData?.meta || {};
      const updatedMeta = {
        ...currentMeta,
        isFavourite: newFavouriteStatus
      };
      
      // Update the asset with the new meta data
      const { data, error } = await supabase
        .from('assets')
        .update({
          meta: updatedMeta,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          message: `Failed to update favourite status: ${error.message}`,
          code: 500
        };
      }
      
      const updatedAsset = this.transformAssetFromDb(data);
      return {
        success: true,
        message: `Asset ${newFavouriteStatus ? 'marked as favourite' : 'removed from favourites'} successfully`,
        asset: updatedAsset
      };
    } catch (error: any) {
      console.error(`Error toggling favourite for asset with ID ${id}:`, error);
      return {
        success: false,
        message: `Failed to toggle favourite status: ${error.message || 'Unknown error'}`,
        code: 500
      };
    }
  }
  
  /**
   * Increment asset usage count
   * Enhanced to work with Supabase meta field structure
   * @param id Asset ID to increment usage count for
   */
  async incrementUsageCount(id: string): Promise<ServiceResult<Asset>> {
    try {
      // Get the current asset data
      const asset = await this.getAssetById(id);
      if (!asset) {
        return {
          success: false,
          message: `Asset with ID ${id} not found`,
          code: 404
        };
      }

      // Get the current meta data
      const { data: currentData, error: fetchError } = await supabase
        .from('assets')
        .select('meta')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        return {
          success: false,
          message: `Failed to fetch asset metadata: ${fetchError.message}`,
          code: 500
        };
      }
      
      // Calculate new usage count
      const currentMeta = currentData?.meta || {};
      const currentUsageCount = currentMeta.usageCount || 0;
      const newUsageCount = currentUsageCount + 1;
      
      // Update the meta with incremented usage count
      const updatedMeta = {
        ...currentMeta,
        usageCount: newUsageCount,
        lastUsedAt: new Date().toISOString()
      };
      
      // Update the asset
      const { data, error } = await supabase
        .from('assets')
        .update({
          meta: updatedMeta,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          message: `Failed to increment usage count: ${error.message}`,
          code: 500
        };
      }
      
      const updatedAsset = this.transformAssetFromDb(data);
      return {
        success: true,
        message: `Usage count incremented to ${newUsageCount}`,
        asset: updatedAsset
      };
    } catch (error: any) {
      console.error(`Error incrementing usage count for asset with ID ${id}:`, error);
      return {
        success: false,
        message: `Failed to increment usage count: ${error.message || 'Unknown error'}`,
        code: 500
      };
    }
  }
  
  /**
   * Get available asset tags
   * Updated to work with meta field structure
   */
  async getAvailableTags(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('meta');
      
      if (error) {
        throw new Error(`Failed to fetch tags: ${error.message}`);
      }
      
      // Extract all tags from the meta field and remove duplicates
      const allTags = data.flatMap(asset => asset.meta?.tags || []);
      return [...new Set(allTags)];
    } catch (error: any) {
      console.error('Error fetching tags:', error);
      throw new Error(`Failed to fetch tags: ${error.message}`);
    }
  }
  
  /**
   * Get available asset categories
   * Updated to work with meta field structure
   */
  async getAvailableCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('meta');
      
      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }
      
      // Extract all categories from the meta field and remove duplicates
      const allCategories = data.flatMap(asset => asset.meta?.categories || []);
      return [...new Set(allCategories)];
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
  }
  
  /**
   * Batch update assets with tags/categories
   * @param assetIds Array of asset IDs to update
   * @param userId User requesting the update
   * @param updates Object containing tags and/or categories to add/remove
   * @returns Result with success status and counts
   */
  async batchUpdateAssets(
    assetIds: string[],
    userId: string,
    updates: {
      addTags?: string[];
      removeTags?: string[];
      addCategories?: string[];
      removeCategories?: string[];
    }
  ): Promise<ServiceResult<{ updated: number; failed: number; assets: Asset[] }>> {
    if (!assetIds.length) {
      return {
        success: false,
        message: 'No asset IDs provided',
        code: 400,
        data: { updated: 0, failed: 0, assets: [] }
      };
    }
    
    try {
      // Security check: Only proceed in dev mode or if we're going to verify ownership
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      // Track results
      let updatedCount = 0;
      let failedCount = 0;
      const updatedAssets: Asset[] = [];
      
      // Process each asset individually to maintain proper security checks
      // and ensure atomic updates (all or nothing for each asset)
      for (const assetId of assetIds) {
        try {
          // Get current asset data
          const asset = await this.getAssetById(assetId);
          if (!asset) {
            failedCount++;
            console.warn(`Asset with ID ${assetId} not found in batch update`);
            continue;
          }
          
          // Security check in production
          if (!isDevelopment && asset.userId !== userId) {
            failedCount++;
            console.warn(`Security warning: User ${userId} attempted to modify asset ${assetId} owned by ${asset.userId}`);
            continue;
          }
          
          // Get the current meta to update
          const { data: currentData, error: fetchError } = await supabase
            .from('assets')
            .select('meta')
            .eq('id', assetId)
            .single();
          
          if (fetchError) {
            failedCount++;
            console.error(`Failed to fetch metadata for asset ${assetId}:`, fetchError);
            continue;
          }
          
          // Clone the current meta
          const currentMeta = currentData?.meta ? { ...currentData.meta } : {};
          let hasChanges = false;
          
          // Process tags
          let tags = Array.isArray(currentMeta.tags) ? [...currentMeta.tags] : [];
          
          if (updates.addTags?.length) {
            // Add new tags, avoiding duplicates
            const uniqueNewTags = updates.addTags.filter(tag => !tags.includes(tag));
            if (uniqueNewTags.length) {
              tags = [...tags, ...uniqueNewTags];
              hasChanges = true;
            }
          }
          
          if (updates.removeTags?.length) {
            // Remove specified tags
            const filteredTags = tags.filter(tag => !updates.removeTags!.includes(tag));
            if (filteredTags.length !== tags.length) {
              tags = filteredTags;
              hasChanges = true;
            }
          }
          
          // Process categories
          let categories = Array.isArray(currentMeta.categories) ? [...currentMeta.categories] : [];
          
          if (updates.addCategories?.length) {
            // Add new categories, avoiding duplicates
            const uniqueNewCategories = updates.addCategories.filter(cat => !categories.includes(cat));
            if (uniqueNewCategories.length) {
              categories = [...categories, ...uniqueNewCategories];
              hasChanges = true;
            }
          }
          
          if (updates.removeCategories?.length) {
            // Remove specified categories
            const filteredCategories = categories.filter(cat => !updates.removeCategories!.includes(cat));
            if (filteredCategories.length !== categories.length) {
              categories = filteredCategories;
              hasChanges = true;
            }
          }
          
          // Skip update if nothing changed
          if (!hasChanges) {
            console.log(`No changes needed for asset ${assetId} in batch update`);
            continue;
          }
          
          // Update with new tags and categories
          const updatedMeta = {
            ...currentMeta,
            tags,
            categories
          };
          
          // Update the asset
          const { data, error } = await supabase
            .from('assets')
            .update({
              meta: updatedMeta,
              updated_at: new Date().toISOString()
            })
            .eq('id', assetId)
            .select()
            .single();
          
          if (error) {
            failedCount++;
            console.error(`Failed to update asset ${assetId} in batch:`, error);
            continue;
          }
          
          // Success
          updatedCount++;
          const updatedAsset = this.transformAssetFromDb(data);
          updatedAssets.push(updatedAsset);
          
        } catch (assetError: any) {
          failedCount++;
          console.error(`Error in batch update for asset ${assetId}:`, assetError);
        }
      }
      
      return {
        success: updatedCount > 0,
        message: `Batch update: ${updatedCount} assets updated, ${failedCount} failed`,
        data: {
          updated: updatedCount,
          failed: failedCount,
          assets: updatedAssets
        }
      };
    } catch (error: any) {
      console.error('Error performing batch update:', error);
      return {
        success: false,
        message: `Failed to perform batch update: ${error.message || 'Unknown error'}`,
        code: 500,
        data: { updated: 0, failed: assetIds.length, assets: [] }
      };
    }
  }
  
  /**
   * Batch delete assets
   * @param assetIds Array of asset IDs to delete
   * @param userId User requesting the delete operation
   * @returns Result with success status and counts
   */
  async batchDeleteAssets(
    assetIds: string[],
    userId: string
  ): Promise<ServiceResult<{ deleted: number; failed: number; errors: Record<string, string> }>> {
    if (!assetIds.length) {
      return {
        success: false,
        message: 'No asset IDs provided',
        code: 400,
        data: { deleted: 0, failed: 0, errors: {} }
      };
    }
    
    try {
      // Track results
      let deletedCount = 0;
      let failedCount = 0;
      const errors: Record<string, string> = {};
      
      // Process each asset deletion separately to maintain proper security
      // and error handling for each asset
      for (const assetId of assetIds) {
        try {
          const result = await this.deleteAsset(assetId, userId);
          
          if (result.success) {
            deletedCount++;
          } else {
            failedCount++;
            errors[assetId] = result.message || 'Unknown error';
          }
        } catch (assetError: any) {
          failedCount++;
          errors[assetId] = assetError.message || 'Unknown error';
        }
      }
      
      return {
        success: deletedCount > 0,
        message: `Batch delete: ${deletedCount} assets deleted, ${failedCount} failed`,
        data: {
          deleted: deletedCount,
          failed: failedCount,
          errors
        }
      };
    } catch (error: any) {
      console.error('Error performing batch delete:', error);
      return {
        success: false,
        message: `Failed to perform batch delete: ${error.message || 'Unknown error'}`,
        code: 500,
        data: { deleted: 0, failed: assetIds.length, errors: {} }
      };
    }
  }
  
  /**
   * Helper for generating SQL to implement proper RLS policies for assets
   * This method generates SQL that can be run in the Supabase SQL editor
   * to implement production-ready Row Level Security policies
   */
  async generateRlsPolicySql(): Promise<string> {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // In development mode, provide a warning
    if (isDevelopment) {
      console.warn('Generating RLS policies for development mode - these are NOT secure for production');
    }
    
    // Get a timestamp for the policy name
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    
    // Generate policy SQL with explanatory comments
    const policySql = `-- AIrWAVE Asset Security Policies
-- Generated: ${new Date().toISOString()}
-- Environment: ${isDevelopment ? 'DEVELOPMENT (insecure)' : 'PRODUCTION'}

-- First, enable Row Level Security on the assets table
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS assets_select_policy ON assets;
DROP POLICY IF EXISTS assets_insert_policy ON assets;
DROP POLICY IF EXISTS assets_update_policy ON assets;
DROP POLICY IF EXISTS assets_delete_policy ON assets;

${isDevelopment ? 
  `-- DEVELOPMENT MODE POLICIES - NOT SECURE FOR PRODUCTION
-- These policies allow all operations for easier development
CREATE POLICY assets_select_policy_${timestamp} ON assets FOR SELECT USING (true);
CREATE POLICY assets_insert_policy_${timestamp} ON assets FOR INSERT WITH CHECK (true);
CREATE POLICY assets_update_policy_${timestamp} ON assets FOR UPDATE USING (true);
CREATE POLICY assets_delete_policy_${timestamp} ON assets FOR DELETE USING (true);`
  : 
  `-- PRODUCTION MODE POLICIES - SECURE FOR DEPLOYMENT
-- SELECT: Users can view assets they created or own
CREATE POLICY assets_select_policy_${timestamp} ON assets FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = owner_id
);

-- INSERT: Users can only insert assets they are assigned to
CREATE POLICY assets_insert_policy_${timestamp} ON assets FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- UPDATE: Users can only update assets they own
CREATE POLICY assets_update_policy_${timestamp} ON assets FOR UPDATE USING (
  auth.uid() = owner_id
);

-- DELETE: Only asset owners can delete their assets
CREATE POLICY assets_delete_policy_${timestamp} ON assets FOR DELETE USING (
  auth.uid() = owner_id
);`}

-- Additional role-based policies can be implemented here
-- For example, to allow admin access to all assets:
/*
CREATE POLICY assets_admin_policy_${timestamp} ON assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
*/

-- Organisation-level policies can be implemented here
-- For example, to allow users to access all assets within their organisation:
/*
CREATE POLICY assets_org_policy_${timestamp} ON assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.organisation_id = (
        SELECT organisation_id FROM assets WHERE id = assets.id
      )
    )
  );
*/
`;
    
    return policySql;
  }
  
  /**
   * Helper to transform database field names to API names
   */
  private getDbFieldName(apiFieldName: string): string {
    const fieldMap: Record<string, string> = {
      'name': 'name',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'usageCount': 'usage_count'
    };
    
    return fieldMap[apiFieldName] || apiFieldName;
  }
  
  /**
   * Transform asset from database format to API format
   * Handles the Supabase schema with nested metadata in the meta field
   */
  private transformAssetFromDb(dbAsset: any): Asset {
    // Extract metadata from the meta field if it exists
    const meta = dbAsset.meta || {};
    
    // Build the asset object with data from both top-level and meta fields
    return {
      id: dbAsset.id,
      name: dbAsset.name,
      type: dbAsset.type,
      description: meta.description || '',
      url: dbAsset.url,
      previewUrl: meta.previewUrl || '',
      thumbnailUrl: dbAsset.thumbnail_url || '',
      size: meta.size || 0,
      width: meta.width || null,
      height: meta.height || null,
      duration: meta.duration || null,
      tags: meta.tags || [],
      categories: meta.categories || [],
      isFavourite: meta.isFavourite || false,
      usageCount: meta.usageCount || 0,
      userId: dbAsset.user_id,
      ownerId: dbAsset.owner_id,
      createdAt: dbAsset.created_at,
      updatedAt: dbAsset.updated_at,
      metadata: {
        // Include any additional metadata not covered by specific fields
        ...(Object.keys(meta)
          .filter(key => ![
            'description', 'previewUrl', 'size', 'width', 'height', 'duration',
            'tags', 'categories', 'isFavourite', 'usageCount'
          ].includes(key))
          .reduce((obj, key) => ({
            ...obj,
            [key]: meta[key]
          }), {}))
      }
    };
  }
}

export const assetService = new AssetService();
