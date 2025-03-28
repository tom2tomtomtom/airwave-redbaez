"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetService = void 0;
const supabaseClient_1 = require("../db/supabaseClient");
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const util_1 = require("util");
const auth_1 = require("../middleware/auth");
// Convert fs methods to promise-based
const unlink = (0, util_1.promisify)(fs_1.default.unlink);
const stat = (0, util_1.promisify)(fs_1.default.stat);
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
class AssetService {
    constructor() {
        this.uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        this.ensureUploadsDir();
    }
    async ensureUploadsDir() {
        try {
            await mkdir(this.uploadsDir, { recursive: true });
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
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
    async uploadAsset(file, userId, assetData) {
        console.log('assetService.uploadAsset called with:', {
            file: file ? {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path
            } : 'No file',
            userId,
            assetData: {
                name: assetData.name,
                type: assetData.type,
                tags: assetData.tags,
                categories: assetData.categories
            }
        });
        try {
            // Verify user exists in database to prevent foreign key constraint issues
            if (!userId) {
                console.error('Missing userId in uploadAsset');
                throw new Error('User ID is required to upload an asset');
            }
            // Validate client ID exists
            if (!assetData.clientId) {
                console.error('Missing clientId in uploadAsset');
                throw new Error('Client ID is required to upload an asset');
            }
            // Check if the file object is valid
            if (!file || !file.path || !fs_1.default.existsSync(file.path)) {
                console.error('Invalid file object or file does not exist at path:', file?.path);
                throw new Error('Invalid file or file not found at the specified path');
            }
            // Use the centralized AUTH_MODE for consistency
            const isPrototypeMode = auth_1.AUTH_MODE.CURRENT === 'prototype';
            console.log('Prototype mode:', isPrototypeMode ? 'Enabled' : 'Disabled');
            // Skip database checks if in prototype mode
            if (!isPrototypeMode) {
                // In production, we should verify the user has permission to upload
                const isDevelopment = process.env.NODE_ENV !== 'production';
                console.log('Environment:', isDevelopment ? 'Development' : 'Production');
                if (!isDevelopment) {
                    console.log('Verifying user exists in database...');
                    const { data: userData, error: userError } = await supabaseClient_1.supabase
                        .from('users')
                        .select('id')
                        .eq('id', userId)
                        .single();
                    if (userError) {
                        console.error('Supabase error when verifying user:', userError);
                    }
                    if (!userData) {
                        console.error(`User with ID ${userId} not found in database`);
                    }
                    if (userError || !userData) {
                        throw new Error(`User with ID ${userId} not found or not authorised`);
                    }
                    // Verify client exists in database
                    console.log('Verifying client exists in database...');
                    const { data: clientData, error: clientError } = await supabaseClient_1.supabase
                        .from('clients')
                        .select('id')
                        .eq('id', assetData.clientId)
                        .single();
                    if (clientError) {
                        console.error('Supabase error when verifying client:', clientError);
                    }
                    if (!clientData) {
                        console.error(`Client with ID ${assetData.clientId} not found in database`);
                    }
                    if (clientError || !clientData) {
                        throw new Error(`Client with ID ${assetData.clientId} not found or not authorised`);
                    }
                }
            }
            else {
                console.log('Prototype mode enabled - skipping user and client verification');
            }
            // Generate unique IDs and filenames
            const assetId = (0, uuid_1.v4)();
            const fileExt = path_1.default.extname(file.originalname).toLowerCase();
            const sanitizedName = assetData.name.replace(/[^a-zA-Z0-9]/g, '-');
            const assetFileName = `asset-${sanitizedName}-${assetId}${fileExt}`;
            const assetFilePath = path_1.default.join(this.uploadsDir, assetFileName);
            console.log('File details:', {
                originalPath: file.path,
                destinationPath: assetFilePath,
                extension: fileExt,
                fileName: assetFileName
            });
            // Get file stats for metadata
            console.log('Getting file stats...');
            let fileStats;
            try {
                fileStats = await stat(file.path);
                console.log('File stats:', {
                    size: fileStats.size,
                    created: fileStats.birthtime,
                    modified: fileStats.mtime
                });
            }
            catch (statError) {
                console.error('Error getting file stats:', statError);
                throw new Error(`Failed to get file stats: ${statError.message || 'Unknown error'}`);
            }
            // Validate file type against claimed type
            const validTypes = {
                image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
                video: ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
                audio: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
                document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv']
            };
            console.log(`Validating file type: claimed=${assetData.type}, extension=${fileExt}`);
            if (assetData.type in validTypes && !validTypes[assetData.type].includes(fileExt)) {
                console.error(`File extension ${fileExt} does not match claimed type ${assetData.type}`);
                throw new Error(`File extension ${fileExt} does not match claimed type ${assetData.type}`);
            }
            // Initialize asset object with enhanced metadata
            const asset = {
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
                clientId: assetData.clientId, // Ensure client ID is saved with the asset
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: assetData.additionalMetadata || {}
            };
            console.log('Created asset object:', {
                id: asset.id,
                name: asset.name,
                type: asset.type,
                url: asset.url
            });
            // Ensure uploads directory exists
            console.log('Ensuring uploads directory exists...');
            try {
                await this.ensureUploadsDir();
                console.log('Uploads directory confirmed at:', this.uploadsDir);
            }
            catch (dirError) {
                console.error('Error ensuring uploads directory:', dirError);
                throw new Error(`Failed to create uploads directory: ${dirError.message || 'Unknown error'}`);
            }
            // Move file to uploads directory with proper error handling
            console.log(`Moving file from ${file.path} to ${assetFilePath}...`);
            try {
                fs_1.default.renameSync(file.path, assetFilePath);
                console.log('File moved successfully');
            }
            catch (error) {
                console.error('Error moving uploaded file:', error);
                throw new Error(`Failed to save asset file: ${error.message || 'Unknown error'}`);
            }
            // Process asset based on type
            console.log(`Processing asset of type: ${assetData.type}`);
            try {
                if (assetData.type === 'image') {
                    console.log('Processing image asset...');
                    await this.processImageAsset(asset, assetFilePath);
                }
                else if (assetData.type === 'video') {
                    console.log('Processing video asset...');
                    await this.processVideoAsset(asset, assetFilePath);
                }
                else if (assetData.type === 'audio') {
                    console.log('Processing audio asset...');
                    await this.processAudioAsset(asset, assetFilePath);
                }
                else if (assetData.type === 'document') {
                    // Set default thumbnail for documents
                    console.log('Setting default thumbnail for document');
                    asset.thumbnailUrl = '/uploads/default-document-thumb.jpg';
                }
                console.log('Asset processing completed');
            }
            catch (processingError) {
                console.error(`Error processing ${assetData.type} asset:`, processingError);
                // Continue with upload even if processing fails, but log the error
            }
            // Prepare database record with enhanced metadata
            console.log('Preparing database record...');
            const dbRecord = {
                id: asset.id,
                name: asset.name,
                type: asset.type,
                url: asset.url,
                thumbnail_url: asset.thumbnailUrl,
                user_id: asset.userId,
                owner_id: asset.ownerId,
                // Remove organisation_id field as it doesn't exist in the schema
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
                    // Store organisation ID in metadata if needed
                    organisationId: assetData.organisationId,
                    ...asset.metadata
                },
                created_at: asset.createdAt,
                updated_at: asset.updatedAt
            };
            // Check the authentication mode using the AUTH_MODE constants
            const isDevMode = auth_1.AUTH_MODE.CURRENT === 'development' || auth_1.AUTH_MODE.CURRENT === 'prototype';
            console.log('Environment check:', {
                AUTH_MODE: auth_1.AUTH_MODE.CURRENT,
                isDevMode
            });
            // In development or prototype mode, ensure consistent user ID
            if (isDevMode) {
                console.log(`${auth_1.AUTH_MODE.CURRENT.toUpperCase()} MODE: Checking user for asset upload`);
                // Always use the consistent development user ID in development/prototype mode
                if (userId !== auth_1.AUTH_MODE.DEV_USER_ID) {
                    console.log(`User ID ${userId} doesn't match DEV_USER_ID (${auth_1.AUTH_MODE.DEV_USER_ID}), using development user ID instead`);
                    userId = auth_1.AUTH_MODE.DEV_USER_ID;
                    // Update the database record with the development user ID
                    dbRecord.user_id = auth_1.AUTH_MODE.DEV_USER_ID;
                    dbRecord.owner_id = auth_1.AUTH_MODE.DEV_USER_ID;
                }
                try {
                    // Check if the development user exists in the users table
                    const { data: userData, error: userQueryError } = await supabaseClient_1.supabase
                        .from('users')
                        .select('id')
                        .eq('id', auth_1.AUTH_MODE.DEV_USER_ID)
                        .maybeSingle();
                    if (userQueryError) {
                        console.error('Error checking if development user exists:', userQueryError);
                    }
                    // If development user doesn't exist, create it
                    if (!userData) {
                        console.log(`Development user ${auth_1.AUTH_MODE.DEV_USER_ID} doesn't exist in database, creating...`);
                        // Use upsert to ensure we don't get conflicts
                        const { error: userInsertError } = await supabaseClient_1.supabase
                            .from('users')
                            .upsert([{
                                id: auth_1.AUTH_MODE.DEV_USER_ID,
                                email: 'dev@example.com',
                                name: 'Development User',
                                role: 'admin',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            }]);
                        if (userInsertError) {
                            console.error('Failed to create development user:', userInsertError);
                            // Try alternative approach with direct SQL if initial approach fails
                            try {
                                console.log('Attempting alternative user creation approach...');
                                const insertQuery = `
                  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
                  VALUES ('${auth_1.AUTH_MODE.DEV_USER_ID}', 'dev@example.com', 'Development User', 'admin', NOW(), NOW())
                  ON CONFLICT (id) DO UPDATE SET
                    email = EXCLUDED.email,
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    updated_at = EXCLUDED.updated_at;
                `;
                                // Execute the SQL directly
                                await supabaseClient_1.supabase.rpc('execute', { query: insertQuery });
                                console.log('Alternative development user creation successful');
                            }
                            catch (altError) {
                                console.error('Alternative user creation failed:', altError);
                                console.log('Continuing with asset creation anyway for development purposes');
                            }
                        }
                        else {
                            console.log('Development user created successfully');
                        }
                    }
                    else {
                        console.log(`Development user ${auth_1.AUTH_MODE.DEV_USER_ID} exists in database`);
                    }
                }
                catch (error) {
                    console.error('Error in development user check/creation:', error);
                    console.log('Continuing with asset creation anyway for development purposes');
                }
            }
            let data;
            let error;
            // In prototype mode, skip database storage and use local filesystem only
            if (auth_1.AUTH_MODE.CURRENT === 'prototype') {
                console.log('Running in PROTOTYPE_MODE - skipping database storage, using local storage only');
                // Create a "fake" data response that looks like what would come from Supabase
                data = {
                    ...dbRecord,
                    // Add any additional fields that might come from the database
                    id: dbRecord.id,
                    meta: dbRecord.meta || {}
                };
                error = null;
                console.log('Created fake response data for prototype mode:', data);
            }
            else {
                // Regular database storage
                console.log('Saving asset to Supabase...');
                try {
                    const result = await supabaseClient_1.supabase
                        .from('assets')
                        .insert([dbRecord])
                        .select()
                        .single();
                    data = result.data;
                    error = result.error;
                }
                catch (dbErr) {
                    const dbError = dbErr;
                    console.error('Unexpected error when saving to Supabase:', dbError);
                    error = {
                        message: `Unexpected error: ${dbError.message || 'Unknown error'}`
                    };
                }
            }
            if (error) {
                console.error('Supabase error when inserting asset:', error);
                // Handle missing organization column
                if (error.message && error.message.includes('organisation_id')) {
                    throw new Error('Failed to save asset: Your database schema is missing the organization_id column');
                }
                // Handle foreign key constraint errors more clearly, but bypass in development mode
                if (error.code === '23503' && error.message.includes('assets_user_id_fkey')) {
                    // In development or prototype mode, we'll take a different approach
                    if (auth_1.AUTH_MODE.CURRENT === 'development' || auth_1.AUTH_MODE.CURRENT === 'prototype') {
                        console.log(`${auth_1.AUTH_MODE.CURRENT.toUpperCase()} MODE: Handling user_id constraint issue`);
                        // First, try to ensure the development user exists again
                        try {
                            console.log('Trying to create development user again...');
                            await supabaseClient_1.supabase
                                .from('users')
                                .upsert([
                                {
                                    id: auth_1.AUTH_MODE.DEV_USER_ID,
                                    email: 'dev@example.com',
                                    name: 'Development User',
                                    role: 'admin',
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString()
                                }
                            ]);
                            console.log('Development user created or updated');
                            // Try the insert again with the development user ID
                            console.log('Retrying asset insertion with development user ID');
                            const fixedRecord = {
                                ...dbRecord,
                                user_id: auth_1.AUTH_MODE.DEV_USER_ID,
                                owner_id: auth_1.AUTH_MODE.DEV_USER_ID
                            };
                            const retryResult = await supabaseClient_1.supabase
                                .from('assets')
                                .insert([fixedRecord])
                                .select()
                                .single();
                            if (retryResult.error) {
                                console.error('Still failed with development user ID:', retryResult.error);
                                // As a last resort, try with NULL user_id
                                console.log('Last resort: trying with NULL user_id');
                                const nullRecord = { ...dbRecord, user_id: null };
                                const nullResult = await supabaseClient_1.supabase
                                    .from('assets')
                                    .insert([nullRecord])
                                    .select()
                                    .single();
                                if (nullResult.error) {
                                    console.error('All approaches failed:', nullResult.error);
                                    throw new Error('Failed to save asset: Multiple approaches to handle the user ID issue failed.');
                                }
                                data = nullResult.data;
                                error = null;
                                console.log('Succeeded with NULL user_id approach');
                            }
                            else {
                                data = retryResult.data;
                                error = null;
                                console.log('Succeeded with development user ID approach');
                            }
                        }
                        catch (retryErr) {
                            console.error('Exception in retry approaches:', retryErr);
                            throw new Error('Failed to save asset: The user ID does not exist in the database. Please ensure you\'re logged in with a valid user.');
                        }
                    }
                    else {
                        throw new Error('Failed to save asset: The user ID does not exist in the database. Please ensure you\'re logged in with a valid user.');
                    }
                }
                else {
                    throw new Error(`Failed to save asset to database: ${error.message}`);
                }
            }
            console.log('Asset saved successfully to database');
            const transformedAsset = this.transformAssetFromDb(data);
            return {
                asset: transformedAsset,
                success: true
            };
        }
        catch (error) {
            console.error('Error uploading asset:', error);
            return {
                asset: null,
                success: false,
                message: `Failed to upload asset: ${error.message}`
            };
        }
    }
    /**
     * Process image asset
     * Enhanced with better error handling and metadata extraction
     */
    async processImageAsset(asset, filePath) {
        try {
            // Generate unique thumbnail filename
            const thumbnailFileName = `thumb-${asset.id}.jpg`;
            const thumbnailPath = path_1.default.join(this.uploadsDir, thumbnailFileName);
            // Extract comprehensive metadata
            const metadata = await (0, sharp_1.default)(filePath).metadata();
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
            await (0, sharp_1.default)(filePath)
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
            const previewPath = path_1.default.join(this.uploadsDir, previewFileName);
            await (0, sharp_1.default)(filePath)
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
        }
        catch (error) {
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
    async processVideoAsset(asset, filePath) {
        try {
            // Generate unique thumbnail and preview filenames
            const thumbnailFileName = `thumb-${asset.id}.jpg`;
            const thumbnailPath = path_1.default.join(this.uploadsDir, thumbnailFileName);
            const previewFileName = `preview-${asset.id}.gif`;
            const previewPath = path_1.default.join(this.uploadsDir, previewFileName);
            // Create promise for ffmpeg thumbnail generation (from 10% into the video)
            const thumbnailPromise = new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(filePath)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err))
                    .screenshots({
                    timestamps: ['10%'],
                    filename: thumbnailFileName,
                    folder: this.uploadsDir,
                    size: '320x240',
                    quality: 90
                });
            });
            // Create promise for ffmpeg preview GIF generation (short clip from middle)
            const previewPromise = new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(filePath)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err))
                    .outputOptions([
                    '-vf', 'fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
                    '-t', '3'
                ])
                    .output(previewPath)
                    .run();
            });
            // Create promise for ffmpeg metadata extraction
            const metadataPromise = new Promise((resolve, reject) => {
                fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    // Store basic dimensions and duration
                    if (metadata && metadata.streams) {
                        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
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
                            const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
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
        }
        catch (error) {
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
    async processAudioAsset(asset, filePath) {
        try {
            // Create unique filenames
            const thumbnailFileName = `thumb-${asset.id}.jpg`;
            const thumbnailPath = path_1.default.join(this.uploadsDir, thumbnailFileName);
            const waveformFileName = `waveform-${asset.id}.png`;
            const waveformPath = path_1.default.join(this.uploadsDir, waveformFileName);
            // Use a default audio thumbnail or generate a dynamic one
            const defaultAudioThumb = 'audio-thumb.jpg';
            const defaultThumbPath = path_1.default.join(__dirname, '../../public', defaultAudioThumb);
            if (fs_1.default.existsSync(defaultThumbPath)) {
                fs_1.default.copyFileSync(defaultThumbPath, thumbnailPath);
                asset.thumbnailUrl = `/uploads/${thumbnailFileName}`;
            }
            else {
                // Create a default thumbnail if none exists
                await (0, sharp_1.default)({
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
            const metadataPromise = new Promise((resolve, reject) => {
                fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
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
                        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
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
            const waveformPromise = new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(filePath)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err))
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
        }
        catch (error) {
            console.error('Error processing audio asset:', error);
            // Use defaults if processing fails
            if (!asset.thumbnailUrl) {
                asset.thumbnailUrl = '/uploads/default-audio-thumb.jpg';
            }
            asset.previewUrl = asset.url;
        }
    }
    /**
     * Get assets by client slug with optional filtering and pagination
     * @param slug The client slug to get assets for
     * @param options Optional filtering and pagination options
     * @returns Object containing paginated assets and total count
     */
    async getAssetsByClientSlug(slug, options = {}) {
        try {
            console.log(`Getting assets for client slug: ${slug}`);
            // Default pagination values
            const limit = options.limit || 20;
            const offset = options.offset || 0;
            // 1. Find the client ID from the slug
            const { data: client, error: clientError } = await supabaseClient_1.supabase
                .from('clients')
                .select('id')
                .eq('client_slug', slug.toLowerCase())
                .single();
            if (clientError) {
                console.error('Error finding client by slug:', clientError);
                return { assets: [], total: 0 };
            }
            if (!client) {
                console.log(`No client found for slug: ${slug}`);
                return { assets: [], total: 0 };
            }
            console.log(`Found client ID: ${client.id} for slug: ${slug}`);
            // 2. Build the base queries for assets
            let dataQuery = supabaseClient_1.supabase
                .from('assets')
                .select('*')
                .eq('client_id', client.id);
            let countQuery = supabaseClient_1.supabase
                .from('assets')
                .select('id', { count: 'exact' })
                .eq('client_id', client.id);
            // 3. Apply type filters
            if (options.type) {
                if (Array.isArray(options.type) && options.type.length > 0) {
                    dataQuery = dataQuery.in('type', options.type);
                    countQuery = countQuery.in('type', options.type);
                }
                else if (typeof options.type === 'string' && options.type !== 'all') {
                    dataQuery = dataQuery.eq('type', options.type);
                    countQuery = countQuery.eq('type', options.type);
                }
            }
            // 4. Apply search term filters
            if (options.searchTerm) {
                const searchTerm = options.searchTerm.trim();
                if (searchTerm.length > 0) {
                    // For simple searches, use basic pattern matching
                    if (searchTerm.length < 3 || !searchTerm.includes(' ')) {
                        const condition = `name.ilike.%${searchTerm}%,meta->description.ilike.%${searchTerm}%`;
                        dataQuery = dataQuery.or(condition);
                        countQuery = countQuery.or(condition);
                    }
                    else {
                        // For more complex searches, use full-text search capabilities
                        const formattedSearchTerm = searchTerm
                            .split(' ')
                            .filter(word => word.length > 0)
                            .map(word => word + ':*')
                            .join(' & ');
                        const condition = `name.wfts.${formattedSearchTerm},meta->description.wfts.${formattedSearchTerm}`;
                        dataQuery = dataQuery.or(condition);
                        countQuery = countQuery.or(condition);
                    }
                }
            }
            // 5. Apply favourite filter
            if (options.favouritesOnly) {
                dataQuery = dataQuery.eq('meta->isFavourite', true);
                countQuery = countQuery.eq('meta->isFavourite', true);
            }
            // 6. Get the total count
            const { count, error: countError } = await countQuery;
            if (countError) {
                console.error('Error counting assets:', countError);
            }
            // 7. Apply sorting
            const sortBy = options.sortBy || 'createdAt';
            const sortDirection = options.sortDirection || 'desc';
            // Map frontend field names to database field names
            let sortField;
            if (sortBy === 'name') {
                sortField = 'name';
            }
            else if (sortBy === 'createdAt') {
                sortField = 'created_at';
            }
            else if (sortBy === 'updatedAt') {
                sortField = 'updated_at';
            }
            else if (sortBy === 'usageCount') {
                sortField = 'meta->usageCount';
            }
            else {
                // Default to created_at for any other value
                sortField = 'created_at';
            }
            dataQuery = dataQuery
                .order(sortField, { ascending: sortDirection === 'asc' })
                .range(offset, offset + limit - 1);
            // 8. Execute query
            const { data: assets, error: assetError } = await dataQuery;
            if (assetError) {
                console.error('Error fetching assets by client ID:', assetError);
                return { assets: [], total: 0 };
            }
            console.log(`Found ${assets?.length || 0} assets for client slug ${slug} (total: ${count || 0})`);
            // 9. Transform the assets and return them
            const transformedAssets = (assets || []).map(item => this.transformAssetFromDb(item));
            return {
                assets: transformedAssets,
                total: count || 0
            };
        }
        catch (error) {
            console.error('Error in getAssetsByClientSlug:', error);
            return { assets: [], total: 0 };
        }
    }
    /**
     * Get assets with optional filtering and pagination
     * Enhanced to handle nested metadata, security considerations, and pagination
     * @returns Object containing paginated assets and total count
     */
    async getAssets(filters = {}) {
        try {
            // Enhanced debugging for troubleshooting asset loading issues
            console.log('\n🔍 ASSET FETCHING DEBUG INFO:');
            console.log('Received filters:', JSON.stringify(filters, null, 2));
            // Default pagination values
            const limit = filters.limit || 20;
            const offset = filters.offset || 0;
            // Security consideration: Always filter by user_id in production
            // In development, we allow access to all assets
            const isDevelopment = process.env.NODE_ENV !== 'production';
            console.log('Development mode:', isDevelopment);
            // Check for auth bypass flag (added for debugging Juniper client)
            // @ts-ignore - custom property
            const bypassAuth = filters.bypassAuth === true;
            console.log('Bypassing auth checks:', bypassAuth);
            // Priority to slug-based filtering
            if (filters.clientSlug) {
                console.log(`Looking up assets for client slug: ${filters.clientSlug}`);
                return this.getAssetsByClientSlug(filters.clientSlug, {
                    ...filters,
                    limit,
                    offset
                });
            }
            // Legacy support for clientId
            if (filters.clientId) {
                console.log(`Looking up assets for client ID: ${filters.clientId}`);
                // Try to resolve a client slug from the ID first for consistency
                const { data: client } = await supabaseClient_1.supabase
                    .from('clients')
                    .select('client_slug')
                    .eq('id', filters.clientId)
                    .maybeSingle();
                if (client?.client_slug) {
                    console.log(`Found client slug: ${client.client_slug} for ID: ${filters.clientId}`);
                    return this.getAssetsByClientSlug(client.client_slug, {
                        ...filters,
                        limit,
                        offset
                    });
                }
            }
            if (!isDevelopment && !filters.userId && !bypassAuth) {
                console.warn('Security warning: Attempting to fetch assets without userId filter in production');
                // In production, return empty result if no userId provided
                // This ensures security until proper RLS policies are implemented
                return { assets: [], total: 0 };
            }
            // Bypass verification temporarily to debug loading issues
            if (filters.clientId && filters.clientId.includes('fd790d19')) {
                console.log('\ud83d\udca1 Handling Juniper client request - bypassing normal filters');
                // EMERGENCY DEBUG: Check if assets table exists and has data
                try {
                    console.log('\n\n🔴 EMERGENCY DATABASE CHECK:\n');
                    // First just check if any assets exist at all
                    const { data: anyAssets, error: anyError } = await supabaseClient_1.supabase
                        .from('assets')
                        .select('id, name, client_id')
                        .limit(3);
                    console.log('Any assets in database?', anyAssets ? 'YES' : 'NO');
                    console.log(`Found ${anyAssets?.length || 0} total assets`);
                    if (anyAssets && anyAssets.length > 0) {
                        console.log('Sample assets:', anyAssets);
                        // Check specifically for any with client_id field populated
                        const assetsWithClientId = anyAssets.filter(a => a.client_id);
                        console.log(`Found ${assetsWithClientId.length} assets with client_id field populated`);
                        // Now try to find Juniper assets with various queries
                        console.log('\n🔍 Attempting different client_id search patterns:');
                        // Search pattern 1: Exact match
                        const { data: exactMatch } = await supabaseClient_1.supabase
                            .from('assets')
                            .select('id, name, client_id')
                            .eq('client_id', 'fd790d19-6610-4cd5-b90f-214808e94a19')
                            .limit(3);
                        console.log('Pattern 1 (exact match):', exactMatch?.length || 0, 'results');
                        // Search pattern 2: Contains first part
                        const { data: containsMatch } = await supabaseClient_1.supabase
                            .from('assets')
                            .select('id, name, client_id')
                            .ilike('client_id', '%fd790d19%')
                            .limit(3);
                        console.log('Pattern 2 (contains UUID part):', containsMatch?.length || 0, 'results');
                    }
                    console.log('\n🔴 END DATABASE CHECK\n\n');
                }
                catch (dbError) {
                    console.error('Database check error:', dbError);
                }
            }
            // First, get the total count of matching records
            let countQuery = supabaseClient_1.supabase
                .from('assets')
                .select('id', { count: 'exact' });
            // Apply user ID filter in production if not bypassed
            if (!isDevelopment && filters.userId && !bypassAuth) {
                countQuery = countQuery.eq('user_id', filters.userId);
            }
            // Apply client ID filter if available
            if (filters.clientId) {
                countQuery = countQuery.eq('client_id', filters.clientId);
            }
            // Apply type filter
            if (filters.type) {
                if (Array.isArray(filters.type) && filters.type.length > 0) {
                    countQuery = countQuery.in('type', filters.type);
                }
                else if (typeof filters.type === 'string' && filters.type !== 'all') {
                    countQuery = countQuery.eq('type', filters.type);
                }
            }
            // Apply search filters
            if (filters.searchTerm) {
                const searchTerm = filters.searchTerm.trim();
                if (searchTerm.length > 0) {
                    countQuery = countQuery.ilike('name', `%${searchTerm}%`);
                }
            }
            // Get total count
            const { count, error: countError } = await countQuery;
            if (countError) {
                console.error('Error counting assets:', countError);
                return { assets: [], total: 0 };
            }
            // Now build the data query
            let dataQuery = supabaseClient_1.supabase
                .from('assets')
                .select('*');
            // Apply the same filters to the data query
            if (!isDevelopment && filters.userId && !bypassAuth) {
                dataQuery = dataQuery.eq('user_id', filters.userId);
            }
            if (filters.clientId) {
                dataQuery = dataQuery.eq('client_id', filters.clientId);
            }
            if (filters.type) {
                if (Array.isArray(filters.type) && filters.type.length > 0) {
                    dataQuery = dataQuery.in('type', filters.type);
                }
                else if (typeof filters.type === 'string' && filters.type !== 'all') {
                    dataQuery = dataQuery.eq('type', filters.type);
                }
            }
            if (filters.searchTerm) {
                const searchTerm = filters.searchTerm.trim();
                if (searchTerm.length > 0) {
                    dataQuery = dataQuery.ilike('name', `%${searchTerm}%`);
                }
            }
            // Apply sorting
            const sortBy = filters.sortBy || 'createdAt';
            const sortDirection = filters.sortDirection || 'desc';
            // Map frontend field names to database field names
            let sortField;
            if (sortBy === 'name') {
                sortField = 'name';
            }
            else if (sortBy === 'createdAt') {
                sortField = 'created_at';
            }
            else if (sortBy === 'updatedAt') {
                sortField = 'updated_at';
            }
            else if (sortBy === 'usageCount') {
                sortField = 'meta->usageCount';
            }
            else {
                sortField = 'created_at';
            }
            // Apply sorting and pagination
            dataQuery = dataQuery
                .order(sortField, { ascending: sortDirection === 'asc' })
                .range(offset, offset + limit - 1);
            // Execute the query
            const { data: assets, error: assetsError } = await dataQuery;
            if (assetsError) {
                console.error('Error fetching assets:', assetsError);
                return { assets: [], total: 0 };
            }
            // Transform the results
            const transformedAssets = (assets || []).map(item => this.transformAssetFromDb(item));
            console.log(`Retrieved ${transformedAssets.length} assets (total: ${count || 0})`);
            return {
                assets: transformedAssets,
                total: count || 0
            };
        }
        catch (error) {
            console.error('Error in getAssets:', error);
            return { assets: [], total: 0 };
        }
    }
    /**
     * Get assets by client slug with optional filtering and pagination
     * @param slug The client slug to get assets for
     * @param options Optional filtering and pagination options
     * @returns Object containing paginated assets and total count
     */
    async getAssetsByClientSlug(slug, options = {}) {
        try {
            console.log(`Getting assets for client slug: ${slug}`);
            // Default pagination values
            const limit = options.limit || 20;
            const offset = options.offset || 0;
            // 1. Find the client ID from the slug
            const { data: client, error: clientError } = await supabaseClient_1.supabase
                .from('clients')
                .select('id')
                .eq('client_slug', slug.toLowerCase())
                .single();
            if (clientError) {
                console.error('Error finding client by slug:', clientError);
                return { assets: [], total: 0 };
            }
            if (!client) {
                console.log(`No client found for slug: ${slug}`);
                return { assets: [], total: 0 };
            }
            console.log(`Found client ID: ${client.id} for slug: ${slug}`);
            // 2. Build the base queries for assets
            let dataQuery = supabaseClient_1.supabase
                .from('assets')
                .select('*')
                .eq('client_id', client.id);
            let countQuery = supabaseClient_1.supabase
                .from('assets')
                .select('id', { count: 'exact' })
                .eq('client_id', client.id);
            // 3. Apply type filters
            if (options.type) {
                if (Array.isArray(options.type) && options.type.length > 0) {
                    dataQuery = dataQuery.in('type', options.type);
                    countQuery = countQuery.in('type', options.type);
                }
                else if (typeof options.type === 'string' && options.type !== 'all') {
                    dataQuery = dataQuery.eq('type', options.type);
                    countQuery = countQuery.eq('type', options.type);
                }
            }
            // 4. Apply search term filters
            if (options.searchTerm) {
                const searchTerm = options.searchTerm.trim();
                if (searchTerm.length > 0) {
                    // For simple searches, use basic pattern matching
                    if (searchTerm.length < 3 || !searchTerm.includes(' ')) {
                        const condition = `name.ilike.%${searchTerm}%,meta->description.ilike.%${searchTerm}%`;
                        dataQuery = dataQuery.or(condition);
                        countQuery = countQuery.or(condition);
                    }
                    else {
                        // For more complex searches, use full-text search capabilities
                        const formattedSearchTerm = searchTerm
                            .split(' ')
                            .filter(word => word.length > 0)
                            .map(word => word + ':*')
                            .join(' & ');
                        const condition = `name.wfts.${formattedSearchTerm},meta->description.wfts.${formattedSearchTerm}`;
                        dataQuery = dataQuery.or(condition);
                        countQuery = countQuery.or(condition);
                    }
                }
            }
            // 5. Apply favourite filter
            if (options.favouritesOnly) {
                dataQuery = dataQuery.eq('meta->isFavourite', true);
                countQuery = countQuery.eq('meta->isFavourite', true);
            }
            // 6. Get the total count
            const { count, error: countError } = await countQuery;
            if (countError) {
                console.error('Error counting assets:', countError);
            }
            // 7. Apply sorting
            const sortBy = options.sortBy || 'createdAt';
            const sortDirection = options.sortDirection || 'desc';
            // Map frontend field names to database field names
            let sortField;
            if (sortBy === 'name') {
                sortField = 'name';
            }
            else if (sortBy === 'createdAt') {
                sortField = 'created_at';
            }
            else if (sortBy === 'updatedAt') {
                sortField = 'updated_at';
            }
            else if (sortBy === 'usageCount') {
                sortField = 'meta->usageCount';
            }
            else {
                // Default to created_at for any other value
                sortField = 'created_at';
            }
            dataQuery = dataQuery
                .order(sortField, { ascending: sortDirection === 'asc' })
                .range(offset, offset + limit - 1);
            // 8. Execute query
            const { data: assets, error: assetError } = await dataQuery;
            if (assetError) {
                console.error('Error fetching assets by client ID:', assetError);
                return { assets: [], total: 0 };
            }
            console.log(`Found ${assets?.length || 0} assets for client slug ${slug} (total: ${count || 0})`);
            // 9. Transform the assets and return them
            const transformedAssets = (assets || []).map(item => this.transformAssetFromDb(item));
            return {
                assets: transformedAssets,
                total: count || 0
            };
        }
        catch (error) {
            console.error('Error in getAssetsByClientSlug:', error);
            return { assets: [], total: 0 };
        }
    }
    async getAssets(filters = {}) {
        try {
            // Enhanced debugging for troubleshooting asset loading issues
            console.log('\n🔍 ASSET FETCHING DEBUG INFO:');
            console.log('Received filters:', JSON.stringify(filters, null, 2));
            // Default pagination values
            const limit = filters.limit || 20;
            const offset = filters.offset || 0;
            // Security consideration: Always filter by user_id in production
            // In development, we allow access to all assets
            const isDevelopment = process.env.NODE_ENV !== 'production';
            console.log('Development mode:', isDevelopment);
            // Check for auth bypass flag (added for debugging Juniper client)
            // @ts-ignore - custom property
            const bypassAuth = filters.bypassAuth === true;
            console.log('Bypassing auth checks:', bypassAuth);
            // Priority to slug-based filtering
            if (filters.clientSlug) {
                console.log(`Looking up assets for client slug: ${filters.clientSlug}`);
                return this.getAssetsByClientSlug(filters.clientSlug, {
                    ...filters,
                    limit,
                    offset
                });
            }
            // Legacy support for clientId
            if (filters.clientId) {
                console.log(`Looking up assets for client ID: ${filters.clientId}`);
                // Try to resolve a client slug from the ID first for consistency
                const { data: client } = await supabaseClient_1.supabase
                    .from('clients')
                    .select('client_slug')
                    .eq('id', filters.clientId)
                    .maybeSingle();
                if (client?.client_slug) {
                    console.log(`Found client slug: ${client.client_slug} for ID: ${filters.clientId}`);
                    return this.getAssetsByClientSlug(client.client_slug, {
                        ...filters,
                        limit,
                        offset
                    });
                }
            }
            if (!isDevelopment && !filters.userId && !bypassAuth) {
                console.warn('Security warning: Attempting to fetch assets without userId filter in production');
                // In production, return empty result if no userId provided
                // This ensures security until proper RLS policies are implemented
                return { assets: [], total: 0 };
            }
            // Bypass verification temporarily to debug loading issues
            if (filters.clientId && filters.clientId.includes('fd790d19')) {
                console.log('\ud83d\udca1 Handling Juniper client request - bypassing normal filters');
                // EMERGENCY DEBUG: Check if assets table exists and has data
                try {
                    console.log('\n\n🔴 EMERGENCY DATABASE CHECK:\n');
                    // First just check if any assets exist at all
                    const { data: anyAssets, error: anyError } = await supabaseClient_1.supabase
                        .from('assets')
                        .select('id, name, client_id')
                        .limit(3);
                    console.log('Any assets in database?', anyAssets ? 'YES' : 'NO');
                    console.log(`Found ${anyAssets?.length || 0} total assets`);
                    if (anyAssets && anyAssets.length > 0) {
                        console.log('Sample assets:', anyAssets);
                        // Check specifically for any with client_id field populated
                        const assetsWithClientId = anyAssets.filter(a => a.client_id);
                        console.log(`Found ${assetsWithClientId.length} assets with client_id field populated`);
                        // Now try to find Juniper assets with various queries
                        console.log('\n🔍 Attempting different client_id search patterns:');
                        // Search pattern 1: Exact match
                        const { data: exactMatch } = await supabaseClient_1.supabase
                            .from('assets')
                            .select('id, name, client_id')
                            .eq('client_id', 'fd790d19-6610-4cd5-b90f-214808e94a19')
                            .limit(3);
                        console.log('Pattern 1 (exact match):', exactMatch?.length || 0, 'results');
                        // Search pattern 2: Contains first part
                        const { data: containsMatch } = await supabaseClient_1.supabase
                            .from('assets')
                            .select('id, name, client_id')
                            .ilike('client_id', '%fd790d19%')
                            .limit(3);
                        console.log('Pattern 2 (contains UUID part):', containsMatch?.length || 0, 'results');
                    }
                    console.log('\n🔴 END DATABASE CHECK\n\n');
                }
                catch (dbError) {
                    console.error('Database check error:', dbError);
                }
            }
            // First, get the total count of matching records
            let countQuery = supabaseClient_1.supabase
                .from('assets')
                .select('id', { count: 'exact' });
            // Apply all filters to the count query
            countQuery = await this.applyFiltersToQuery(countQuery, filters);
            const { count: total, error: countError } = await countQuery;
            if (countError) {
                throw new Error(`Failed to count assets: ${countError.message}`);
            }
            // Then, get the paginated data
            let dataQuery = supabaseClient_1.supabase
                .from('assets')
                .select('*');
            // Apply all filters to the data query
            dataQuery = await this.applyFiltersToQuery(dataQuery, filters);
            // Check if dataQuery is a valid Supabase query object
            // If not, it might be a direct response from a custom handler in applyFiltersToQuery
            if (dataQuery && typeof dataQuery.order !== 'function') {
                // This might be a direct response object instead of a query
                if (dataQuery.assets && typeof dataQuery.total === 'number') {
                    console.log('Using direct response from filter handler');
                    return dataQuery;
                }
                // If it's not a valid query object or a direct response, log error and return empty results
                console.error('Invalid query object returned from applyFiltersToQuery');
                return { assets: [], total: 0 };
            }
            // Apply sorting with proper field mapping
            const sortBy = filters.sortBy || 'createdAt';
            const sortDirection = filters.sortDirection || 'desc';
            // Map frontend field names to database field names
            let sortField;
            if (sortBy === 'name') {
                sortField = 'name';
            }
            else if (sortBy === 'createdAt') {
                sortField = 'created_at';
            }
            else if (sortBy === 'updatedAt') {
                sortField = 'updated_at';
            }
            else if (sortBy === 'usageCount') {
                // Sort by meta->usageCount for this field
                sortField = 'meta->usageCount';
            }
            else {
                // Default to created_at if unrecognized
                sortField = 'created_at';
            }
            // Now we can safely call the order method
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
        }
        catch (error) {
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
    async applyFiltersToQuery(query, filters) {
        // Apply user ID filter if provided
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }
        // Handle client filtering either by ID or slug
        if (filters.clientId || filters.clientSlug) {
            // Priority to slug-based filtering (more reliable)
            if (filters.clientSlug) {
                console.log('🔶 Applying clientSlug filter:', filters.clientSlug);
                // First, we need to get the client ID matching this slug
                const lookupClientId = async (slug) => {
                    const { data: client, error } = await supabaseClient_1.supabase
                        .from('clients')
                        .select('id')
                        .eq('client_slug', slug.toLowerCase())
                        .single();
                    if (error) {
                        console.error('Error finding client by slug:', error);
                        return null;
                    }
                    if (client) {
                        console.log(`🔑 Found client with ID ${client.id} for slug ${slug}`);
                        return client.id;
                    }
                    return null;
                };
                // Look up the client ID and apply it to the query
                const clientId = await lookupClientId(filters.clientSlug);
                if (clientId) {
                    query = query.eq('client_id', clientId);
                    return query;
                }
                else {
                    // If we couldn't find a client with this slug, return an empty query
                    // This is important so we don't accidentally return all assets
                    console.log('⚠️ No client found with this slug, returning empty query');
                    // Use a condition that will always be false
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                    return query;
                }
            }
            // Only if no slug or slug lookup failed, use client ID
            else if (filters.clientId) {
                console.log('🔷 Applying clientId filter:', filters.clientId);
                // Special handling for Juniper client ID 
                if (filters.clientId === 'fd790d19-6610-4cd5-b90f-214808e94a19' ||
                    (typeof filters.clientId === 'string' && filters.clientId.includes('fd790d19'))) {
                    console.log('⚠️ Special handling for Juniper client ID');
                    // FIXED: The client_id column appears to be a UUID type, which doesn't support ilike
                    // We need to use only equality operators for UUID fields
                    console.log('🛠 Using UUID-safe query methods');
                    // Use exact match on the canonical ID
                    query = query.or(`client_id.eq.fd790d19-6610-4cd5-b90f-214808e94a19`);
                }
                else {
                    // For normal client IDs, use only equality based on UUID type limitations
                    query = query.or(
                    // Exact match only - UUID fields don't support pattern matching
                    `client_id.eq.${filters.clientId}`);
                }
            }
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
                query = query.or(`name.ilike.%${searchTerm}%,` +
                    `meta->description.ilike.%${searchTerm}%`);
            }
            else {
                // For more complex searches, use PostgreSQL's full-text search capabilities
                // Convert the search term to a format suitable for full-text search
                const formattedSearchTerm = searchTerm
                    .split(' ')
                    .filter(word => word.length > 0)
                    .map(word => word + ':*')
                    .join(' & ');
                // Use full-text search on both name and meta->description
                // This provides more relevant results for multi-word searches
                query = query.or(`name.wfts.${formattedSearchTerm},` +
                    `meta->description.wfts.${formattedSearchTerm}`);
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
    async getAssetById(id) {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('assets')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                throw new Error(`Failed to fetch asset: ${error.message}`);
            }
            return data ? this.transformAssetFromDb(data) : null;
        }
        catch (error) {
            console.error(`Error fetching asset with ID ${id}:`, error);
            throw new Error(`Failed to fetch asset: ${error.message}`);
        }
    }
    /**
     * Update asset
     * Enhanced to handle Supabase meta field structure and security checks
     */
    async updateAsset(id, userId, updates) {
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
            const dbUpdates = {
                updated_at: new Date().toISOString()
            };
            // Handle top-level fields
            if (updates.name !== undefined) {
                dbUpdates.name = updates.name;
            }
            // Initialize meta updates based on existing meta data
            const metaUpdates = {};
            // Handle nested meta fields
            if (updates.description !== undefined)
                metaUpdates.description = updates.description;
            if (updates.tags !== undefined)
                metaUpdates.tags = updates.tags;
            if (updates.categories !== undefined)
                metaUpdates.categories = updates.categories;
            if (updates.isFavourite !== undefined)
                metaUpdates.isFavourite = updates.isFavourite;
            // Only add meta update if there are changes
            if (Object.keys(metaUpdates).length > 0) {
                // Get the current meta to update
                const { data: currentData, error: fetchError } = await supabaseClient_1.supabase
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
            const { data, error } = await supabaseClient_1.supabase
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
                }
                else if (error.code === '23505') { // Unique constraint error
                    return {
                        success: false,
                        message: 'Failed to update asset: Duplicate key violation',
                        code: 409
                    };
                }
                else {
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
        }
        catch (error) {
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
    async deleteAsset(id, userId) {
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
                const urlStr = url;
                const filename = urlStr.includes('/uploads/') ?
                    urlStr.substring(urlStr.lastIndexOf('/uploads/') + 9) :
                    urlStr;
                return path_1.default.join(this.uploadsDir, filename);
            });
            // Delete from database with proper error handling
            const { error } = await supabaseClient_1.supabase
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
                }
                else {
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
                    if (fs_1.default.existsSync(filePath)) {
                        await unlink(filePath);
                    }
                }
                catch (fileError) {
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
        }
        catch (error) {
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
    async toggleFavourite(id, userId, isFavourite) {
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
            const { data: currentData, error: fetchError } = await supabaseClient_1.supabase
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
            const { data, error } = await supabaseClient_1.supabase
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
        }
        catch (error) {
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
    async incrementUsageCount(id) {
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
            const { data: currentData, error: fetchError } = await supabaseClient_1.supabase
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
            const { data, error } = await supabaseClient_1.supabase
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
        }
        catch (error) {
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
    async getAvailableTags() {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('assets')
                .select('meta');
            if (error) {
                throw new Error(`Failed to fetch tags: ${error.message}`);
            }
            // Extract all tags from the meta field and remove duplicates
            const allTags = data.flatMap(asset => asset.meta?.tags || []);
            return [...new Set(allTags)];
        }
        catch (error) {
            console.error('Error fetching tags:', error);
            throw new Error(`Failed to fetch tags: ${error.message}`);
        }
    }
    /**
     * Get available asset categories
     * Updated to work with meta field structure
     */
    async getAvailableCategories() {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('assets')
                .select('meta');
            if (error) {
                throw new Error(`Failed to fetch categories: ${error.message}`);
            }
            // Extract all categories from the meta field and remove duplicates
            const allCategories = data.flatMap(asset => asset.meta?.categories || []);
            return [...new Set(allCategories)];
        }
        catch (error) {
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
    async batchUpdateAssets(assetIds, userId, updates) {
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
            const updatedAssets = [];
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
                    const { data: currentData, error: fetchError } = await supabaseClient_1.supabase
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
                        const filteredTags = tags.filter(tag => !updates.removeTags.includes(tag));
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
                        const filteredCategories = categories.filter(cat => !updates.removeCategories.includes(cat));
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
                    const { data, error } = await supabaseClient_1.supabase
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
                }
                catch (assetError) {
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
        }
        catch (error) {
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
    async batchDeleteAssets(assetIds, userId) {
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
            const errors = {};
            // Process each asset deletion separately to maintain proper security
            // and error handling for each asset
            for (const assetId of assetIds) {
                try {
                    const result = await this.deleteAsset(assetId, userId);
                    if (result.success) {
                        deletedCount++;
                    }
                    else {
                        failedCount++;
                        errors[assetId] = result.message || 'Unknown error';
                    }
                }
                catch (assetError) {
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
        }
        catch (error) {
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
    async generateRlsPolicySql() {
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
    getDbFieldName(apiFieldName) {
        const fieldMap = {
            'name': 'name',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            'usageCount': 'usage_count',
            'date': 'created_at' // Map 'date' field to 'created_at' for compatibility
        };
        return fieldMap[apiFieldName] || apiFieldName;
    }
    /**
     * Transform asset from database format to API format
     * Handles the Supabase schema with nested metadata in the meta field
     */
    transformAssetFromDb(dbAsset) {
        // Extract metadata from the meta field if it exists
        const meta = dbAsset.meta || {};
        // Process client ID with special handling for known problematic clients
        let clientId = dbAsset.client_id || meta.clientId || '';
        // Special handling for Juniper client ID - standardize to the expected format
        if (clientId && (clientId.includes('fd790d19') || clientId.includes('Juniper'))) {
            // Always use the canonical Juniper client ID
            clientId = 'fd790d19-6610-4cd5-b90f-214808e94a19';
            console.log(`⚠️ Normalized Juniper client ID for asset ${dbAsset.id}`);
        }
        // Log asset transformation for debugging
        if (clientId) {
            console.log(`Asset ${dbAsset.id} associated with client: ${clientId}`);
        }
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
            clientId: clientId, // Use our processed and normalized client ID
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
exports.assetService = new AssetService();
