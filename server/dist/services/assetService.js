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
    async uploadAsset(file, userId, assetData) {
        try {
            const assetId = (0, uuid_1.v4)();
            const fileExt = path_1.default.extname(file.originalname);
            const assetFileName = `asset-${assetId}${fileExt}`;
            const assetFilePath = path_1.default.join(this.uploadsDir, assetFileName);
            // Get file stats
            const fileStats = await stat(file.path);
            // Initialize asset object
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
                createdBy: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {}
            };
            // Move file to uploads directory
            fs_1.default.renameSync(file.path, assetFilePath);
            // Handle different asset types
            if (assetData.type === 'image') {
                // Generate thumbnail for images
                await this.processImageAsset(asset, assetFilePath);
            }
            else if (assetData.type === 'video') {
                // Generate thumbnail/preview for videos
                await this.processVideoAsset(asset, assetFilePath);
            }
            else if (assetData.type === 'audio') {
                // Set metadata for audio files
                await this.processAudioAsset(asset, assetFilePath);
            }
            // Save asset to database
            const { data, error } = await supabaseClient_1.supabase
                .from('assets')
                .insert([{
                    id: asset.id,
                    name: asset.name,
                    type: asset.type,
                    description: asset.description,
                    url: asset.url,
                    preview_url: asset.previewUrl,
                    thumbnail_url: asset.thumbnailUrl,
                    size: asset.size,
                    width: asset.width,
                    height: asset.height,
                    duration: asset.duration,
                    tags: asset.tags,
                    categories: asset.categories,
                    is_favourite: asset.isFavourite,
                    usage_count: asset.usageCount,
                    created_by: asset.createdBy,
                    created_at: asset.createdAt,
                    updated_at: asset.updatedAt,
                    metadata: asset.metadata
                }])
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to save asset to database: ${error.message}`);
            }
            return {
                asset: this.transformAssetFromDb(data),
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
     */
    async processImageAsset(asset, filePath) {
        try {
            // Generate thumbnail
            const thumbnailFileName = `thumb-${asset.id}.jpg`;
            const thumbnailPath = path_1.default.join(this.uploadsDir, thumbnailFileName);
            // Get image dimensions
            const metadata = await (0, sharp_1.default)(filePath).metadata();
            asset.width = metadata.width;
            asset.height = metadata.height;
            // Create thumbnail
            await (0, sharp_1.default)(filePath)
                .resize({ width: 200, height: 200, fit: 'inside' })
                .toFormat('jpeg')
                .toFile(thumbnailPath);
            asset.thumbnailUrl = `/uploads/${thumbnailFileName}`;
            asset.previewUrl = asset.url;
        }
        catch (error) {
            console.error('Error processing image asset:', error);
            // Continue without thumbnail if processing fails
        }
    }
    /**
     * Process video asset
     */
    async processVideoAsset(asset, filePath) {
        try {
            // Generate thumbnail
            const thumbnailFileName = `thumb-${asset.id}.jpg`;
            const thumbnailPath = path_1.default.join(this.uploadsDir, thumbnailFileName);
            // Create promise for ffmpeg thumbnail generation
            const thumbnailPromise = new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(filePath)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err))
                    .screenshots({
                    timestamps: ['10%'],
                    filename: thumbnailFileName,
                    folder: this.uploadsDir,
                    size: '320x?'
                });
            });
            // Create promise for ffmpeg metadata
            const metadataPromise = new Promise((resolve, reject) => {
                fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (metadata && metadata.streams) {
                        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                        if (videoStream) {
                            asset.width = videoStream.width;
                            asset.height = videoStream.height;
                            asset.duration = metadata.format.duration;
                        }
                    }
                    resolve();
                });
            });
            // Wait for both processes to complete
            await Promise.all([thumbnailPromise, metadataPromise]);
            asset.thumbnailUrl = `/uploads/${thumbnailFileName}`;
            asset.previewUrl = asset.url;
        }
        catch (error) {
            console.error('Error processing video asset:', error);
            // Continue without thumbnail if processing fails
        }
    }
    /**
     * Process audio asset
     */
    async processAudioAsset(asset, filePath) {
        try {
            // Create default audio thumbnail
            const defaultAudioThumb = 'audio-thumb.jpg';
            const defaultThumbPath = path_1.default.join(__dirname, '../../public', defaultAudioThumb);
            // If default thumbnail exists, use it
            if (fs_1.default.existsSync(defaultThumbPath)) {
                const thumbnailFileName = `thumb-${asset.id}.jpg`;
                const thumbnailPath = path_1.default.join(this.uploadsDir, thumbnailFileName);
                fs_1.default.copyFileSync(defaultThumbPath, thumbnailPath);
                asset.thumbnailUrl = `/uploads/${thumbnailFileName}`;
            }
            // Get audio duration
            const metadataPromise = new Promise((resolve, reject) => {
                fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (metadata && metadata.format) {
                        asset.duration = metadata.format.duration;
                    }
                    resolve();
                });
            });
            await metadataPromise;
        }
        catch (error) {
            console.error('Error processing audio asset:', error);
            // Continue without metadata if processing fails
        }
    }
    /**
     * Get all assets with optional filtering
     */
    async getAssets(filters = {}) {
        try {
            let query = supabaseClient_1.supabase
                .from('assets')
                .select('*');
            // Apply filters
            if (filters.userId) {
                query = query.eq('created_by', filters.userId);
            }
            if (filters.type && filters.type.length > 0) {
                query = query.in('type', filters.type);
            }
            if (filters.tags && filters.tags.length > 0) {
                // Filter for assets where the tags array contains any of the specified tags
                query = query.contains('tags', filters.tags);
            }
            if (filters.categories && filters.categories.length > 0) {
                // Filter for assets where the categories array contains any of the specified categories
                query = query.contains('categories', filters.categories);
            }
            if (filters.favouritesOnly) {
                query = query.eq('is_favourite', true);
            }
            if (filters.searchTerm) {
                // Search in name and description
                query = query.or(`name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
            }
            // Apply sorting
            const sortBy = filters.sortBy || 'createdAt';
            const sortDirection = filters.sortDirection || 'desc';
            const sortField = this.getDbFieldName(sortBy);
            query = query.order(sortField, { ascending: sortDirection === 'asc' });
            const { data, error } = await query;
            if (error) {
                throw new Error(`Failed to fetch assets: ${error.message}`);
            }
            return (data || []).map(this.transformAssetFromDb);
        }
        catch (error) {
            console.error('Error fetching assets:', error);
            throw new Error(`Failed to fetch assets: ${error.message}`);
        }
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
     */
    async updateAsset(id, userId, updates) {
        try {
            // Get current asset
            const asset = await this.getAssetById(id);
            if (!asset) {
                throw new Error(`Asset with ID ${id} not found`);
            }
            // Prepare updates for database
            const dbUpdates = {
                updated_at: new Date().toISOString()
            };
            // Map asset fields to database fields
            if (updates.name !== undefined)
                dbUpdates.name = updates.name;
            if (updates.description !== undefined)
                dbUpdates.description = updates.description;
            if (updates.tags !== undefined)
                dbUpdates.tags = updates.tags;
            if (updates.categories !== undefined)
                dbUpdates.categories = updates.categories;
            if (updates.isFavourite !== undefined)
                dbUpdates.is_favourite = updates.isFavourite;
            // Update the asset
            const { data, error } = await supabaseClient_1.supabase
                .from('assets')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                return {
                    success: false,
                    message: `Failed to update asset: ${error.message}`,
                    code: 500
                };
            }
            const updatedAsset = this.transformAssetFromDb(data);
            return {
                success: true,
                message: 'Asset updated successfully',
                asset: updatedAsset
            };
        }
        catch (error) {
            console.error(`Error updating asset with ID ${id}:`, error);
            throw new Error(`Failed to update asset: ${error.message}`);
        }
    }
    /**
     * Delete asset
     */
    async deleteAsset(id, userId) {
        try {
            // Get asset details first
            const asset = await this.getAssetById(id);
            if (!asset) {
                throw new Error(`Asset with ID ${id} not found`);
            }
            // Delete from database
            const { error } = await supabaseClient_1.supabase
                .from('assets')
                .delete()
                .eq('id', id);
            if (error) {
                throw new Error(`Failed to delete asset from database: ${error.message}`);
            }
            // Delete files
            const filesToDelete = [
                asset.url,
                asset.thumbnailUrl,
                asset.previewUrl
            ].filter(Boolean).map(url => {
                // Extract the filename from URL
                const filename = url.replace('/uploads/', '');
                return path_1.default.join(this.uploadsDir, filename);
            });
            for (const filePath of filesToDelete) {
                if (fs_1.default.existsSync(filePath)) {
                    await unlink(filePath);
                }
            }
            return {
                success: true,
                message: 'Asset deleted successfully',
                data: true
            };
        }
        catch (error) {
            console.error(`Error deleting asset with ID ${id}:`, error);
            throw new Error(`Failed to delete asset: ${error.message}`);
        }
    }
    /**
     * Toggle asset favourite status
     */
    async toggleFavourite(id, userId, isFavourite) {
        try {
            // Get current favourite status
            const asset = await this.getAssetById(id);
            if (!asset) {
                throw new Error(`Asset with ID ${id} not found`);
            }
            // Set the favourite status either to the provided value or toggle it
            const newFavouriteStatus = isFavourite !== undefined ? isFavourite : !asset.isFavourite;
            const { data, error } = await supabaseClient_1.supabase
                .from('assets')
                .update({
                is_favourite: newFavouriteStatus,
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
                message: 'Favourite status updated successfully',
                asset: updatedAsset
            };
        }
        catch (error) {
            console.error(`Error toggling favourite for asset with ID ${id}:`, error);
            throw new Error(`Failed to toggle favourite status: ${error.message}`);
        }
    }
    /**
     * Increment asset usage count
     */
    async incrementUsageCount(id) {
        try {
            const { data, error } = await supabaseClient_1.supabase.rpc('increment_asset_usage', {
                asset_id: id
            });
            if (error) {
                return {
                    success: false,
                    message: `Failed to increment usage count: ${error.message}`,
                    code: 500
                };
            }
            const updatedAsset = await this.getAssetById(id);
            if (!updatedAsset) {
                return {
                    success: false,
                    message: `Asset with ID ${id} not found after incrementing usage`,
                    code: 404
                };
            }
            return {
                success: true,
                message: 'Usage count incremented successfully',
                asset: updatedAsset
            };
        }
        catch (error) {
            console.error(`Error incrementing usage count for asset with ID ${id}:`, error);
            throw new Error(`Failed to increment usage count: ${error.message}`);
        }
    }
    /**
     * Get available asset tags
     */
    async getAvailableTags() {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('assets')
                .select('tags');
            if (error) {
                throw new Error(`Failed to fetch tags: ${error.message}`);
            }
            // Extract all tags and remove duplicates
            const allTags = data.flatMap(asset => asset.tags || []);
            return [...new Set(allTags)];
        }
        catch (error) {
            console.error('Error fetching tags:', error);
            throw new Error(`Failed to fetch tags: ${error.message}`);
        }
    }
    /**
     * Get available asset categories
     */
    async getAvailableCategories() {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('assets')
                .select('categories');
            if (error) {
                throw new Error(`Failed to fetch categories: ${error.message}`);
            }
            // Extract all categories and remove duplicates
            const allCategories = data.flatMap(asset => asset.categories || []);
            return [...new Set(allCategories)];
        }
        catch (error) {
            console.error('Error fetching categories:', error);
            throw new Error(`Failed to fetch categories: ${error.message}`);
        }
    }
    /**
     * Helper to transform database field names to API names
     */
    getDbFieldName(apiFieldName) {
        const fieldMap = {
            'name': 'name',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            'usageCount': 'usage_count'
        };
        return fieldMap[apiFieldName] || apiFieldName;
    }
    /**
     * Transform asset from database format to API format
     */
    transformAssetFromDb(dbAsset) {
        return {
            id: dbAsset.id,
            name: dbAsset.name,
            type: dbAsset.type,
            description: dbAsset.description || '',
            url: dbAsset.url,
            previewUrl: dbAsset.preview_url,
            thumbnailUrl: dbAsset.thumbnail_url,
            size: dbAsset.size,
            width: dbAsset.width,
            height: dbAsset.height,
            duration: dbAsset.duration,
            tags: dbAsset.tags || [],
            categories: dbAsset.categories || [],
            isFavourite: dbAsset.is_favourite || false,
            usageCount: dbAsset.usage_count || 0,
            createdBy: dbAsset.created_by,
            createdAt: dbAsset.created_at,
            updatedAt: dbAsset.updated_at,
            metadata: dbAsset.metadata || {}
        };
    }
}
exports.assetService = new AssetService();
