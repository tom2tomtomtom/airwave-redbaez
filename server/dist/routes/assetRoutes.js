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
const assetService_1 = require("../services/assetService");
const router = express_1.default.Router();
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
// Get all assets with optional filtering
router.get('/', auth_1.authenticateToken, async (req, res) => {
    console.log('GET assets request, user:', req.user);
    console.log('Query params:', req.query);
    // Force disable prototype mode - always use real data
    process.env.PROTOTYPE_MODE = 'false';
    if (!req.user || !req.user.id) {
        console.error('No user ID found in the authenticated request');
        return res.status(401).json({
            success: false,
            message: 'User not properly authenticated'
        });
    }
    try {
        console.log(`Fetching assets for user ID: ${req.user.id}`);
        // Parse query parameters for filtering
        const filters = {
            userId: req.user.id
        };
        // Add optional filters from query parameters
        if (req.query.type) {
            filters.type = req.query.type.split(',');
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
        // Get assets with filters
        const assets = await assetService_1.assetService.getAssets(filters);
        // Return assets
        res.json(assets);
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
    console.log('POST asset upload request, user:', req.user);
    try {
        const { name, type, description } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not properly authenticated' });
        }
        // Parse tags and categories if provided
        let tags = [];
        let categories = [];
        if (req.body.tags) {
            tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
        }
        if (req.body.categories) {
            categories = typeof req.body.categories === 'string' ? JSON.parse(req.body.categories) : req.body.categories;
        }
        // Upload asset using service
        const result = await assetService_1.assetService.uploadAsset(req.file, req.user.id, {
            name: name || req.file.originalname,
            type,
            description,
            tags,
            categories
        });
        if (!result.success) {
            return res.status(500).json({ message: result.message || 'Failed to upload asset' });
        }
        // Return success response with asset data
        return res.status(201).json({
            success: true,
            message: 'Asset uploaded successfully',
            data: result.asset
        });
    }
    catch (error) {
        console.error('Error in asset upload:', error.message);
        res.status(500).json({ message: 'Failed to upload asset: ' + error.message });
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
exports.default = router;
