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
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const unlink = (0, util_1.promisify)(fs_1.default.unlink);
const stat = (0, util_1.promisify)(fs_1.default.stat);
/**
 * Service for managing assets
 */
class AssetService {
    constructor() {
        this.uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        this.ensureUploadsDir();
    }
    /**
     * Initialize the uploads directory
     */
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
     * Transform database asset to application asset
     * This handles the conversion between DB column names and application properties
     * Ensures all required fields for UI compatibility are present
     */
    transformAssetFromDb(dbAsset) {
        // Extract metadata from the DB format
        const meta = dbAsset.meta || {};
        // Normalize owner_id to ensure it's never null (use user_id if owner_id is missing)
        const normalizedOwnerId = dbAsset.owner_id || dbAsset.user_id || '';
        // If the owner_id is missing in the database, update it
        if (!dbAsset.owner_id && dbAsset.user_id) {
            try {
                console.log(`Fixing missing owner_id for asset ${dbAsset.id} using user_id ${dbAsset.user_id}`);
                // Don't await this to avoid slowing down the response
                supabaseClient_1.supabase
                    .from('assets')
                    .update({
                    owner_id: dbAsset.user_id
                })
                    .eq('id', dbAsset.id)
                    .then(({ error }) => {
                    if (error) {
                        console.error(`Failed to update owner_id for asset ${dbAsset.id}:`, error);
                    }
                    else {
                        console.log(`Successfully updated owner_id for asset ${dbAsset.id}`);
                    }
                });
            }
            catch (error) {
                console.error(`Error updating owner_id for asset ${dbAsset.id}:`, error);
            }
        }
        // Create normalized metadata for UI compatibility
        const normalizedMetadata = {
            originalName: meta.originalName || `${dbAsset.name}.${dbAsset.type}`,
            mimeType: meta.mimeType || this.getMimeTypeFromType(dbAsset.type),
            description: meta.description || '',
            size: meta.size || 0,
            width: meta.width || 0,
            height: meta.height || 0,
            duration: meta.duration || 0,
            tags: meta.tags || [],
            categories: meta.categories || [],
            isFavourite: meta.isFavourite || false,
            usageCount: meta.usageCount || 0
        };
        // Create asset with both snake_case and camelCase properties for maximum compatibility
        return {
            // DB fields (direct mapping)
            id: dbAsset.id,
            name: dbAsset.name,
            type: dbAsset.type,
            url: dbAsset.url,
            thumbnailUrl: dbAsset.thumbnail_url || '',
            previewUrl: meta.previewUrl || '',
            // UI expected fields (derived from meta or with defaults)
            description: normalizedMetadata.description,
            size: normalizedMetadata.size,
            width: normalizedMetadata.width,
            height: normalizedMetadata.height,
            duration: normalizedMetadata.duration,
            tags: normalizedMetadata.tags,
            categories: normalizedMetadata.categories,
            isFavourite: normalizedMetadata.isFavourite,
            usageCount: normalizedMetadata.usageCount,
            // User/client identifiers - standardized to camelCase
            userId: dbAsset.user_id || '',
            ownerId: normalizedOwnerId,
            clientId: dbAsset.client_id || meta.clientId || '',
            // Store the clientSlug if available for URL-friendly identification
            clientSlug: meta.clientSlug || '',
            // Timestamps in both formats
            createdAt: dbAsset.created_at,
            created_at: dbAsset.created_at,
            updatedAt: dbAsset.updated_at,
            updated_at: dbAsset.updated_at,
            // Both metadata formats
            metadata: normalizedMetadata,
            meta: {
                ...meta,
                ...normalizedMetadata
            }
        };
    }
    /**
     * Helper method to get MIME type from asset type
     */
    getMimeTypeFromType(type) {
        switch (type) {
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
    async lookupClientId(slug) {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('clients')
                .select('id')
                .eq('slug', slug.toLowerCase())
                .single();
            if (error) {
                console.error(`Error looking up client ID for slug ${slug}:`, error);
                return null;
            }
            return data?.id || null;
        }
        catch (error) {
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
    async uploadAsset(file, userId, assetData) {
        // Import AUTH_MODE here to avoid circular dependency
        const { AUTH_MODE } = require('../middleware/auth');
        try {
            console.log('Asset upload initiated:', {
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
                userId,
                clientId: assetData.clientId
            });
            // Use proper auth user when in development mode
            if (!userId || userId === 'null' || userId === 'undefined' || userId === AUTH_MODE.DEV_USER_ID) {
                // Admin user from auth.users table (dev@example.com) - this user exists in the auth system
                const ADMIN_USER_ID = 'd53c7f82-42af-4ed0-a83b-2cbf505748db'; // Correct ID for dev@example.com
                console.log('⚠️ DEV MODE: Using authenticated admin user with ID:', ADMIN_USER_ID);
                // Verify the admin user exists in the database
                const { data: adminUser, error: adminUserError } = await supabaseClient_1.supabase
                    .from('users')
                    .select('id, email, name, role')
                    .eq('id', ADMIN_USER_ID)
                    .single();
                if (adminUserError || !adminUser) {
                    console.error('❌ Admin user not found in database:', adminUserError);
                    return {
                        success: false,
                        message: 'Failed to verify admin user exists in database. Asset upload aborted.',
                        asset: null
                    };
                }
                else {
                    console.log('✅ Admin user verified in database:', adminUser);
                    // Set the userId to the admin user
                    userId = ADMIN_USER_ID;
                }
            }
            // Validate essential parameters
            if (!file) {
                return {
                    success: false,
                    message: 'No file provided',
                    asset: null
                };
            }
            if (!userId) {
                return {
                    success: false,
                    message: 'User ID is required',
                    asset: null
                };
            }
            if (!assetData.clientId) {
                return {
                    success: false,
                    message: 'Client ID is required',
                    asset: null
                };
            }
            // Generate a unique ID for the asset
            const assetId = (0, uuid_1.v4)();
            // Determine asset type based on MIME type if not specified
            const assetType = assetData.type || this.determineAssetType(file.mimetype);
            // Create relative path for the file within uploads directory
            const relativePath = path_1.default.join('clients', assetData.clientId, 'assets', assetType, assetId);
            // Create absolute path for the file
            const assetDir = path_1.default.join(this.uploadsDir, relativePath);
            await mkdir(assetDir, { recursive: true });
            // Original filename with extension
            const originalExt = path_1.default.extname(file.originalname);
            const originalFileName = `original${originalExt}`;
            const filePath = path_1.default.join(assetDir, originalFileName);
            // Write the file to disk
            await writeFile(filePath, file.buffer);
            // Create the asset object
            const asset = {
                id: assetId,
                name: assetData.name || file.originalname,
                type: assetType,
                description: assetData.description || '',
                url: `/uploads/${relativePath}/${originalFileName}`,
                thumbnailUrl: '',
                size: file.size,
                userId,
                ownerId: userId,
                clientId: assetData.clientId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                tags: assetData.tags || [],
                categories: assetData.categories || [],
                isFavourite: false,
                usageCount: 0,
                metadata: assetData.additionalMetadata || {}
            };
            // Process the asset based on its type
            if (assetType === 'image') {
                await this.processImageAsset(asset, filePath);
            }
            else if (assetType === 'video') {
                await this.processVideoAsset(asset, filePath);
            }
            else if (assetType === 'audio') {
                await this.processAudioAsset(asset, filePath);
            }
            // Check if we need to use the development user ID
            if (!userId || userId === 'null' || userId === 'undefined') {
                console.log(`No valid user ID provided, using development user ID (${AUTH_MODE.DEV_USER_ID}) for upload`);
                userId = AUTH_MODE.DEV_USER_ID;
            }
            console.log(`[ASSET UPLOAD] Using user ID: ${userId}`);
            // Check if the user exists in the database, especially important for development user
            if (userId === AUTH_MODE.DEV_USER_ID) {
                console.log('🔍 Checking if development user exists in database...');
                const { data: userExists, error: userCheckError } = await supabaseClient_1.supabase
                    .from('users')
                    .select('id')
                    .eq('id', userId)
                    .single();
                if (userCheckError || !userExists) {
                    console.log('⚠️ Development user not found, creating it now...');
                    // Create development user if it doesn't exist
                    const { error: createError } = await supabaseClient_1.supabase
                        .from('users')
                        .insert({
                        id: AUTH_MODE.DEV_USER_ID,
                        email: 'dev@airwave.dev',
                        name: 'Development User',
                        role: 'admin',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    if (createError) {
                        console.error('❌ Failed to create development user:', createError);
                        return {
                            success: false,
                            message: `Failed to create development user: ${createError.message}`,
                            asset: asset
                        };
                    }
                    console.log('✅ Development user created successfully');
                }
                else {
                    console.log('✅ Development user exists in database');
                }
            }
            // Always save to database regardless of mode
            try {
                // First, perform an explicit check if the asset will work with this user
                const { data: userCheck, error: userCheckError } = await supabaseClient_1.supabase
                    .from('users')
                    .select('id')
                    .eq('id', userId);
                if (userCheckError || !userCheck || userCheck.length === 0) {
                    console.log('⚠️ Final validation failed - user not found in database. Attempting alternative approach...');
                    // If user still doesn't exist after our checks, try one final approach
                    // Insert user directly with all fields
                    const { error: lastResortError } = await supabaseClient_1.supabase
                        .from('users')
                        .upsert({
                        id: userId === AUTH_MODE.DEV_USER_ID ? AUTH_MODE.DEV_USER_ID : userId,
                        email: userId === AUTH_MODE.DEV_USER_ID ? 'dev@airwave.dev' : `user-${userId}@example.com`,
                        name: userId === AUTH_MODE.DEV_USER_ID ? 'Development User' : 'Unknown User',
                        role: 'user',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });
                    if (lastResortError) {
                        console.error('❌ Final user creation attempt failed:', lastResortError);
                    }
                    else {
                        console.log('✅ User created/updated using upsert approach');
                    }
                }
                // Now insert the asset with explicit field setting
                console.log(`Inserting asset with user_id: ${userId}`);
                // Ensure URL is always set - this is a required field
                if (!asset.url) {
                    console.warn('⚠️ Asset URL is not set - using fallback');
                    asset.url = `/uploads/${asset.id}`;
                }
                const dbAsset = {
                    id: asset.id,
                    name: asset.name,
                    type: asset.type,
                    url: asset.url, // Required field - NOT NULL constraint
                    thumbnail_url: asset.thumbnailUrl || null,
                    user_id: userId, // Use the userId we've determined
                    owner_id: userId, // Use the userId we've determined
                    client_id: asset.clientId || 'default',
                    meta: {
                        description: asset.description || '',
                        tags: asset.tags || [],
                        categories: asset.categories || []
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                // Perform the insert operation
                const { data, error } = await supabaseClient_1.supabase
                    .from('assets')
                    .insert(dbAsset)
                    .select()
                    .single();
                if (error) {
                    console.error('Error saving asset to database:', error);
                    // If we still get a foreign key error, try more approaches with the dev user
                    if (error.code === '23503' && userId === AUTH_MODE.DEV_USER_ID) {
                        console.log('⚠️ Foreign key constraint still failing. Trying alternative approaches...');
                        console.log('Details:', error.details);
                        // APPROACH 1: Try inserting with stringified meta data
                        try {
                            console.log('Approach 1: Inserting with stringified meta data');
                            const { data: approach1Data, error: approach1Error } = await supabaseClient_1.supabase
                                .from('assets')
                                .insert({
                                ...dbAsset,
                                meta: JSON.stringify(dbAsset.meta)
                            })
                                .select()
                                .single();
                            if (!approach1Error) {
                                console.log('✅ Asset saved using approach 1');
                                return {
                                    success: true,
                                    message: 'Asset uploaded successfully with approach 1',
                                    asset: this.transformAssetFromDb(approach1Data)
                                };
                            }
                            console.log('Approach 1 failed:', approach1Error);
                            // APPROACH 2: Try upsert instead of insert
                            console.log('Approach 2: Using upsert instead of insert');
                            const { data: approach2Data, error: approach2Error } = await supabaseClient_1.supabase
                                .from('assets')
                                .upsert(dbAsset)
                                .select()
                                .single();
                            if (!approach2Error) {
                                console.log('✅ Asset saved using approach 2');
                                return {
                                    success: true,
                                    message: 'Asset uploaded successfully with approach 2',
                                    asset: this.transformAssetFromDb(approach2Data)
                                };
                            }
                            console.log('Approach 2 failed:', approach2Error);
                            // APPROACH 3: Minimal insert with only required fields
                            console.log('Approach 3: Minimal insert with only required fields');
                            const { data: approach3Data, error: approach3Error } = await supabaseClient_1.supabase
                                .from('assets')
                                .insert({
                                id: asset.id,
                                name: asset.name,
                                type: asset.type,
                                url: asset.url || `/uploads/${asset.id}`, // Ensure URL is never null
                                user_id: AUTH_MODE.DEV_USER_ID,
                                client_id: asset.clientId || 'default',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                                .select()
                                .single();
                            if (!approach3Error) {
                                console.log('✅ Asset saved using approach 3');
                                return {
                                    success: true,
                                    message: 'Asset uploaded successfully with approach 3',
                                    asset: this.transformAssetFromDb(approach3Data)
                                };
                            }
                            console.log('Approach 3 failed:', approach3Error);
                        }
                        catch (alternativeError) {
                            console.error('❌ All alternative approaches failed:', alternativeError);
                        }
                    }
                    return {
                        success: false,
                        message: `Failed to save asset: ${error.message}`,
                        asset: asset
                    };
                }
                console.log(`Successfully saved asset to database with ID: ${data.id}`);
                return {
                    success: true,
                    message: 'Asset uploaded successfully',
                    asset: this.transformAssetFromDb(data)
                };
            }
            catch (dbError) {
                console.error('Exception saving asset to database:', dbError);
                return {
                    success: false,
                    message: `Failed to save asset: ${dbError.message}`,
                    asset: asset
                };
            }
        }
        catch (error) {
            console.error('Error uploading asset:', error);
            return {
                success: false,
                message: `Failed to upload asset: ${error.message}`,
                asset: null
            };
        }
    }
    /**
     * Determine the asset type based on MIME type
     */
    determineAssetType(mimetype) {
        if (mimetype.startsWith('image/')) {
            return 'image';
        }
        else if (mimetype.startsWith('video/')) {
            return 'video';
        }
        else if (mimetype.startsWith('audio/')) {
            return 'audio';
        }
        else if (mimetype.includes('pdf')) {
            return 'document';
        }
        else if (mimetype.includes('text/') ||
            mimetype.includes('application/json') ||
            mimetype.includes('xml')) {
            return 'copy';
        }
        else {
            return 'other';
        }
    }
    /**
     * Process image assets - generate thumbnails and extract metadata
     */
    async processImageAsset(asset, filePath) {
        try {
            console.log(`Processing image asset: ${asset.name}`);
            // Extract metadata using sharp
            const metadata = await (0, sharp_1.default)(filePath).metadata();
            // Update asset with metadata
            asset.width = metadata.width;
            asset.height = metadata.height;
            // Generate thumbnail
            const assetDir = path_1.default.dirname(filePath);
            const thumbnailFileName = 'thumbnail.jpg';
            const thumbnailPath = path_1.default.join(assetDir, thumbnailFileName);
            await (0, sharp_1.default)(filePath)
                .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);
            // Update asset with thumbnail URL
            asset.thumbnailUrl = `${asset.url.substring(0, asset.url.lastIndexOf('/'))}/${thumbnailFileName}`;
        }
        catch (error) {
            console.error(`Error processing image asset: ${error.message}`);
            // Continue with the upload even if image processing fails
        }
    }
    /**
     * Process video assets - generate thumbnails and extract metadata
     */
    async processVideoAsset(asset, filePath) {
        try {
            console.log(`Processing video asset: ${asset.name}`);
            // Get video directory
            const assetDir = path_1.default.dirname(filePath);
            const thumbnailFileName = 'thumbnail.jpg';
            const thumbnailPath = path_1.default.join(assetDir, thumbnailFileName);
            // Extract a thumbnail from the video at the 1 second mark
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(filePath)
                    .on('error', (err) => {
                    console.error('Error generating video thumbnail:', err);
                    resolve(); // Continue even if thumbnail generation fails
                })
                    .on('end', () => {
                    // Update asset with thumbnail URL
                    asset.thumbnailUrl = `${asset.url.substring(0, asset.url.lastIndexOf('/'))}/${thumbnailFileName}`;
                    // Try to get video metadata
                    fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                        if (err) {
                            console.error('Error getting video metadata:', err);
                            resolve();
                            return;
                        }
                        try {
                            if (metadata && metadata.streams && metadata.streams.length > 0) {
                                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                                if (videoStream) {
                                    asset.width = videoStream.width;
                                    asset.height = videoStream.height;
                                    // Convert duration from seconds to milliseconds
                                    if (videoStream.duration) {
                                        asset.duration = Math.round(parseFloat(videoStream.duration) * 1000);
                                    }
                                    else if (metadata.format && metadata.format.duration) {
                                        asset.duration = Math.round(parseFloat(metadata.format.duration) * 1000);
                                    }
                                }
                            }
                        }
                        catch (metadataError) {
                            console.error('Error parsing video metadata:', metadataError);
                        }
                        resolve();
                    });
                })
                    .screenshots({
                    count: 1,
                    folder: assetDir,
                    filename: thumbnailFileName,
                    timemarks: ['1']
                });
            });
        }
        catch (error) {
            console.error(`Error processing video asset: ${error.message}`);
            // Continue with the upload even if video processing fails
        }
    }
    /**
     * Process audio assets - generate waveform images and extract metadata
     */
    async processAudioAsset(asset, filePath) {
        try {
            console.log(`Processing audio asset: ${asset.name}`);
            // This would typically generate a waveform image and extract audio metadata
            // For now, we'll just extract basic metadata
            return new Promise((resolve, reject) => {
                fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                    if (err) {
                        console.error('Error getting audio metadata:', err);
                        resolve();
                        return;
                    }
                    try {
                        if (metadata && metadata.format && metadata.format.duration) {
                            // Convert duration from seconds to milliseconds
                            asset.duration = Math.round(parseFloat(metadata.format.duration) * 1000);
                        }
                    }
                    catch (metadataError) {
                        console.error('Error parsing audio metadata:', metadataError);
                    }
                    resolve();
                });
            });
        }
        catch (error) {
            console.error(`Error processing audio asset: ${error.message}`);
            // Continue with the upload even if audio processing fails
        }
    }
    /**
     * Get assets with filters
     * @param filters Filters to apply when retrieving assets
     */
    async getAssets(filters = {}) {
        try {
            console.log('🔍 DEBUG: Asset fetch initiated with filters:', JSON.stringify(filters, null, 2));
            // Debug check if development user ID exists
            const { data: devUserCheck, error: devUserError } = await supabaseClient_1.supabase
                .from('users')
                .select('id')
                .eq('id', auth_1.AUTH_MODE.DEV_USER_ID)
                .single();
            console.log('🔍 DEBUG: Development user check:', devUserCheck ? 'User exists' : 'User DOES NOT exist', devUserError ? `Error: ${devUserError.message}` : 'No error');
            // Debug check if any assets exist for dev user
            const { data: assetCountCheck, error: assetCountError } = await supabaseClient_1.supabase
                .from('assets')
                .select('id', { count: 'exact' })
                .eq('user_id', auth_1.AUTH_MODE.DEV_USER_ID);
            console.log('🔍 DEBUG: Asset count for dev user:', assetCountCheck !== null ? `Found ${assetCountCheck.length} assets` : 'No assets found', assetCountError ? `Error: ${assetCountError.message}` : 'No error');
            // Default pagination values
            const limit = filters.limit || 50;
            const offset = filters.offset || 0;
            // First, get the count for pagination
            let countQuery = supabaseClient_1.supabase
                .from('assets')
                .select('id', { count: 'exact' });
            // Apply filters to count query
            countQuery = this.applyFiltersToQuery(countQuery, filters);
            const { count, error: countError } = await countQuery;
            if (countError) {
                console.error('Error counting assets:', countError);
                return { assets: [], total: 0 };
            }
            // Then, get the paginated data
            let dataQuery = supabaseClient_1.supabase
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
                let dbSortField = filters.sortBy;
                // Map client-side field names to actual database column names
                if (dbSortField === 'createdAt')
                    dbSortField = 'created_at';
                if (dbSortField === 'updatedAt')
                    dbSortField = 'updated_at';
                if (dbSortField === 'date')
                    dbSortField = 'created_at'; // Map 'date' to 'created_at'
                if (dbSortField === 'usageCount')
                    dbSortField = 'meta->>usageCount';
                if (dbSortField === 'name')
                    dbSortField = 'name';
                const sortDirection = filters.sortDirection || 'desc';
                dataQuery = dataQuery.order(dbSortField, { ascending: sortDirection === 'asc' });
            }
            else {
                // Default sorting by most recently created
                dataQuery = dataQuery.order('created_at', { ascending: false });
            }
            const { data, error: dataError } = await dataQuery;
            if (dataError) {
                console.error('Error fetching assets:', dataError);
                return { assets: [], total: 0 };
            }
            // Transform DB assets to application assets
            const assets = data.map(item => this.transformAssetFromDb(item));
            return {
                assets,
                total: count || 0
            };
        }
        catch (error) {
            console.error('Error in getAssets:', error);
            return { assets: [], total: 0 };
        }
    }
    /**
     * Helper method to apply filters to a Supabase query
     */
    applyFiltersToQuery(query, filters) {
        // Filter by client ID 
        if (filters.clientId) {
            query = query.eq('client_id', filters.clientId);
        }
        // Handle client filtering by slug (more reliable)
        if (filters.clientSlug) {
            // We need to handle this case separately as it requires a join or subquery
            // For simplicity in this implementation, we'll log this case
            console.warn('Client slug filtering requires a join or subquery - implement based on your DB schema');
        }
        // Filter by user ID - always ensure there's a valid user ID filter
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }
        else {
            // If no user ID provided, use the development user ID
            console.log(`Using development user ID (${auth_1.AUTH_MODE.DEV_USER_ID}) for asset retrieval`);
            query = query.eq('user_id', auth_1.AUTH_MODE.DEV_USER_ID);
        }
        // Filter by type
        if (filters.type && filters.type.length > 0) {
            query = query.in('type', filters.type);
        }
        // Filter by search term (search in name, description)
        if (filters.searchTerm) {
            const term = filters.searchTerm.trim();
            if (term) {
                // Use ILIKE for case-insensitive search
                query = query.or(`name.ilike.%${term}%, meta->>description.ilike.%${term}%`);
            }
        }
        // Filter by favourites
        if (filters.favouritesOnly) {
            query = query.eq('meta->>isFavourite', 'true');
        }
        // Tags and categories filters use containment operators
        if (filters.tags && filters.tags.length > 0) {
            // Assumes tags are stored as a JSON array in the meta field
            const tagConditions = filters.tags.map(tag => `meta->tags.cs.{"${tag}"}`).join(',');
            query = query.or(tagConditions);
        }
        if (filters.categories && filters.categories.length > 0) {
            const categoryConditions = filters.categories.map(category => `meta->categories.cs.{"${category}"}`).join(',');
            query = query.or(categoryConditions);
        }
        return query;
    }
    /**
     * Get a single asset by ID
     */
    async getAssetById(id, userId) {
        try {
            // Build up our query
            let query = supabaseClient_1.supabase
                .from('assets')
                .select('*');
            // Apply id filter
            query = query.eq('id', id);
            // Only restrict by user ID if specified and not bypassing auth
            if (userId) {
                query = query.eq('user_id', userId);
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
                asset: this.transformAssetFromDb(data),
                success: true
            };
        }
        catch (error) {
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
    async getAvailableCategories() {
        try {
            // This query gets all unique categories from the assets
            const { data, error } = await supabaseClient_1.supabase
                .from('assets')
                .select('meta->categories')
                .not('meta->categories', 'is', null);
            if (error) {
                console.error('Error fetching categories:', error);
                return [];
            }
            // Extract and flatten categories from all assets
            const allCategories = [];
            data.forEach(item => {
                if (item.meta && item.meta.categories && Array.isArray(item.meta.categories)) {
                    item.meta.categories.forEach((category) => {
                        if (category && !allCategories.includes(category)) {
                            allCategories.push(category);
                        }
                    });
                }
            });
            return allCategories.sort();
        }
        catch (error) {
            console.error('Error getting available categories:', error);
            return [];
        }
    }
    /**
     * Delete an asset
     */
    async deleteAsset(id, userId) {
        try {
            // First get the asset to check permissions and get file path
            const { asset, success, message } = await this.getAssetById(id, userId);
            if (!success || !asset) {
                return { success: false, message: message || 'Asset not found' };
            }
            // Delete from database
            const { error } = await supabaseClient_1.supabase
                .from('assets')
                .delete()
                .eq('id', id);
            if (error) {
                return { success: false, message: `Database error: ${error.message}` };
            }
            // Delete the files from storage
            try {
                // Extract the relative path from URL
                const urlPath = asset.url;
                if (urlPath.startsWith('/uploads/')) {
                    const relativePath = urlPath.substring('/uploads/'.length);
                    const assetDir = path_1.default.dirname(path_1.default.join(this.uploadsDir, relativePath));
                    // Recursively delete the asset directory
                    fs_1.default.rm(assetDir, { recursive: true, force: true }, (err) => {
                        if (err) {
                            console.error(`Error deleting asset files for ${id}:`, err);
                        }
                    });
                }
            }
            catch (fileError) {
                console.error(`Error cleaning up asset files for ${id}:`, fileError);
                // Continue anyway since the DB record is deleted
            }
            return { success: true, message: 'Asset deleted successfully' };
        }
        catch (error) {
            return {
                success: false,
                message: `Error deleting asset: ${error.message}`
            };
        }
    }
    /**
     * Update an asset
     */
    async updateAsset(id, userId, updateData) {
        try {
            // First get the asset to check permissions
            const { asset, success, message } = await this.getAssetById(id, userId);
            if (!success || !asset) {
                return { success: false, message: message || 'Asset not found' };
            }
            // Prepare the update
            const updates = {};
            // Handle simple name field
            if (updateData.name !== undefined) {
                updates.name = updateData.name;
            }
            // Prepare meta updates
            const metaUpdates = {};
            if (updateData.description !== undefined) {
                metaUpdates.description = updateData.description;
            }
            if (updateData.tags !== undefined) {
                metaUpdates.tags = updateData.tags;
            }
            if (updateData.categories !== undefined) {
                metaUpdates.categories = updateData.categories;
            }
            if (updateData.isFavourite !== undefined) {
                metaUpdates.isFavourite = updateData.isFavourite;
            }
            if (updateData.metadata !== undefined) {
                metaUpdates.metadata = updateData.metadata;
            }
            // Update the asset in the database
            const { data, error } = await supabaseClient_1.supabase
                .from('assets')
                .update({
                ...updates,
                // Update meta fields that need updating
                ...(Object.keys(metaUpdates).length > 0 ? {
                    meta: supabaseClient_1.supabase.rpc('jsonb_merge', {
                        a: asset.clientId ? { clientId: asset.clientId } : {},
                        b: metaUpdates
                    })
                } : {})
            })
                .eq('id', id)
                .select()
                .single();
            if (error) {
                return { success: false, message: `Failed to update asset: ${error.message}` };
            }
            return {
                success: true,
                message: 'Asset updated successfully',
                asset: this.transformAssetFromDb(data)
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Error updating asset: ${error.message}`
            };
        }
    }
}
// Create singleton instance
const assetService = new AssetService();
exports.assetService = assetService;
