import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fsPromises from 'fs/promises'; // Import promise-based fs
import fs from 'fs'; // Import standard fs for sync methods
import { promisify } from 'util'; // Re-add promisify import
import ffmpeg from 'fluent-ffmpeg'; // Ensure ffmpeg types are imported
import sharp from 'sharp'; // Import sharp

// Import canonical types
import {
  Asset,
  DbAsset,
  AssetFilters,
  ServiceResult,
  AssetUploadOptions,
  ImageMetadata,
  VideoMetadata,
  AudioMetadata,
} from '../types/assetTypes';

// Added imports for standardized error handling
import { ApiError } from '@/utils/ApiError';
import { ErrorCode } from '@/types/errorTypes';

// Import AI service for asset analysis
import { assetAI } from './assetAI';
import { logger } from '@/utils/logger';

// Use fs/promises directly - no need for promisify
const { mkdir, readFile, unlink, stat, writeFile } = fsPromises;

/**
 * Service for managing assets
 */
class AssetService {
  private supabase: SupabaseClient;
  private readonly uploadsDir: string;
  private static instance: AssetService;
  private readonly logger = logger;

  // Make constructor private for singleton pattern
  private constructor() {
    // Initialize Supabase client
    // Ensure SUPABASE_URL and SUPABASE_KEY are in your environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Refactored: Use ApiError for configuration issues
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Server configuration error: Supabase URL and Key must be provided in environment variables'
      );
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Set uploads directory
    this.uploadsDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    // Ensure uploads directory exists (using standard fs for sync check)
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Initialize the uploads directory
   */
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
   * Transform database asset to application asset
   * This handles the conversion between DB column names and application properties
   * Ensures all required fields for UI compatibility are present
   */
  public transformAssetFromDb(dbAsset: DbAsset | Record<string, any>): Asset {
    // Basic validation - ensure essential fields exist
    if (!dbAsset || typeof dbAsset !== 'object' || !dbAsset.id || !dbAsset.name || !dbAsset.type) {
      console.error('Invalid or incomplete DbAsset object provided to transformAssetFromDb', dbAsset);
      // Refactored: Use ApiError for unexpected internal data issues
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Invalid internal data encountered during asset transformation.'
      );
    }

    // Extract metadata from the DB format (now uses 'metadata' field)
    const metadata = (dbAsset.metadata || {}) as Record<string, any>;

    // Normalize ownerId from potential user_id or ownerId in metadata for consistency
    // DbAsset now directly uses owner_id, so normalization focuses on that.
    const normalizedOwnerId = dbAsset.owner_id || metadata?.ownerId || '';

    // Map DbAsset (snake_case) to Asset (camelCase, extends SharedAsset)
    const appAsset: Asset = {
      // Core fields from SharedAsset (defined in ../types/shared.ts)
      id: dbAsset.id,
      name: dbAsset.name || 'Untitled Asset', // Provide default for name
      type: dbAsset.type || this.determineAssetType(dbAsset.mime_type), // Ensure type is set
      url: dbAsset.file_path || '', // Map file_path
      thumbnailUrl: dbAsset.thumbnail_path || '', // Map thumbnail_path
      description: ('description' in dbAsset && dbAsset.description) ? dbAsset.description : (metadata.description || ''), // From metadata
      tags: dbAsset.tags || metadata.tags || [], // Prefer direct column, fallback to metadata
      clientId: dbAsset.client_id || '', // Direct mapping
      isFavourite: dbAsset.is_favourite || false, // Map is_favourite
      size: dbAsset.size || 0,
      width: dbAsset.width,
      height: dbAsset.height,
      duration: dbAsset.duration,
      // Ensure dates are converted to ISO strings for the Asset interface
      createdAt: dbAsset.created_at ? new Date(dbAsset.created_at).toISOString() : '',
      updatedAt: dbAsset.updated_at ? new Date(dbAsset.updated_at).toISOString() : '',
      ownerId: normalizedOwnerId, // Use normalized camelCase ownerId (derived above)
      status: dbAsset.status || 'unknown', // Default status if missing
      metadata: metadata, // Assign the whole metadata object
      // Additional fields specific to the Asset interface (defined in ../types/assetTypes.ts)
      processingStatus: metadata.processingStatus || 'complete', // Default if not in metadata
      categories: dbAsset.categories || (metadata as Record<string, any>)?.categories || [], // Prefer direct column, safe access metadata
      alternativeText: dbAsset.alternative_text || metadata.alternativeText || '', // Prefer direct column
      // Ensure expiresAt is a string for the Asset interface
      expiresAt: dbAsset.expires_at ? new Date(dbAsset.expires_at).toISOString() : '',
      // Derive fileExtension from file_path
      fileExtension: dbAsset.file_path ? path.extname(dbAsset.file_path).toLowerCase().substring(1) : '',
      clientSlug: `client-${dbAsset.client_id}`, 
    };

