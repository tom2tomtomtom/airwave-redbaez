"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const fs_1 = __importDefault(require("fs"));
const supabaseClient_1 = require("../db/supabaseClient");
const uuid_1 = require("uuid");
const assetService_1 = require("../services/assetService");
const router = express_1.default.Router();
// Debug endpoint to check asset table structure (REMOVE IN PRODUCTION)
router.get('/debug-schema', async (req, res) => {
    try {
        const { data, error } = await supabaseClient_1.supabase
            .from('assets')
            .select('*')
            .limit(1);
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching schema',
                error: error
            });
        }
        // Get table structure by examining first row or returning the empty structure
        const schema = data && data.length > 0 ?
            Object.keys(data[0]).reduce((acc, key) => {
                acc[key] = typeof data[0][key];
                return acc;
            }, {}) :
            { message: 'No data found, but table exists' };
        return res.status(200).json({
            success: true,
            schema: schema,
            sampleData: data
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch schema',
            error: err.message
        });
    }
});
// Debug endpoint to check users table structure (REMOVE IN PRODUCTION)
router.get('/debug-users-schema', async (req, res) => {
    try {
        // First try to get the users schema
        const { data, error } = await supabaseClient_1.supabase
            .from('users')
            .select('*')
            .limit(1);
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching users schema',
                error: error
            });
        }
        // Get table structure by examining first row or returning the empty structure
        const schema = data && data.length > 0 ?
            Object.keys(data[0]).reduce((acc, key) => {
                acc[key] = typeof data[0][key];
                return acc;
            }, {}) :
            { message: 'No data found in users table, but table exists' };
        // Check if there are any users in the table
        const { count, error: countError } = await supabaseClient_1.supabase
            .from('users')
            .select('*', { count: 'exact' });
        // Try to see what tables exist
        const { data: tables, error: tablesError } = await supabaseClient_1.supabase
            .rpc('get_schema_tables');
        return res.status(200).json({
            success: true,
            schema: schema,
            sampleData: data,
            userCount: count,
            tables: tables || 'Could not retrieve tables list',
            tablesError: tablesError
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch users schema',
            error: err.message
        });
    }
});
// Debug endpoint to enable prototype mode (REMOVE IN PRODUCTION)
router.post('/enable-prototype', (req, res) => {
    try {
        // Force enable prototype mode
        process.env.PROTOTYPE_MODE = 'true';
        return res.status(200).json({
            success: true,
            message: 'Prototype mode enabled',
            env: {
                NODE_ENV: process.env.NODE_ENV,
                PROTOTYPE_MODE: process.env.PROTOTYPE_MODE
            }
        });
    }
    catch (err) {
        console.error('Error enabling prototype mode:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to enable prototype mode',
            error: err.message
        });
    }
});
// Debug endpoint to create a test asset (REMOVE IN PRODUCTION)
// Debug endpoint to return mock assets (REMOVE IN PRODUCTION)
// Administrative endpoint to generate RLS policies for production
// This should only be accessible by administrators in a production environment
router.get('/admin/generate-rls-policies', auth_1.authenticateToken, async (req, res) => {
    try {
        // In production, this should check if the user is an administrator
        const isDevelopment = process.env.NODE_ENV !== 'production';
        // The user ID from the JWT token
        const userId = req.user?.id;
        if (!isDevelopment) {
            // In production, we should check if the user is an administrator
            // This is a placeholder for a proper admin check
            const { data: userData, error: userError } = await supabaseClient_1.supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();
            if (userError || !userData || userData.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorised: Administrator access required for this endpoint',
                });
            }
        }
        // Generate the RLS policy SQL
        const policySql = await assetService_1.assetService.generateRlsPolicySql();
        return res.status(200).json({
            success: true,
            message: 'RLS policies generated successfully',
            sql: policySql,
            instructions: [
                'This SQL is meant to be executed in the Supabase SQL Editor.',
                'It will enable Row Level Security (RLS) on the assets table and create policies that restrict access based on user ownership.',
                'Please review the SQL carefully before executing it.',
                'Make a backup of your database before applying these changes.'
            ]
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Failed to generate RLS policies',
            error: err.message
        });
    }
});
router.get('/mock-assets', async (req, res) => {
    try {
        // Create mock assets that match our schema
        const mockAssets = [
            {
                id: (0, uuid_1.v4)(),
                name: 'Mock Image 1',
                type: 'image',
                description: 'A sample image for testing',
                url: '/uploads/mock-image-1.jpg',
                thumbnailUrl: '/uploads/thumb-mock-image-1.jpg',
                size: 1024,
                width: 800,
                height: 600,
                tags: ['test', 'image', 'sample'],
                categories: ['marketing'],
                isFavourite: false,
                usageCount: 0,
                userId: '00000000-0000-0000-0000-000000000000',
                ownerId: '00000000-0000-0000-0000-000000000000',
                clientId: req.query.clientId?.toString() || '', // Include client ID for proper asset association
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {
                    camera: 'Canon EOS R5',
                    location: 'Studio'
                }
            },
            {
                id: (0, uuid_1.v4)(),
                name: 'Mock Video 1',
                type: 'video',
                description: 'A sample video for testing',
                url: '/uploads/mock-video-1.mp4',
                thumbnailUrl: '/uploads/thumb-mock-video-1.jpg',
                previewUrl: '/uploads/preview-mock-video-1.gif',
                size: 5242880,
                width: 1920,
                height: 1080,
                duration: 30,
                tags: ['test', 'video', 'sample'],
                categories: ['social media'],
                isFavourite: true,
                usageCount: 3,
                userId: '00000000-0000-0000-0000-000000000000',
                ownerId: '00000000-0000-0000-0000-000000000000',
                clientId: req.query.clientId?.toString() || '', // Include client ID for proper asset association
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {
                    codec: 'H.264',
                    framerate: 30
                }
            },
            {
                id: (0, uuid_1.v4)(),
                name: 'Mock Audio 1',
                type: 'audio',
                description: 'A sample audio file for testing',
                url: '/uploads/mock-audio-1.mp3',
                thumbnailUrl: '/uploads/thumb-mock-audio-1.jpg',
                size: 2097152,
                duration: 120,
                tags: ['test', 'audio', 'sample'],
                categories: ['podcast'],
                isFavourite: false,
                usageCount: 1,
                userId: '00000000-0000-0000-0000-000000000000',
                ownerId: '00000000-0000-0000-0000-000000000000',
                clientId: req.query.clientId?.toString() || '', // Include client ID for proper asset association
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {
                    bitrate: '320kbps',
                    artist: 'Test Artist'
                }
            }
        ];
        return res.status(200).json({
            success: true,
            data: mockAssets
        });
    }
    catch (err) {
        console.error('Error creating mock assets:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to create mock assets',
            error: err.message
        });
    }
});
router.post('/debug-create', async (req, res) => {
    try {
        // Check if we have any users in the database first
        console.log('Attempting to fetch users from database...');
        const { data: users, error: usersError } = await supabaseClient_1.supabase
            .from('users')
            .select('id')
            .limit(5);
        if (usersError) {
            console.error('Error fetching users:', usersError);
            return res.status(500).json({
                success: false,
                message: 'Error fetching users to create test asset',
                error: usersError
            });
        }
        // Determine which user ID to use
        let userId;
        if (req.body.userId) {
            // If user explicitly provided an ID, use that
            userId = req.body.userId;
            console.log('Using provided user ID for test asset:', userId);
        }
        else if (users && users.length > 0) {
            // If we found users in the database, use the first one
            userId = users[0].id;
            console.log('Using existing user ID from database:', userId);
        }
        else {
            // Fall back to a UUID, but this will likely fail due to FK constraints
            userId = '00000000-0000-0000-0000-000000000000';
            console.log('WARNING: No valid users found, using placeholder ID:', userId);
            console.log('This will likely fail due to foreign key constraints');
        }
        // Create a test asset matching exact Supabase schema
        const testAsset = {
            id: (0, uuid_1.v4)(),
            name: 'Test Asset',
            type: 'image',
            url: '/uploads/test-asset.jpg',
            thumbnail_url: '/uploads/thumb-test-asset.jpg',
            user_id: userId,
            owner_id: userId,
            client_id: req.query.clientId || null, // Add client ID for proper asset association
            meta: {
                description: 'Test asset for debugging',
                size: 1024,
                tags: ['test', 'debug'],
                categories: ['test'],
                isFavourite: false,
                usageCount: 0
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        console.log('Attempting to insert test asset with user_id:', userId);
        // Insert directly using Supabase client
        const { data, error } = await supabaseClient_1.supabase
            .from('assets')
            .insert(testAsset)
            .select();
        if (error) {
            console.error('Error creating test asset:', error);
            // Check specifically for foreign key violation
            if (error.code === '23503' && error.message.includes('foreign key constraint')) {
                return res.status(500).json({
                    success: false,
                    message: 'Foreign key constraint violation - need valid user_id',
                    error: error,
                    suggestion: 'You need to create a user in Supabase first or provide a valid userId'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Error creating test asset',
                error: error
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Test asset created successfully',
            data: data
        });
    }
    catch (err) {
        console.error('Exception creating test asset:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to create test asset',
            error: err.message
        });
    }
});
// Set up multer for temporary file uploads
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const tempDir = path_1.default.join(__dirname, '../../temp');
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit
    }
});
// Dedicated endpoint for fetching assets by client slug
router.get('/by-client/:slug', auth_1.authenticateToken, async (req, res) => {
    console.log(`GET assets for client slug: ${req.params.slug}`);
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not properly authenticated'
            });
        }
        const slug = req.params.slug.toLowerCase();
        // Pass any additional query parameters as options
        const options = {
            userId: req.user.id
        };
        // Add pagination parameters
        if (req.query.limit)
            options.limit = parseInt(req.query.limit);
        if (req.query.offset)
            options.offset = parseInt(req.query.offset);
        // Add sorting parameters
        if (req.query.sortBy)
            options.sortBy = req.query.sortBy;
        if (req.query.sortDirection)
            options.sortDirection = req.query.sortDirection;
        // Add filtering parameters
        if (req.query.type)
            options.type = req.query.type;
        if (req.query.search)
            options.search = req.query.search;
        if (req.query.favourite)
            options.favourite = req.query.favourite === 'true';
        console.log(`Fetching assets for client slug: ${slug} with options:`, options);
        const result = await assetService_1.assetService.getAssetsByClientSlug(slug, options);
        return res.status(200).json({
            success: true,
            message: 'Assets retrieved successfully',
            data: {
                assets: result.assets,
                total: result.total
            }
        });
    }
    catch (error) {
        console.error('Error fetching assets by client slug:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch assets',
            error: error.message
        });
    }
});
// Get all assets with optional filtering
router.get('/', auth_1.authenticateToken, async (req, res) => {
    console.log('GET assets request, user:', req.user);
    console.log('Query params:', req.query);
    try {
        // Initialize filters
        let filters = {};
        // Handle user ID - use the req.user.id if available, otherwise use development user ID
        if (req.user && req.user.id) {
            console.log(`Fetching assets for user ID: ${req.user.id}`);
            filters.userId = req.user.id;
        }
        else {
            // Use the development user ID as fallback
            console.log(`Using development user ID (${auth_1.AUTH_MODE.DEV_USER_ID}) for asset retrieval`);
            filters.userId = auth_1.AUTH_MODE.DEV_USER_ID;
        }
        // Add optional filters from query parameters
        if (req.query.type) {
            filters.type = req.query.type.split(',');
        }
        // Add client filtering if provided - support multiple parameter formats
        // Some clients might send client_id, others might send clientId
        if (req.query.clientId || req.query.client_id) {
            // Prioritize clientId if both are present
            const clientIdValue = (req.query.clientId || req.query.client_id);
            console.log('🔍 Filtering assets by clientId:', clientIdValue);
            // Check if this appears to be a client slug (human-readable) rather than UUID
            if (clientIdValue && !clientIdValue.includes('-') && isNaN(parseInt(clientIdValue))) {
                console.log('🚀 Using client slug for filtering:', clientIdValue);
                filters.clientSlug = clientIdValue.toLowerCase();
            }
            else {
                // It's a UUID-style client ID
                filters.clientId = clientIdValue;
                // Special handling for Juniper client ID 
                if (clientIdValue === 'fd790d19-6610-4cd5-b90f-214808e94a19' ||
                    clientIdValue.includes('fd790d19') ||
                    (typeof clientIdValue === 'string' && clientIdValue.toLowerCase().includes('juniper'))) {
                    console.log('⚠️ Special case: converting Juniper ID to slug for reliability');
                    // Use slug instead of UUID for Juniper
                    filters.clientSlug = 'juniper';
                    delete filters.clientId;
                    // Log for debugging
                    console.log('Request headers:', req.headers);
                    console.log('Query parameters:', req.query);
                    console.log('Using filters:', filters);
                }
            }
        }
        // Also add direct support for slug parameter
        if (req.query.clientSlug) {
            filters.clientSlug = req.query.clientSlug.toLowerCase();
            console.log('🔑 Filtering assets directly by client slug:', filters.clientSlug);
        }
        if (req.query.tags) {
            filters.tags = req.query.tags.split(',');
        }
        if (req.query.categories) {
            filters.categories = req.query.categories.split(',');
        }
        if (req.query.favouritesOnly === 'true') {
            filters.favouritesOnly = true;
        }
        if (req.query.searchTerm) {
            filters.searchTerm = req.query.searchTerm;
        }
        if (req.query.sortBy) {
            filters.sortBy = req.query.sortBy;
        }
        if (req.query.sortDirection) {
            filters.sortDirection = req.query.sortDirection;
        }
        // Add pagination parameters if provided
        if (req.query.limit) {
            filters.limit = parseInt(req.query.limit, 10);
        }
        if (req.query.offset) {
            filters.offset = parseInt(req.query.offset, 10);
        }
        // Get assets with filters and pagination
        const result = await assetService_1.assetService.getAssets(filters);
        // Return assets with pagination metadata
        return res.status(200).json({
            success: true,
            data: {
                assets: result.assets,
                pagination: {
                    total: result.total,
                    limit: filters.limit || 20,
                    offset: filters.offset || 0
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching assets:', error.message);
        res.status(500).json({ message: 'Failed to fetch assets: ' + error.message });
    }
});
// Get available tags
router.get('/tags', auth_1.authenticateToken, async (req, res) => {
    try {
        const tags = await assetService_1.assetService.getAvailableTags();
        return res.status(200).json({
            success: true,
            data: tags
        });
    }
    catch (error) {
        console.error('Error fetching tags:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch tags',
            error: error.message
        });
    }
});
// Get available categories
router.get('/categories', auth_1.authenticateToken, async (req, res) => {
    try {
        const categories = await assetService_1.assetService.getAvailableCategories();
        return res.status(200).json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        console.error('Error fetching categories:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
});
// Batch update assets (add/remove tags and categories)
router.post('/batch-update', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not properly authenticated'
            });
        }
        const { assetIds, addTags, removeTags, addCategories, removeCategories } = req.body;
        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No asset IDs provided or invalid format'
            });
        }
        // Validate that at least one update operation is specified
        if (!addTags && !removeTags && !addCategories && !removeCategories) {
            return res.status(400).json({
                success: false,
                message: 'No update operations specified'
            });
        }
        // Process updates
        const result = await assetService_1.assetService.batchUpdateAssets(assetIds, req.user.id, {
            addTags: addTags || [],
            removeTags: removeTags || [],
            addCategories: addCategories || [],
            removeCategories: removeCategories || []
        });
        return res.status(result.success ? 200 : 400).json({
            success: result.success,
            message: result.message,
            data: result.data
        });
    }
    catch (error) {
        console.error('Error in batch update:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to perform batch update',
            error: error.message
        });
    }
});
// Batch delete assets
router.post('/batch-delete', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not properly authenticated'
            });
        }
        const { assetIds } = req.body;
        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No asset IDs provided or invalid format'
            });
        }
        // Process deletion
        const result = await assetService_1.assetService.batchDeleteAssets(assetIds, req.user.id);
        return res.status(result.success ? 200 : 400).json({
            success: result.success,
            message: result.message,
            data: result.data
        });
    }
    catch (error) {
        console.error('Error in batch delete:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to perform batch delete',
            error: error.message
        });
    }
});
// Get a single asset by ID
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await assetService_1.assetService.getAssetById(id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }
        res.json(asset);
    }
    catch (error) {
        console.error('Error fetching asset:', error.message);
        res.status(500).json({ message: 'Failed to fetch asset' });
    }
});
// Upload a new asset
router.post('/upload', auth_1.authenticateToken, upload.single('file'), async (req, res) => {
    // ALWAYS use the file system approach when in development with the dev user
    // This avoids the foreign key constraint issues with Supabase
    const isUsingDevUser = req.user && req.user.id === auth_1.AUTH_MODE.DEV_USER_ID;
    // Force prototype-like mode when using dev user ID
    const forceFileSystemMode = isUsingDevUser && process.env.NODE_ENV !== 'production';
    // Check if standard prototype mode is enabled
    const isConfiguredPrototypeMode = auth_1.AUTH_MODE.CURRENT === 'prototype' || process.env.PROTOTYPE_MODE === 'true';
    // Use file system mode if either forced or configured
    const useFileSystemMode = forceFileSystemMode || isConfiguredPrototypeMode;
    console.log('POST asset upload request received');
    console.log('User:', req.user);
    console.log('Upload mode:', useFileSystemMode ? 'FILE SYSTEM MODE (bypassing database)' : 'DATABASE MODE (using Supabase)');
    if (forceFileSystemMode) {
        console.log('⚠️ IMPORTANT: Using file system mode for dev user to avoid foreign key constraints');
    }
    console.log('Body keys:', Object.keys(req.body));
    console.log('File:', req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
    } : 'No file received');
    // Use the AUTH_MODE from auth middleware for consistency
    console.log('Current auth mode:', auth_1.AUTH_MODE.CURRENT);
    try {
        const { name, type, description } = req.body;
        console.log('Form data:', { name, type, description });
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        if (!req.user || !req.user.id) {
            console.error('No user ID in request');
            // Authentication should be handled consistently by the auth middleware
            // This should rarely happen since we're using authenticateToken middleware
            return res.status(401).json({
                success: false,
                message: 'User not properly authenticated'
            });
        }
        // Parse tags and categories if provided
        let tags = [];
        let categories = [];
        if (req.body.tags) {
            try {
                tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
                console.log('Parsed tags:', tags);
            }
            catch (e) {
                console.error('Error parsing tags:', e);
            }
        }
        if (req.body.categories) {
            try {
                categories = typeof req.body.categories === 'string' ? JSON.parse(req.body.categories) : req.body.categories;
                console.log('Parsed categories:', categories);
            }
            catch (e) {
                console.error('Error parsing categories:', e);
            }
        }
        // Ensure client ID is provided and properly formatted
        const clientId = req.body.clientId;
        if (!clientId) {
            console.error('Missing clientId in request');
            return res.status(400).json({
                success: false,
                message: 'Client ID is required for asset upload'
            });
        }
        console.log('Using client ID:', clientId);
        // FILE SYSTEM MODE: For fast prototyping without database dependencies
        if (useFileSystemMode) {
            try {
                console.log('Using FILE SYSTEM MODE for file upload');
                // Move the file to uploads directory
                const uploadsDir = path_1.default.join(__dirname, '../../uploads');
                if (!fs_1.default.existsSync(uploadsDir)) {
                    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                }
                // Create unique filename with sanitized name
                const fileExt = path_1.default.extname(req.file.originalname);
                const assetId = (0, uuid_1.v4)();
                const sanitizedName = (name || req.file.originalname.split('.')[0])
                    .replace(/[^a-zA-Z0-9]/g, '-')
                    .substring(0, 30); // Limit length
                const assetFileName = `asset-${sanitizedName}-${assetId}${fileExt}`;
                const assetFilePath = path_1.default.join(uploadsDir, assetFileName);
                console.log('File system mode: Copying file from temp to uploads directory');
                console.log(`Source: ${req.file.path}`);
                console.log(`Destination: ${assetFilePath}`);
                // Move the file - use fs.renameSync for faster performance, but if that fails (e.g., across devices), fall back to copy
                try {
                    fs_1.default.renameSync(req.file.path, assetFilePath);
                    console.log('File moved successfully using rename');
                }
                catch (renameErr) {
                    console.warn('Could not rename file, falling back to copy:', renameErr);
                    fs_1.default.copyFileSync(req.file.path, assetFilePath);
                    // Clean up the temp file after successful copy
                    try {
                        fs_1.default.unlinkSync(req.file.path);
                    }
                    catch (unlinkErr) {
                        console.warn('Failed to clean up temp file:', unlinkErr);
                    }
                    console.log('File copied successfully');
                }
                // Generate thumbnail path
                const thumbnailFileName = `thumb-${assetId}${fileExt}`;
                const thumbnailPath = path_1.default.join(uploadsDir, thumbnailFileName);
                // Just copy the file to create a simple thumbnail
                fs_1.default.copyFileSync(assetFilePath, thumbnailPath);
                console.log('Created simple thumbnail by copying the file');
                // Create a local file system asset response
                const asset = {
                    id: assetId,
                    name: name || req.file.originalname,
                    type: type || 'image',
                    description: description || '',
                    url: `/uploads/${assetFileName}`,
                    thumbnailUrl: `/uploads/${thumbnailFileName}`,
                    size: req.file.size,
                    width: 0,
                    height: 0,
                    tags: tags || [],
                    categories: categories || [],
                    isFavourite: false,
                    usageCount: 0,
                    userId: req.user.id,
                    ownerId: req.user.id,
                    clientId: clientId, // Add clientId to ensure proper association
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    metadata: {
                        originalName: req.file.originalname,
                        mimeType: req.file.mimetype
                    }
                };
                console.log('Created asset object for file system mode:', {
                    id: asset.id,
                    name: asset.name,
                    type: asset.type,
                    url: asset.url
                });
                // Return success response
                return res.status(201).json({
                    success: true,
                    message: 'Asset uploaded successfully in file system mode',
                    data: asset
                });
            }
            catch (protoError) {
                console.error('Error in file system upload mode:', protoError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload asset in file system mode: ' + protoError.message,
                    error: protoError
                });
            }
            // If we're in file system mode, we've already returned a response above
            // and should not continue to the normal flow
            return;
        }
        // Normal flow for database mode
        console.log('Calling assetService.uploadAsset with:', {
            fileInfo: {
                originalname: req.file.originalname,
                size: req.file.size
            },
            userId: req.user.id,
            assetData: {
                name: name || req.file.originalname,
                type,
                description,
                tags,
                categories
            }
        });
        // Upload asset using service
        const result = await assetService_1.assetService.uploadAsset(req.file, req.user.id, {
            name: name || req.file.originalname,
            type,
            description,
            tags,
            categories,
            clientId // Include the client ID for proper association
        });
        console.log('Upload result:', result);
        if (!result.success) {
            console.error('Upload failed:', result.message);
            return res.status(500).json({
                success: false,
                message: result.message || 'Failed to upload asset'
            });
        }
        // Return success response with asset data
        console.log('Upload successful, returning asset data');
        return res.status(201).json({
            success: true,
            message: 'Asset uploaded successfully',
            data: result.asset
        });
    }
    catch (error) {
        console.error('Exception in asset upload:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload asset: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Batch upload multiple assets
router.post('/batch-upload', auth_1.authenticateToken, upload.array('images', 10), async (req, res) => {
    console.log('POST batch asset upload request received');
    console.log('User:', req.user);
    console.log('Files:', req.files ? `${req.files.length} files received` : 'No files');
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files were uploaded'
            });
        }
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not properly authenticated'
            });
        }
        const files = req.files;
        const uploadedAssets = [];
        // SIMPLIFIED APPROACH - Just copy files to uploads directory
        for (const file of files) {
            try {
                // Generate a unique ID for this asset
                const assetId = (0, uuid_1.v4)();
                // Create a normalized file name
                const fileExt = path_1.default.extname(file.originalname);
                const assetFileName = `asset-${assetId}${fileExt}`;
                // Ensure uploads directory exists
                const uploadsDir = path_1.default.join(__dirname, '../../uploads');
                if (!fs_1.default.existsSync(uploadsDir)) {
                    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                }
                // Copy file from temp to uploads directory
                const assetFilePath = path_1.default.join(uploadsDir, assetFileName);
                fs_1.default.copyFileSync(file.path, assetFilePath);
                // Create a simple thumbnail (just a copy for now)
                const thumbnailFileName = `thumb-${assetId}${fileExt}`;
                const thumbnailPath = path_1.default.join(uploadsDir, thumbnailFileName);
                fs_1.default.copyFileSync(file.path, thumbnailPath);
                // Create asset object
                const assetData = {
                    id: assetId,
                    name: file.originalname,
                    type: file.mimetype.startsWith('image/') ? 'image' :
                        file.mimetype.startsWith('video/') ? 'video' : 'document',
                    description: '',
                    url: `/uploads/${assetFileName}`,
                    thumbnailUrl: `/uploads/${thumbnailFileName}`,
                    size: file.size,
                    width: 0,
                    height: 0,
                    tags: [],
                    categories: [],
                    isFavourite: false,
                    usageCount: 0,
                    userId: req.user.id,
                    ownerId: req.user.id,
                    clientId: req.body.clientId || '', // Include client ID for proper asset association
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    metadata: {}
                };
                uploadedAssets.push(assetData);
            }
            catch (fileError) {
                console.error('Error processing file:', file.originalname, fileError);
                // Continue with next file
            }
        }
        if (uploadedAssets.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to process any uploaded files'
            });
        }
        // Return the successful uploads
        res.status(200).json({
            success: true,
            message: `Successfully processed ${uploadedAssets.length} files`,
            assets: uploadedAssets
        });
    }
    catch (error) {
        console.error('Exception in batch asset upload:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload assets: ' + error.message,
            error: error
        });
    }
});
// Update an asset
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not properly authenticated'
            });
        }
        const { id } = req.params;
        const { name, description, tags, categories } = req.body;
        // Parse tags and categories if they are provided as strings
        const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : undefined;
        const parsedCategories = categories ? (typeof categories === 'string' ? JSON.parse(categories) : categories) : undefined;
        // Update the asset using the service
        const result = await assetService_1.assetService.updateAsset(id, req.user.id, {
            name,
            description,
            tags: parsedTags,
            categories: parsedCategories
        });
        if (!result.success) {
            return res.status(result.code || 500).json({
                success: false,
                message: result.message || 'Failed to update asset'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Asset updated successfully',
            data: result.asset
        });
    }
    catch (error) {
        console.error('Error updating asset:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update asset: ' + error.message
        });
    }
});
// Delete an asset
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not properly authenticated'
            });
        }
        const { id } = req.params;
        // Delete the asset using service
        const result = await assetService_1.assetService.deleteAsset(id, req.user.id);
        if (!result.success) {
            return res.status(result.code || 500).json({
                success: false,
                message: result.message || 'Failed to delete asset'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Asset deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting asset:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete asset: ' + error.message
        });
    }
});
// Toggle favourite status
router.put('/:id/favourite', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not properly authenticated'
            });
        }
        const { id } = req.params;
        const { isFavourite } = req.body;
        // Toggle favourite status using the service
        const result = await assetService_1.assetService.toggleFavourite(id, req.user.id, isFavourite);
        if (!result.success) {
            return res.status(result.code || 500).json({
                success: false,
                message: result.message || 'Failed to update favourite status'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Favourite status updated successfully',
            data: result.asset
        });
    }
    catch (error) {
        console.error('Error toggling favourite:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update favourite status: ' + error.message
        });
    }
});
// Increment asset usage count
router.post('/:id/increment-usage', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not properly authenticated'
            });
        }
        const { id } = req.params;
        // Increment usage count using the service
        const result = await assetService_1.assetService.incrementUsageCount(id);
        if (!result.success) {
            return res.status(result.code || 500).json({
                success: false,
                message: result.message || 'Failed to increment usage count'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Usage count incremented successfully',
            data: result.asset
        });
    }
    catch (error) {
        console.error('Error incrementing usage count:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to increment usage count: ' + error.message
        });
    }
});
// Serve asset files (in development mode)
router.get('/file/:filename', (req, res) => {
    const filePath = path_1.default.join(__dirname, '../../uploads', req.params.filename);
    res.sendFile(filePath);
});
/**
 * Create a new asset directly from a URL (for videos generated by AI)
 * This endpoint allows saving videos directly to the asset library without uploading files
 */
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, type, url, thumbnailUrl, clientId, metadata } = req.body;
        console.log('Creating asset from URL:', { name, type, url, clientId });
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL is required'
            });
        }
        // Create a unique ID for the asset
        const assetId = (0, uuid_1.v4)();
        const userId = req.user?.id;
        // Initialize asset object with the provided data
        const asset = {
            id: assetId,
            name: name || `Generated Video - ${new Date().toLocaleDateString()}`,
            type: type || 'video',
            description: metadata?.prompt || '',
            url: url, // Use the direct URL
            thumbnailUrl: thumbnailUrl || '',
            size: 0, // We don't know the size without downloading
            tags: ['ai-generated', 'video'],
            categories: [],
            isFavourite: false,
            usageCount: 0,
            userId: userId,
            ownerId: userId,
            clientId: req.body.clientId || '', // Include client ID from request
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: metadata || {}
        };
        // Prepare database record
        const dbRecord = {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            url: asset.url,
            thumbnail_url: asset.thumbnailUrl,
            user_id: asset.userId,
            owner_id: asset.ownerId,
            client_id: asset.clientId || null, // Ensure client_id is properly stored
            meta: {
                description: asset.description,
                size: asset.size,
                tags: asset.tags,
                categories: asset.categories,
                isFavourite: asset.isFavourite,
                usageCount: asset.usageCount,
                ...asset.metadata
            },
            created_at: asset.createdAt,
            updated_at: asset.updatedAt
        };
        // Save to database
        const { data, error } = await supabaseClient_1.supabase
            .from('assets')
            .insert([dbRecord]);
        if (error) {
            console.error('Error saving asset to database:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to save asset to database',
                error
            });
        }
        console.log('Asset saved successfully:', { id: asset.id });
        return res.status(201).json({
            success: true,
            message: 'Asset created successfully',
            asset: assetService_1.assetService.transformAssetFromDb(dbRecord)
        });
    }
    catch (error) {
        console.error('Error creating asset from URL:', error);
        return res.status(500).json({
            success: false,
            message: `Failed to create asset: ${error.message || 'Unknown error'}`
        });
    }
});
exports.default = router;