    return appAsset;
  }

  /**
   * Helper method to get MIME type from asset type
   */
  private getMimeTypeFromType(type: string): string {
    switch(type) {
      case 'image': return 'image/png';
      case 'video': return 'video/mp4';
      case 'audio': return 'audio/mp3';
      case 'document': return 'application/pdf';
      default: return 'application/octet-stream';
    }
  }

  /**
   * Helper method to look up a client ID from a slug
   */
  private async lookupClientId(slug: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .select('id')
        .eq('slug', slug.toLowerCase())
        .single();

      if (error) {
        console.error(`Error looking up client ID for slug ${slug}:`, error);
        return null;
      }

      return data?.id || null;
    } catch (error: any) {
      console.error(`Error looking up client ID for slug ${slug}:`, error.message);
      return null;
    }
  }

  /**
   * Upload a new asset
   * @param file The uploaded file
   * @param userId The ID of the user uploading the asset
   * @param assetData Additional metadata for the asset
   */
  async uploadAsset(
    file: Express.Multer.File,
    userId: string,
    assetData: AssetUploadOptions
  ): Promise<ServiceResult<Asset>> {
    try {
      // 1. Validate input
      if (!file || !userId || !assetData.clientId) {
        console.error('Upload validation failed:', { file: !!file, userId, clientId: assetData.clientId });
        return { success: false, message: 'Missing required file, userId, or clientId for upload.' };
      }

      // 2. Determine asset type and process file (metadata, thumbnail)
      const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
      const mimeType = file.mimetype;
      const assetType = this.determineAssetType(mimeType);
      const assetId = uuidv4();
      const uniqueFilename = `${assetId}.${fileExtension}`;
      const clientUploadsPath = path.join(this.uploadsDir, assetData.clientId); // Use instance var
      const relativeFilePath = path.join(assetData.clientId, uniqueFilename); // Relative path for DB/URL
      const absoluteFilePath = path.join(this.uploadsDir, relativeFilePath);
      let relativeThumbnailPath: string | undefined = undefined;
      let fileMetadata: Record<string, any> = {}; // Metadata extracted from file

      // Ensure client directory exists
      await mkdir(clientUploadsPath, { recursive: true });
      // Save the original file
      await writeFile(absoluteFilePath, file.buffer); // Use direct promise-based writeFile

      // Process based on type
      const processingPromises: Promise<void>[] = [];
      try {
        if (assetType === 'image') {
          processingPromises.push((async () => {
            const imageMetadata = await sharp(absoluteFilePath).metadata();
            fileMetadata.width = imageMetadata.width;
            fileMetadata.height = imageMetadata.height;
            fileMetadata.format = imageMetadata.format;
            fileMetadata.size = file.size; // From multer file object

            // Generate thumbnail
            const thumbnailFilename = `${assetId}_thumb.jpg`;
            const absoluteThumbnailPath = path.join(clientUploadsPath, thumbnailFilename);
            relativeThumbnailPath = path.join(assetData.clientId, thumbnailFilename); // Relative path for DB/URL
            await sharp(absoluteFilePath)
              .resize(200)
              .jpeg({ quality: 80 })
              .toFile(absoluteThumbnailPath);
          })());
        } else if (assetType === 'video') {
          processingPromises.push((async () => {
            const videoMetadata = await this.getVideoMetadata(absoluteFilePath);
            fileMetadata = { ...fileMetadata, ...videoMetadata }; // Merge video metadata
            fileMetadata.size = file.size; // Ensure size is set

            // Generate thumbnail from video
            const thumbnailFilename = `${assetId}_thumb.jpg`;
            const absoluteThumbnailPath = path.join(clientUploadsPath, thumbnailFilename);
            relativeThumbnailPath = path.join(assetData.clientId, thumbnailFilename);
            await this.generateVideoThumbnail(absoluteFilePath, absoluteThumbnailPath);
          })());
        }

        // Add simple size metadata for other types if not already set by specific processing
        if (!fileMetadata.size) {
          fileMetadata.size = file.size;
        }

        // Wait for all processing (metadata, thumbnail) to complete
        await Promise.all(processingPromises);

        // 3. Construct DbAsset object (using imported DbAsset type with snake_case)
        const finalMetadata = {
          // Start with file-extracted metadata
          ...fileMetadata,
          // Add provided metadata from options (takes precedence if keys overlap)
          ...(assetData.metadata || {}),
          // Ensure some standard fields are present from options
          description: assetData.description || fileMetadata.description || '',
          originalName: file.originalname, // Always store original name
        };

        const dbAssetPayload: Omit<DbAsset, 'created_at' | 'updated_at'> = {
          id: assetId,
          name: assetData.name || path.parse(file.originalname).name, // Use provided name or base filename
          type: assetType, // corrected: align with DbAsset type
          mime_type: mimeType, // corrected: align with DbAsset type
          file_path: relativeFilePath, // corrected: align with DbAsset type
          thumbnail_path: relativeThumbnailPath, // corrected: align with DbAsset type
          size: fileMetadata.size || 0, // corrected: align with DbAsset type
          width: fileMetadata.width, // corrected: align with DbAsset type
          height: fileMetadata.height, // corrected: align with DbAsset type
          duration: fileMetadata.duration, // corrected: align with DbAsset type
          owner_id: userId, // Assume uploader is owner - corrected: Use owner_id as per DbAsset
          client_id: assetData.clientId, // FK to clients table
          tags: assetData.tags || [], // Use tags from options
          categories: assetData.categories || [], // Use categories from options
          is_favourite: assetData.isFavourite || false,
          status: 'active', // Initial status
          alternative_text: assetData.alternativeText || '',
          metadata: finalMetadata, // Combined metadata
          expires_at: assetData.expiresAt, // Assign Date object or undefined directly, matching DbAsset type
        };

        // 4. Save to database using the initialized Supabase client
        try {
          const { data, error } = await this.supabase
            .from('assets')
            .insert(dbAssetPayload)
            .select()
            .single();

          if (error) {
            console.error(`Supabase insert error for asset ${assetId}:`, error);
            // Attempt cleanup: delete the saved file
            try {
              fs.unlinkSync(absoluteFilePath); // Use synchronous unlink
              if (relativeThumbnailPath) {
                fs.unlinkSync(path.join(this.uploadsDir, relativeThumbnailPath)); // Use synchronous unlink
              }
            } catch (cleanupError) {
              console.error(`Failed to cleanup files for failed upload ${assetId}:`, cleanupError);
            }
            return { success: false, message: `Database insert failed: ${error.message}`, error };
          }

          if (!data) {
            console.error(`Supabase insert error: No data returned for asset ${assetId}`);
            // Attempt cleanup
            try {
              fs.unlinkSync(absoluteFilePath); // Use synchronous unlink
              if (relativeThumbnailPath) {
                fs.unlinkSync(path.join(this.uploadsDir, relativeThumbnailPath)); // Use synchronous unlink
              }
            } catch (cleanupError) {
              console.error(`Failed to cleanup files for failed upload ${assetId}:`, cleanupError);
            }
            return { success: false, message: 'Database insert failed: No data returned.' };
          }

          // 5. Transform DbAsset to Asset for the response
          const createdAsset = this.transformAssetFromDb(data as DbAsset); // data is already DbAsset

          // Use ServiceResult<Asset> structure
          return { success: true, data: createdAsset, message: 'Asset uploaded and processed successfully.' };

        } catch (dbError: any) {
          console.error(`Unexpected database operation error for asset ${assetId}:`, dbError);
          // Attempt cleanup
          try {
            fs.unlinkSync(absoluteFilePath); // Use synchronous unlink
            if (relativeThumbnailPath) {
              fs.unlinkSync(path.join(this.uploadsDir, relativeThumbnailPath)); // Use synchronous unlink
            }
          } catch (cleanupError) {
            console.error(`Failed to cleanup files for failed upload ${assetId}:`, cleanupError);
          }
          return { success: false, message: `Database operation failed: ${dbError.message || 'Unknown error'}`, error: dbError };
        }
      } catch (processError: unknown) {
        console.error('Error processing file:', processError);
        // Attempt cleanup
        try {
          fs.unlinkSync(absoluteFilePath); // Use synchronous unlink
          if (relativeThumbnailPath) {
            fs.unlinkSync(path.join(this.uploadsDir, relativeThumbnailPath)); // Use synchronous unlink
          }
        } catch (cleanupError) {
          console.error(`Failed to cleanup files for failed upload ${assetId}:`, cleanupError);
        }
        return { success: false, message: `Failed to process file: ${processError instanceof Error ? processError.message : 'Unknown error'}`, error: processError };
      }
    } catch (error: any) {
      console.error('Unhandled error during asset upload:', error);
      return {
        success: false,
        message: `Upload failed: ${error.message || 'Unknown error'}`,
        error: error,
      };
    }
  }

  /**
   * Determine the asset type based on MIME type
   */
  determineAssetType(mimetype: string): string {
    if (mimetype.startsWith('image/')) {
      return 'image';
    } else if (mimetype.startsWith('video/')) {
      return 'video';
    } else if (mimetype.startsWith('audio/')) {
      return 'audio';
    } else if (mimetype.includes('pdf')) {
      return 'document';
    } else if (
        mimetype.includes('text/') ||
        mimetype.includes('application/json') ||
        mimetype.includes('xml')
      ) {
        return 'copy';
      } else {
        return 'other';
      }
    }

  /**
   * Helper method to get video metadata
   */
  private async getVideoMetadata(filePath: string): Promise<Record<string, any>> {
    const ffprobeAsync = promisify(ffmpeg.ffprobe);
    try {
      // Pass the filePath to ffprobe
      const metadata = await ffprobeAsync(filePath);

      // Extract relevant data (example: dimensions, duration, codec)
      const videoStream = metadata.streams.find(
        // Added explicit type for stream parameter 's' with type predicate
        (s: any): s is { codec_type: 'video' } => s.codec_type === 'video'
      );
      const format = metadata.format;

      // Return relevant format data, adjust as needed
      return {
        duration: format.duration,
        size: format.size,
        bit_rate: format.bit_rate,
        format_name: format.format_name,
        width: videoStream?.width,
        height: videoStream?.height,
        codec: videoStream?.codec_name,
        // Add other stream info if needed
      };
    } catch (err: unknown) {
      const error = err as Error & { stderr?: string }; // Type assertion for potential stderr
      console.error(`Error probing video ${filePath}:`, error.message);
      if (error.stderr) {
        console.error('FFprobe stderr:', error.stderr);
      }
      // Re-throw a more specific error or return a default object
      throw new ApiError(
        ErrorCode.OPERATION_FAILED,
        `Failed to extract video metadata for ${path.basename(filePath)}`
      );
    }
  }

  /**
   * Helper method to generate video thumbnail
   */
  private async generateVideoThumbnail(videoPath: string, outputPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .on('end', () => {
          resolve();
        })
        .on('error', (err: Error) => {
          console.error(`Error generating thumbnail for ${videoPath}:`, err.message);
          reject(new ApiError(
            ErrorCode.OPERATION_FAILED,
            `Failed to generate video thumbnail: ${err.message}`
          ));
        })
        .screenshots({
          count: 1,
          folder: path.dirname(outputPath),
          filename: path.basename(outputPath),
          timemarks: ['1'], // Capture frame at 1 second, adjust as needed
          size: `${200}x?`, // Keep aspect ratio
        });
    });
  }

  /**
   * Process image assets - generate thumbnails and extract metadata
   * Enhanced with AI-powered content analysis
   */
  async processImageAsset(asset: Asset, filePath: string): Promise<void> {
    try {
      this.logger.info(`Processing image asset: ${asset.name}`);
      
      // Extract metadata using sharp
      const metadata = await sharp(filePath).metadata();
      
      // Update asset with metadata
      asset.width = metadata.width;
      asset.height = metadata.height;
      
      // Generate thumbnail
      const assetDir = path.dirname(filePath);
      const thumbnailFileName = 'thumbnail.jpg';
      const thumbnailPath = path.join(assetDir, thumbnailFileName);
      
      await sharp(filePath)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      // Update asset with thumbnail URL
      asset.thumbnailUrl = `${asset.url.substring(0, asset.url.lastIndexOf('/'))}/${thumbnailFileName}`;
      
      // Use AI to analyse the image content
      try {
        this.logger.info(`Starting AI analysis for image: ${asset.name}`);
        const aiAnalysis = await assetAI.analyseImage(filePath);
        
        // Add AI-generated tags and categories
        if (aiAnalysis.tags && aiAnalysis.tags.length > 0) {
          // Combine existing tags with AI tags, ensuring uniqueness
          const existingTags = asset.tags || [];
          asset.aiTags = aiAnalysis.tags;
          asset.tags = [...new Set([...existingTags, ...aiAnalysis.tags])];
        }
        
        if (aiAnalysis.categories && aiAnalysis.categories.length > 0) {
          // Combine existing categories with AI categories, ensuring uniqueness
          const existingCategories = asset.categories || [];
          asset.categories = [...new Set([...existingCategories, ...aiAnalysis.categories])];
        }
        
        // Add content description
        asset.contentDescription = aiAnalysis.contentDescription;
        
        // Add dominant colours
        asset.dominantColours = aiAnalysis.dominantColours;
        
        // Add safety labels
        asset.safetyLabels = aiAnalysis.safetyLabels;
        
        this.logger.info(`AI analysis complete for image: ${asset.name}`);
      } catch (aiError) {
        this.logger.error(`AI image analysis error: ${(aiError as Error).message}`);
        // Continue without AI analysis if it fails
      }
    } catch (error: any) {
      this.logger.error(`Error processing image asset: ${error.message}`);
      // Continue with the upload even if image processing fails
    }
  }

  /**
   * Process video assets - generate thumbnails and extract metadata
   * Enhanced with AI-powered content analysis
   */
  async processVideoAsset(asset: Asset, filePath: string): Promise<void> {
    try {
      this.logger.info(`Processing video asset: ${asset.name}`);
      
      // Get video directory
      const assetDir = path.dirname(filePath);
      const thumbnailFileName = 'thumbnail.jpg';
      const thumbnailPath = path.join(assetDir, thumbnailFileName);
      
      // Create additional preview frames for AI analysis
      const previewsDir = path.join(assetDir, 'previews');
      if (!fs.existsSync(previewsDir)) {
        fs.mkdirSync(previewsDir, { recursive: true });
      }
      
      // Extract a thumbnail from the video at the 1 second mark
      return new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .on('error', (err: Error) => {
            this.logger.error('Error generating video thumbnail:', err);
            resolve(); // Continue even if thumbnail generation fails
          })
          .on('end', async () => {
            // Update asset with thumbnail URL
            asset.thumbnailUrl = `${asset.url.substring(0, asset.url.lastIndexOf('/'))}/${thumbnailFileName}`;
            
            // Try to get video metadata using a more structured approach
            try {
              const { data: metadata, error } = await this.getVideoMetadataDetails(filePath);
              
              if (error) {
                this.logger.error('Error extracting video metadata:', error);
              } else if (metadata) {
                // Update basic asset properties
                asset.width = metadata.width;
                asset.height = metadata.height;
                asset.duration = metadata.duration;
                
                // Add extended metadata
                const extendedMetadata = {
                  codec: metadata.codec,
                  frameRate: metadata.frameRate,
                  bitrate: metadata.bitrate,
                  aspectRatio: metadata.aspectRatio,
                  audioChannels: metadata.audioChannels,
                  audioCodec: metadata.audioCodec
                };
                
                // Store in asset metadata
                asset.metadata = { ...asset.metadata, ...extendedMetadata };
              }
              
              // Use AI to analyse the thumbnail for video content understanding
              try {
                if (fs.existsSync(thumbnailPath)) {
                  this.logger.info(`Starting AI analysis of video thumbnail for: ${asset.name}`);
                  const aiAnalysis = await assetAI.analyseImage(thumbnailPath);
                  
                  // Add AI-generated tags and categories
                  if (aiAnalysis.tags && aiAnalysis.tags.length > 0) {
                    // Combine existing tags with AI tags, ensuring uniqueness
                    const existingTags = asset.tags || [];
                    asset.aiTags = aiAnalysis.tags;
                    // Add video-specific tags
                    asset.tags = [...new Set([...existingTags, ...aiAnalysis.tags, 'video'])];
                  }
                  
                  if (aiAnalysis.categories && aiAnalysis.categories.length > 0) {
                    // Combine existing categories with AI categories, ensuring uniqueness
                    const existingCategories = asset.categories || [];
                    asset.categories = [...new Set([...existingCategories, ...aiAnalysis.categories, 'videos'])];
                  }
                  
                  // Add content description with video context
                  asset.contentDescription = `Video ${aiAnalysis.contentDescription}`;
                  
                  // Add dominant colours from thumbnail
                  asset.dominantColours = aiAnalysis.dominantColours;
                  
                  // Add safety labels
                  asset.safetyLabels = aiAnalysis.safetyLabels;
                  
                  this.logger.info(`AI analysis complete for video: ${asset.name}`);
                }
              } catch (aiError) {
                this.logger.error(`AI video analysis error: ${(aiError as Error).message}`);
                // Continue without AI analysis if it fails
              }
            } catch (metadataError) {
              this.logger.error('Error processing video metadata:', metadataError);
            }
            
            resolve();
          })
          .screenshots({
            count: 1,
            folder: assetDir,
            filename: thumbnailFileName,
            timemarks: ['1']
          });
      });
    } catch (error: any) {
      this.logger.error(`Error processing video asset: ${error.message}`);
      // Continue with the upload even if video processing fails
    }
  }
  
  /**
   * Extract detailed video metadata
   */
  private async getVideoMetadataDetails(filePath: string): Promise<{
    data?: {
      width?: number;
      height?: number;
      duration?: number;
      codec?: string;
      frameRate?: number;
      bitrate?: number;
      aspectRatio?: string;
      audioChannels?: number;
      audioCodec?: string;
    };
    error?: Error;
  }> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
        if (err) {
          resolve({ error: err });
          return;
        }
        
        try {
          const result: any = {};
          
          if (metadata && metadata.format) {
            // Convert duration from seconds to milliseconds
            result.duration = metadata.format.duration ? 
              Math.round(parseFloat(metadata.format.duration) * 1000) : undefined;
            result.bitrate = metadata.format.bit_rate ? 
              parseInt(metadata.format.bit_rate, 10) : undefined;
          }
          
          if (metadata && metadata.streams) {
            const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
            if (videoStream) {
              result.width = videoStream.width;
              result.height = videoStream.height;
              result.codec = videoStream.codec_name;
              result.aspectRatio = videoStream.display_aspect_ratio || 
                (videoStream.width && videoStream.height ? `${videoStream.width}:${videoStream.height}` : undefined);
              
              // Calculate frame rate
              if (videoStream.r_frame_rate) {
                const fpsRatio = videoStream.r_frame_rate.split('/');
                if (fpsRatio.length === 2) {
                  const num = parseInt(fpsRatio[0], 10);
                  const den = parseInt(fpsRatio[1], 10);
                  if (!isNaN(num) && !isNaN(den) && den !== 0) {
                    result.frameRate = Math.round((num / den) * 100) / 100; // Round to 2 decimal places
                  }
                }
              }
            }
            
            const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
            if (audioStream) {
              result.audioCodec = audioStream.codec_name;
              result.audioChannels = audioStream.channels;
            }
          }
          
          resolve({ data: result });
        } catch (error) {
          resolve({ error: error as Error });
        }
      });
    });
  }

  /**
   * Process audio assets - generate waveform images and extract metadata
   * Enhanced with AI-powered content analysis
   */
  async processAudioAsset(asset: Asset, filePath: string): Promise<void> {
    try {
      this.logger.info(`Processing audio asset: ${asset.name}`);
      
      // Get asset directory for storing additional files
      const assetDir = path.dirname(filePath);
      const waveformFileName = 'waveform.png';
      const waveformPath = path.join(assetDir, waveformFileName);
      
      // Extract audio metadata and generate waveform
      return new Promise<void>((resolve, reject) => {
        // First get the audio metadata
        ffmpeg.ffprobe(filePath, async (err: any, metadata: any) => {
          if (err) {
            this.logger.error('Error getting audio metadata:', err);
            resolve();
            return;
          }
          
          try {
            // Extract basic metadata
            if (metadata && metadata.format) {
              // Convert duration from seconds to milliseconds
              if (metadata.format.duration) {
                asset.duration = Math.round(parseFloat(metadata.format.duration) * 1000);
              }
              
              // Extract additional audio metadata
              const audioMetadata: Record<string, any> = {};
              
              if (metadata.format.bit_rate) {
                audioMetadata.bitrate = parseInt(metadata.format.bit_rate, 10);
              }
              
              if (metadata.format.tags) {
                // Extract any available tags from audio file (e.g., ID3 tags)
                if (metadata.format.tags.title) audioMetadata.title = metadata.format.tags.title;
                if (metadata.format.tags.artist) audioMetadata.artist = metadata.format.tags.artist;
                if (metadata.format.tags.album) audioMetadata.album = metadata.format.tags.album;
                if (metadata.format.tags.genre) audioMetadata.genre = metadata.format.tags.genre;
                if (metadata.format.tags.date) audioMetadata.year = metadata.format.tags.date;
              }
              
              // Extract details from the audio stream
              const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
              if (audioStream) {
                if (audioStream.codec_name) audioMetadata.codec = audioStream.codec_name;
                if (audioStream.sample_rate) audioMetadata.sampleRate = parseInt(audioStream.sample_rate, 10);
                if (audioStream.channels) audioMetadata.channels = audioStream.channels;
                if (audioStream.channel_layout) audioMetadata.channelLayout = audioStream.channel_layout;
              }
              
              // Store metadata in asset
              asset.metadata = { ...asset.metadata, ...audioMetadata };
              
              // Add to asset tags based on available metadata
              const metadataTags: string[] = [];
              if (audioMetadata.genre) metadataTags.push(audioMetadata.genre.toLowerCase());
              if (audioMetadata.channels === 1) metadataTags.push('mono');
              if (audioMetadata.channels === 2) metadataTags.push('stereo');
              
              // Add audio-related tags
              const existingTags = asset.tags || [];
              asset.tags = [...new Set([...existingTags, ...metadataTags, 'audio'])];
              
              // Try to use AI to analyse the audio content
              try {
                this.logger.info(`Starting AI analysis for audio: ${asset.name}`);
                const aiAnalysis = await assetAI.analyseAudio(filePath);
                
                // Add AI-generated tags and attributes
                if (aiAnalysis.tags && aiAnalysis.tags.length > 0) {
                  asset.aiTags = aiAnalysis.tags;
                  // Combine with existing tags, ensuring uniqueness
                  asset.tags = [...new Set([...asset.tags, ...aiAnalysis.tags])];
                }
                
                if (aiAnalysis.categories && aiAnalysis.categories.length > 0) {
                  // Add categories, ensuring uniqueness
                  const existingCategories = asset.categories || [];
                  asset.categories = [...new Set([...existingCategories, ...aiAnalysis.categories, 'audio'])];
                }
                
                // Create a content description from audio metadata or transcription
                const description = aiAnalysis.transcription || 
                  `Audio file${audioMetadata.title ? ` titled "${audioMetadata.title}"` : ''}`;
                asset.contentDescription = description;
                
                this.logger.info(`AI analysis complete for audio: ${asset.name}`);
              } catch (aiError) {
                this.logger.error(`AI audio analysis error: ${(aiError as Error).message}`);
                // Set basic content description from metadata if AI fails
                if (audioMetadata.title || audioMetadata.artist) {
                  asset.contentDescription = [
                    audioMetadata.title ? `"${audioMetadata.title}"` : 'Untitled',
                    audioMetadata.artist ? `by ${audioMetadata.artist}` : ''
                  ].filter(Boolean).join(' ');
                }
              }
            }
          } catch (metadataError) {
            this.logger.error('Error parsing audio metadata:', metadataError);
          }
          
          // Attempt to generate waveform visualization
          try {
            // Generate waveform image as the thumbnail using ffmpeg
            ffmpeg(filePath)
              .audioFilters('showwavespic=s=600x120:colors=#2198f3')
              .outputOptions('-frames:v 1')
              .saveToFile(waveformPath)
              .on('end', () => {
                // Set waveform as thumbnail
                asset.thumbnailUrl = `${asset.url.substring(0, asset.url.lastIndexOf('/'))}/${waveformFileName}`;
                this.logger.info(`Generated waveform for audio: ${asset.name}`);
                resolve();
              })
              .on('error', (waveformErr: Error) => {
                this.logger.error(`Error generating waveform: ${waveformErr.message}`);
                resolve(); // Continue despite the error
              });
          } catch (waveformError) {
            this.logger.error(`Failed to generate waveform: ${(waveformError as Error).message}`);
            resolve(); // Continue despite the error
          }
        });
      });
    } catch (error: any) {
      this.logger.error(`Error processing audio asset: ${error.message}`);
      // Continue with the upload even if audio processing fails
    }
  }

  /**
   * Get assets with filters
   * @param filters Filters to apply when retrieving assets
   */
  async getAssets(filters: AssetFilters = {}): Promise<{assets: Asset[], total: number}> {
    try {
      this.logger.info('Asset fetch initiated with filters:', JSON.stringify(filters, null, 2));
      
      // Default pagination values
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      
      // First, get the count for pagination
      let countQuery = this.supabase
        .from('assets')
        .select('id', { count: 'exact' });
      
      // Apply filters to count query
      countQuery = this.applyFiltersToQuery(countQuery, filters);
      
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        this.logger.error('Error counting assets:', countError);
        return { assets: [], total: 0 };
      }
      
      // Then, get the paginated data
      let dataQuery = this.supabase
        .from('assets')
        .select('*');
      
      // Apply the same filters to data query
      dataQuery = this.applyFiltersToQuery(dataQuery, filters);
      
      // Add pagination
      dataQuery = dataQuery
        .limit(limit)
        .range(offset, offset + limit - 1); // Use range instead of offset for proper pagination
      
      // Apply sorting
      if (filters.sortBy) {
        // Convert camelCase sortBy to snake_case for database
        let dbSortField: string = filters.sortBy;
        // Map client-side field names to actual database column names
        if (dbSortField === 'createdAt') dbSortField = 'created_at';
        if (dbSortField === 'updatedAt') dbSortField = 'updated_at';
        if (dbSortField === 'date') dbSortField = 'created_at'; // Map 'date' to 'created_at'
        if (dbSortField === 'usageCount') dbSortField = 'metadata->>usageCount';
        if (dbSortField === 'name') dbSortField = 'name';
        
        // Support sorting by AI-generated metrics
        if (dbSortField === 'contentRelevance') dbSortField = 'metadata->>contentRelevance';
        if (dbSortField === 'engagementScore') dbSortField = 'metadata->>engagementScore';
        
        const sortDirection = filters.sortDirection || 'desc';
        dataQuery = dataQuery.order(dbSortField, { ascending: sortDirection === 'asc' });
      } else {
        // Default sorting by most recently created
        dataQuery = dataQuery.order('created_at', { ascending: false });
      }
      
      // Apply additional filters for content-based searches
      if (filters.contentSearch) {
        // This is a natural language search against content descriptions
        this.logger.info(`Performing content-based search: ${filters.contentSearch}`);
        // This would typically use a vector search or full-text search
        // For now, we'll use a simple LIKE query on the content description
        const contentSearchTerm = `%${filters.contentSearch}%`;
        dataQuery = dataQuery.ilike('content_description', contentSearchTerm);
      }
      
      const { data, error: dataError } = await dataQuery;
      
      if (dataError) {
        this.logger.error('Error fetching assets:', dataError);
        return { assets: [], total: 0 };
      }
      
      // Transform DB assets to application assets
      const assets = data.map(item => this.transformAssetFromDb(item as DbAsset));
      
      // Apply any additional client-side filtering for advanced AI features
      // that might not be directly queryable in the database
      let filteredAssets = assets;
      
      // Client-side colour filtering (if dominantColours is being used)
      if (filters.colourFilter) {
        this.logger.info(`Applying colour filter: ${filters.colourFilter}`);
        filteredAssets = filteredAssets.filter(asset => {
          // Check if asset has dominant colours and if any of them is close to the requested colour
          return asset.dominantColours && 
                 asset.dominantColours.some(colour => 
                   this.areColoursRelated(colour, filters.colourFilter!));
        });
      }
      
      return {
        assets: filteredAssets,
        total: filters.colourFilter ? filteredAssets.length : (count || 0)
      };
    } catch (error: any) {
      this.logger.error('Error in getAssets:', error);
      return { assets: [], total: 0 };
    }
  }
  
  // Methods for colour analysis are now implemented using the enhanced versions below

  /**
   * Helper method to apply filters to a Supabase query
   * Enhanced to support AI-generated metadata filters
   */
  private applyFiltersToQuery(query: any, filters: AssetFilters): any { // `any` for query builder type flexibility
    // Client Filter (crucial for multi-tenancy)
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    
    // Owner Filter
    if (filters.ownerId) {
      query = query.eq('owner_id', filters.ownerId);
    }
    
    // Type Filter
    if (filters.type && filters.type.length > 0) {
      query = query.in('type', filters.type);
    }
    
    // Tag Filter (array contains)
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    
    // AI Tag Filter - specifically search in AI-generated tags
    if (filters.aiTags && filters.aiTags.length > 0) {
      query = query.contains('ai_tags', filters.aiTags);
    }
    
    // Category Filter (array contains)
    if (filters.categories && filters.categories.length > 0) {
      query = query.contains('categories', filters.categories);
    }
    
    // Favourites Filter
    if (filters.favourite) {
      query = query.eq('is_favourite', true);
    }
    
    // Search Term Filter (searches name, description, and content description)
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      // Enhanced to search in AI-generated content description as well
      query = query.or(`name.ilike.${searchTerm},content_description.ilike.${searchTerm},metadata->>description.ilike.${searchTerm}`);
      
      // Additionally, if the search term might be a concept rather than exact text,
      // we try to match against AI-generated tags as well
      if (filters.includeConceptSearch) {
        // This would be more sophisticated in production with proper vector search
        query = query.or(`ai_tags.cs.{${filters.search}}`);
      }
    }
    
    // Date Range Filter
    if (filters.startDate) {
      query = query.gte('created_at', new Date(filters.startDate).toISOString());
    }
    if (filters.endDate) {
      query = query.lte('created_at', new Date(filters.endDate).toISOString());
    }
    
    // Status Filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    // Safety Level Filter
    if (filters.safetyLevel) {
      // Filter assets based on their safety labels
      // Assuming safety labels are stored in the database
      switch (filters.safetyLevel) {
        case 'all':
          // No filter, show all content
          break;
        case 'moderate':
          // Filter out content with high adult or violence scores
          query = query.lt('safety_adult', 0.7);
          query = query.lt('safety_violence', 0.7);
          break;
        case 'strict':
          // Filter out content with any significant adult, violence, or racy content
          query = query.lt('safety_adult', 0.3);
          query = query.lt('safety_violence', 0.3);
          query = query.lt('safety_racy', 0.5);
          break;
      }
    }
    
    // Engagement Score Filter - filter for content with high engagement potential
    if (filters.minEngagementScore) {
      query = query.gte('engagement_score', filters.minEngagementScore);
    }
    
    // Content Relevance Filter - for targeting specific concepts or subjects
    if (filters.contentRelevance && filters.contentRelevance.topic) {
      const relevanceTopic = filters.contentRelevance.topic;
      const relevanceThreshold = filters.contentRelevance.threshold || 0.6; // Default threshold
      
      // This would be implemented using vector similarity in production
      // For now, we'll use a simplified approach with tags
      query = query.contains('ai_tags', [relevanceTopic]);
    }
    
    return query;
  }

  /**
   * Find similar assets based on AI metadata
   * @param assetId ID of the reference asset
   * @param options Options for similarity search
   */
  async findSimilarAssets(assetId: string, options: {
    limit?: number;
    clientId?: string;
    includeSameType?: boolean;
    similarityThreshold?: number;
  } = {}): Promise<{assets: Asset[], success: boolean, message?: string}> {
    try {
      // Get the reference asset first
      const { asset: referenceAsset, success } = await this.getAssetById(assetId);
      
      if (!success || !referenceAsset) {
        return {
          assets: [],
          success: false,
          message: 'Reference asset not found'
        };
      }
      
      // Default options
      const limit = options.limit || 10;
      const includeSameType = options.includeSameType !== false; // Default to true
      
      // Build filters based on the reference asset's AI-generated metadata
      const filters: AssetFilters = {
        clientId: options.clientId || referenceAsset.clientId,
        limit: limit,
      };
      
      // If AI tags exist, use them for similarity matching
      if (referenceAsset.aiTags && referenceAsset.aiTags.length > 0) {
        // Take the top 3 AI tags for more relevant results
        filters.aiTags = referenceAsset.aiTags.slice(0, 3);
      }
      
      // For visual assets, use dominant colours for visual similarity
      if (
        (referenceAsset.type === 'image' || referenceAsset.type === 'video') &&
        referenceAsset.dominantColours &&
        referenceAsset.dominantColours.length > 0
      ) {
        // Use the primary dominant colour
        filters.colourFilter = referenceAsset.dominantColours[0];
      }
      
      // Filter by same type if requested
      if (includeSameType && referenceAsset.type) {
        filters.type = referenceAsset.type;
      }
      
      // If there's a content description, use it for content search
      if (referenceAsset.contentDescription) {
        // Extract key terms from content description for more specific matching
        const keyTerms = this.extractKeyTerms(referenceAsset.contentDescription);
        if (keyTerms.length > 0) {
          filters.contentSearch = keyTerms.join(' ');
        }
      }
      
      // Exclude the reference asset itself
      const { assets } = await this.getAssets(filters);
      const filteredAssets = assets.filter(asset => asset.id !== assetId);
      
      // Rank assets by similarity if we have sufficient metadata
      if (referenceAsset.aiTags && referenceAsset.aiTags.length > 0) {
        const rankedAssets = this.rankAssetsBySimilarity(filteredAssets, referenceAsset);
        return {
          assets: rankedAssets,
          success: true,
          message: `Found ${rankedAssets.length} similar assets`
        };
      }
      
      return {
        assets: filteredAssets,
        success: true,
        message: `Found ${filteredAssets.length} similar assets`
      };
    } catch (error: any) {
      this.logger.error('Error finding similar assets:', error);
      return {
        assets: [],
        success: false,
        message: `Error finding similar assets: ${error.message}`
      };
    }
  }
  
  /**
   * Extract key terms from a content description for better similarity matching
   * @param description The content description to extract terms from
   */
  private extractKeyTerms(description: string): string[] {
    if (!description) return [];
    
    // Remove common stop words and split into words
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of'];
    const words = description.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove non-alphanumeric characters
      .split(/\s+/) // Split by whitespace
      .filter(word => word.length > 2 && !stopWords.includes(word)); // Remove stop words and short words
    
    // Count word frequency
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Sort by frequency and take the top 5 most frequent words
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }
  
  /**
   * Rank assets by similarity to a reference asset
   * @param assets Assets to rank
   * @param referenceAsset Reference asset for comparison
   */
  private rankAssetsBySimilarity(assets: Asset[], referenceAsset: Asset): Asset[] {
    return assets
      .map(asset => {
        const similarityScore = this.calculateSimilarityScore(asset, referenceAsset);
        return { ...asset, similarityScore };
      })
      .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
  }
  
  /**
   * Calculate a similarity score between two assets using their AI-generated metadata
   * @param asset1 First asset to compare
   * @param asset2 Second asset to compare
   * @returns Similarity score from 0 to 1, where 1 is most similar
   */
  private calculateSimilarityScore(asset1: Asset, asset2: Asset): number {
    let score = 0;
    let factors = 0;
    
    // Compare AI tags if both assets have them
    if (asset1.aiTags && asset1.aiTags.length > 0 && asset2.aiTags && asset2.aiTags.length > 0) {
      const commonTags = asset1.aiTags.filter(tag => asset2.aiTags!.includes(tag));
      const tagSimilarity = commonTags.length / Math.max(asset1.aiTags.length, asset2.aiTags.length);
      score += tagSimilarity;
      factors++;
    }
    
    // Compare dominant colours if both assets have them
    if (
      asset1.dominantColours && asset1.dominantColours.length > 0 &&
      asset2.dominantColours && asset2.dominantColours.length > 0
    ) {
      // Compare primary colours
      const colourSimilarity = this.areColoursRelated(asset1.dominantColours[0], asset2.dominantColours[0]) ? 0.8 : 0;
      score += colourSimilarity;
      factors++;
    }
    
    // Compare categories if both assets have them
    if (
      asset1.categories && asset1.categories.length > 0 &&
      asset2.categories && asset2.categories.length > 0
    ) {
      const commonCategories = asset1.categories.filter(category => asset2.categories!.includes(category));
      const categorySimilarity = commonCategories.length / Math.max(asset1.categories.length, asset2.categories.length);
      score += categorySimilarity;
      factors++;
    }
    
    // If there are no factors to compare, return 0
    if (factors === 0) return 0;
    
    // Return the average similarity score
    return score / factors;
  }
  
  /**
   * Determine if two colours are visually related
   * @param colour1 First colour in hex format (e.g., '#ff0000')
   * @param colour2 Second colour in hex format (e.g., '#ff5555')
   * @returns True if the colours are considered related
   */
  private areColoursRelated(colour1: string, colour2: string): boolean {
    // Ensure both colours are in hex format
    if (!colour1 || !colour2 || !colour1.startsWith('#') || !colour2.startsWith('#')) {
      return false;
    }
    
    try {
      // Parse hex colours to RGB
      const rgb1 = this.hexToRgb(colour1);
      const rgb2 = this.hexToRgb(colour2);
      
      if (!rgb1 || !rgb2) return false;
      
      // Convert RGB to HSL to better compare colour relationships
      const hsl1 = this.rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
      const hsl2 = this.rgbToHsl(rgb2.r, rgb2.g, rgb2.b);
      
      // Colours are considered related if they have similar hue (within a threshold)
      // or if they are both very dark or both very light
      const hueThreshold = 30; // Degrees of difference in hue that we consider "related"
      const hueDiff = Math.abs(hsl1.h - hsl2.h);
      const normalizedHueDiff = Math.min(hueDiff, 360 - hueDiff); // Handle hue wraparound at 360 degrees
      
      // Colours with similar hue are related
      if (normalizedHueDiff <= hueThreshold) {
        return true;
      }
      
      // Both are very dark (low lightness) or both very light (high lightness)
      if ((hsl1.l < 0.2 && hsl2.l < 0.2) || (hsl1.l > 0.8 && hsl2.l > 0.8)) {
        return true;
      }
      
      // Both are very desaturated (grayscale-like)
      if (hsl1.s < 0.2 && hsl2.s < 0.2) {
        return true;
      }
      
      return false;
    } catch (e) {
      // If any error occurs during colour calculation, return false
      return false;
    }
  }
  
  /**
   * Convert a hex colour string to RGB values
   */
  private hexToRgb(hex: string): {r: number, g: number, b: number} | null {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse 3-digit hex
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Validate hex format
    if (hex.length !== 6) {
      return null;
    }
    
    // Parse the RGB components
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    // Check for valid parsing
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return null;
    }
    
    return { r, g, b };
  }
  
  /**
   * Convert RGB to HSL colour space
   * @returns Object with h (0-360), s (0-1), l (0-1)
   */
  private rgbToHsl(r: number, g: number, b: number): {h: number, s: number, l: number} {
    // Normalize RGB values
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h /= 6;
    }
    
    // Convert hue to degrees
    h = Math.round(h * 360);
    
    return { h, s, l };
  }
  
  /**
   * Get a single asset by ID
   */
  async getAssetById(id: string, userId?: string): Promise<{asset: Asset | null, success: boolean, message?: string}> {
    try {
      // Build up our query
      let query = this.supabase
        .from('assets')
        .select('*');
      
      // Apply id filter
      query = query.eq('id', id);
      
      // Only restrict by user ID if specified and not bypassing auth
      if (userId) {
        query = query.eq('owner_id', userId);
      }
      
      // Execute as single query
      const { data, error } = await query.single();
      
      if (error) {
        return {
          asset: null,
          success: false,
          message: error.message
        };
      }
      
      if (!data) {
        return {
          asset: null,
          success: false,
          message: 'Asset not found'
        };
      }
      
      return {
        asset: this.transformAssetFromDb(data as DbAsset),
        success: true
      };
    } catch (error: any) {
      return {
        asset: null,
        success: false,
        message: `Error retrieving asset: ${error.message}`
      };
    }
  }

  /**
   * Get available categories across all assets
   */
  async getAvailableCategories(): Promise<string[]> {
    try {
      // This query gets all unique categories from the assets
      const { data, error } = await this.supabase
        .from('assets')
        .select('metadata->categories')
        .not('metadata->categories', 'is', null);
      
      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
      
      // Extract and flatten categories from all assets
      const allCategories: string[] = [];
      
      data.forEach(item => {
        // Use type assertion (as any) to access nested metadata correctly
        const typedItem = item as any;
        if (typedItem.metadata && typedItem.metadata.categories && Array.isArray(typedItem.metadata.categories)) {
          typedItem.metadata.categories.forEach((category: string) => {
            if (category && !allCategories.includes(category)) {
              allCategories.push(category);
            }
          });
        }
      });
      
      return allCategories.sort();
    } catch (error: any) {
      console.error('Error getting available categories:', error);
      return [];
    }
  }

  /**
   * Deletes an asset, including its database record and associated files.
   */
  public async deleteAsset(id: string, clientId: string): Promise<ServiceResult<boolean>> {
    // 1. Add Supabase configuration check
    if (!this.isSupabaseConfigured()) {
      return {
        success: false,
        // Use ApiError for consistency
        error: new ApiError(ErrorCode.CONFIGURATION_ERROR, 'Supabase client not configured.'),
        message: 'Service configuration error.',
        data: false,
      };
    }

    // 2. Validate input
    if (!id || !clientId) {
      const message = 'Asset ID and Client ID are required.';
      // 3. Replace logger.warn with console.warn
      console.warn(message, { id, clientId });
      return {
        success: false,
        error: new ApiError(ErrorCode.INVALID_INPUT, message),
        message: message,
        data: false,
      };
    }

    let filePathToDelete: string | undefined;
    let thumbPathToDelete: string | undefined;

    try {
      // 4. Get asset details first to know which files to delete
      const { data: assetData, error: fetchError } = await this.supabase
        .from('assets')
        .select('file_path, thumbnail_path')
        .eq('id', id)
        .eq('client_id', clientId)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error fetching asset ${id} before deletion:`, fetchError);
        // Use ApiError for database errors
        return {
          success: false,
          error: new ApiError(ErrorCode.DATABASE_ERROR, `Database error checking asset before delete: ${fetchError.message}`, fetchError),
          message: `Database error checking asset before delete: ${fetchError.message}`,
          data: false,
        };
      }

      if (!assetData) {
        // Asset doesn't exist or doesn't belong to client - treat as success (idempotent delete)
        console.log(`Asset ${id} not found for client ${clientId} during delete attempt. Assuming already deleted.`);
        return { success: true, message: 'Asset not found, assumed already deleted.', data: true };
      }

      // Resolve full paths based on uploadsDir
      filePathToDelete = assetData.file_path ? path.resolve(this.uploadsDir, assetData.file_path) : undefined;
      thumbPathToDelete = assetData.thumbnail_path ? path.resolve(this.uploadsDir, assetData.thumbnail_path) : undefined;

      // 5. Delete the database record
      const { error: deleteError } = await this.supabase
        .from('assets')
        .delete()
        .match({ id: id, client_id: clientId });

      if (deleteError) {
        // Check if it was a 'not found' error again (e.g., race condition)
        if (deleteError.code === 'PGRST204') { // Not found or RLS failed
          console.log(`Asset ${id} not found during delete confirmation (PGRST204). Assuming deleted.`);
          // Use ApiError for consistency, even though we proceed to file cleanup
          // Note: We still proceed to file cleanup, but log this specific condition.
        } else {
          console.error(`Error deleting asset ${id} from database:`, deleteError);
          // Standardize error reporting using ApiError
          return {
            success: false,
            error: new ApiError(
              ErrorCode.DATABASE_ERROR,
              `Failed to delete asset record for ID: ${id}. Reason: ${deleteError.message}`,
              deleteError
            ),
            message: `Database error deleting asset: ${deleteError.message}`,
            data: false,
          };
        }
      } else {
        console.log(`Asset ${id} deleted from database.`);
      }

      // 6. Delete files from filesystem asynchronously using Promise.allSettled
      const fileDeletePromises: Promise<void>[] = [];
      const filesToDelete: { path: string | undefined, type: string }[] = [
        { path: filePathToDelete, type: 'asset file' },
        { path: thumbPathToDelete, type: 'thumbnail file' },
      ];

      filesToDelete.forEach(({ path: currentPath, type }) => {
        if (currentPath) {
          fileDeletePromises.push(
            unlink(currentPath).then(() => { // Use the promisified unlink
              console.log(`Deleted ${type}: ${currentPath}`);
            }).catch((fsError: unknown) => {
              // Throw a specific error object to capture details in allSettled
              const errorMsg = `Failed to delete ${type} ${currentPath}: ${fsError instanceof Error ? fsError.message : String(fsError)}`;
              console.error(errorMsg);
              throw new Error(errorMsg); // Throw to mark as rejected
            })
          );
        }
      });

      const results = await Promise.allSettled(fileDeletePromises);
      const fileDeleteErrors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason?.message || 'Unknown file deletion error');

      if (fileDeleteErrors.length > 0) {
        // Return success=true because the DB record is gone (primary goal),
        // but include a message about the file cleanup issues.
        return {
          success: true,
          message: `Asset record deleted, but encountered errors cleaning up files: ${fileDeleteErrors.join('; ')}`,
          // Optionally include errors in a separate field if needed downstream
          // fileErrors: fileDeleteErrors,
          data: true
        };
      }

      return { success: true, message: 'Asset deleted successfully, including associated files.', data: true };

    } catch (error: unknown) {
      console.error('Unexpected error in deleteAsset:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Wrap unexpected errors in ApiError
      return {
        success: false,
        error: new ApiError(ErrorCode.INTERNAL_ERROR, `An unexpected error occurred during asset deletion: ${errorMessage}`, error),
        message: `An unexpected error occurred during asset deletion: ${errorMessage}`,
        data: false,
      };
    }
  }

  /**
   * Helper function to map Asset update fields to DbAsset update fields.
   * Only includes fields typically allowed for update.
   */
  private mapAssetToDbUpdate(updates: Partial<Asset>): Partial<Omit<DbAsset, 'id' | 'created_at' | 'updated_at' | 'client_id' | 'owner_id' | 'file_path' | 'thumbnail_path' | 'type' | 'mime_type' | 'size' | 'width' | 'height' | 'duration'>> {
    const dbUpdates: Partial<Omit<DbAsset, 'id' | 'created_at' | 'updated_at' | 'client_id' | 'owner_id' | 'file_path' | 'thumbnail_path' | 'type' | 'mime_type' | 'size' | 'width' | 'height' | 'duration'>> = {};

    if ('name' in updates) dbUpdates.name = updates.name;
    if ('description' in updates) dbUpdates.description = updates.description;
    if ('isFavourite' in updates) dbUpdates.is_favourite = updates.isFavourite;
    // Map Asset 'status' or 'processingStatus' to DbAsset 'status'
    if ('status' in updates) dbUpdates.status = updates.status;
    if ('processingStatus' in updates) dbUpdates.status = updates.processingStatus; // Allow updating via processingStatus

    if ('tags' in updates) dbUpdates.tags = updates.tags;
    if ('categories' in updates) dbUpdates.categories = updates.categories;
    if ('alternativeText' in updates) dbUpdates.alternative_text = updates.alternativeText;

    // Convert incoming string date (from Asset.expiresAt) to Date object
    if ('expiresAt' in updates) {
      // Check if expiresAt is a non-empty string before parsing
      dbUpdates.expires_at = updates.expiresAt ? new Date(updates.expiresAt) : undefined;
    }
    // Handle metadata - merge if existing, otherwise set
    // Note: This assumes a simple merge; complex merges might need specific logic
    if ('metadata' in updates) {
      // We need the existing metadata to merge properly. This helper might not be the best place.
      // For now, just overwrite. Consider moving merge logic to updateAsset itself.
      dbUpdates.metadata = updates.metadata;
    }

    // Fields like id, client_id, owner_id, file paths, type, size, dimensions, created_at, updated_at
    // are generally not updated via this method.

    return dbUpdates;
  }

  /**
   * Updates an existing asset.
   */
  public async updateAsset(
    id: string,
    clientId: string,
    updates: Partial<Asset>
  ): Promise<ServiceResult<Asset>> {
    if (!this.isSupabaseConfigured()) {
      return { success: false, error: 'Supabase client not configured.', message: 'Service configuration error.' };
    }
    if (!id || !clientId) {
      return { success: false, error: 'Asset ID and Client ID are required.', message: 'Missing required parameters.' };
    }
    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No update data provided.', message: 'At least one field must be provided for update.' };
    }

    // Map application-level updates to database fields
    const dbUpdates = this.mapAssetToDbUpdate(updates);

    // Check if there are any valid fields to update after mapping
    if (Object.keys(dbUpdates).length === 0) {
      return { success: false, error: 'No updatable fields provided.', message: 'None of the provided fields are allowed for update.' };
    }

    try {
      // Add updated_at manually if database doesn't handle it automatically
      // dbUpdates.updated_at = new Date();

      const { data: updatedData, error: updateError } = await this.supabase
        .from('assets')
        .update(dbUpdates)
        .eq('id', id)
        .eq('client_id', clientId)
        .select()
        .single();

      if (updateError) {
        console.error(`Error updating asset ${id}:`, updateError);
        if (updateError.code === 'PGRST204') { // Not found or RLS failed
          return { success: false, error: 'Asset not found or access denied.', message: `Asset with ID ${id} not found for client ${clientId} or update failed.` };
        }
        return { success: false, error: updateError.message, message: `Database error updating asset: ${updateError.message}` };
      }

      if (!updatedData) {
        return { success: false, error: 'Update operation returned no data.', message: 'Failed to retrieve the updated asset after update.' };
      }

      const transformedAsset = this.transformAssetFromDb(updatedData as DbAsset);
      return { success: true, data: transformedAsset, message: 'Asset updated successfully.' };

    } catch (error: unknown) {
      console.error('Error in updateAsset:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage, message: `An unexpected error occurred while updating asset: ${errorMessage}` };
    }
  }

  /**
   * Toggles the favourite status of an asset.
   */
  public async toggleFavourite(id: string, clientId: string, isFavourite: boolean): Promise<ServiceResult<Asset>> {
    if (!this.isSupabaseConfigured()) {
      return { success: false, error: 'Supabase client not configured.', message: 'Service configuration error.' };
    }
    if (!id || !clientId) {
      return { success: false, error: 'Asset ID and Client ID are required.', message: 'Missing required parameters.' };
    }

    try {
      const { data: updatedData, error: updateError } = await this.supabase
        .from('assets')
        .update({ is_favourite: isFavourite })
        .eq('id', id)
        .eq('client_id', clientId)
        .select()
        .single();

      if (updateError) {
        console.error(`Error toggling favourite for asset ${id}:`, updateError);
        // Check for specific errors, like RowLevelSecurity or not found
        if (updateError.code === 'PGRST204') { // PostgREST code for no rows found
          return { success: false, error: 'Asset not found or access denied.', message: `Asset with ID ${id} not found for client ${clientId} or update failed.` };
        }
        return { success: false, error: updateError.message, message: `Database error updating favourite status: ${updateError.message}` };
      }

      if (!updatedData) {
        // This case might be covered by PGRST204 check, but added for robustness
        return { success: false, error: 'Update operation returned no data.', message: 'Failed to retrieve the updated asset after toggling favourite status.' };
      }

      const transformedAsset = this.transformAssetFromDb(updatedData as DbAsset);
      return { success: true, data: transformedAsset, message: `Asset favourite status updated successfully to ${isFavourite}.` };

    } catch (error: unknown) {
      console.error('Error in toggleFavourite:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage, message: `An unexpected error occurred while toggling favourite: ${errorMessage}` };
    }
  }

  /**
   * Checks if the Supabase client is configured.
   */
  public isSupabaseConfigured(): boolean {
    // Simple check if the client object exists
    // Add more robust checks if necessary (e.g., check connection status if possible)
    return !!this.supabase;
  }

  // Create singleton instance
  static getInstance(): AssetService {
    if (!AssetService.instance) {
      AssetService.instance = new AssetService();
    }
    return AssetService.instance;
  }

}

// Create singleton instance
const assetService = AssetService.getInstance();
export {
  assetService,
  Asset,
  DbAsset,
  AssetFilters,
  ServiceResult,
  AssetUploadOptions,
  ImageMetadata,
  VideoMetadata,
  AudioMetadata,
};
