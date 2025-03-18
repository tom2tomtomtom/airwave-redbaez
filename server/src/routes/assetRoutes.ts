import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import fs from 'fs';
import { supabase } from '../db/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { assetService, AssetFilters, ServiceResult, Asset } from '../services/assetService';

const router = express.Router();

// Debug endpoint to check asset table structure (REMOVE IN PRODUCTION)
router.get('/debug-schema', async (req, res) => {
  try {
    const { data, error } = await supabase
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
      }, {} as Record<string, string>) : 
      { message: 'No data found, but table exists' };
      
    return res.status(200).json({
      success: true,
      schema: schema,
      sampleData: data
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch schema',
      error: err.message
    });
  }
});

// Debug endpoint to create a test asset (REMOVE IN PRODUCTION)
// Debug endpoint to return mock assets (REMOVE IN PRODUCTION)

// Administrative endpoint to generate RLS policies for production
// This should only be accessible by administrators in a production environment
router.get('/admin/generate-rls-policies', authenticateToken, async (req, res) => {
  try {
    // In production, this should check if the user is an administrator
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // The user ID from the JWT token
    const userId = req.user?.id;
    
    if (!isDevelopment) {
      // In production, we should check if the user is an administrator
      // This is a placeholder for a proper admin check
      const { data: userData, error: userError } = await supabase
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
    const policySql = await assetService.generateRlsPolicySql();
    
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
  } catch (err: any) {
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
        id: uuidv4(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          camera: 'Canon EOS R5',
          location: 'Studio'
        }
      },
      {
        id: uuidv4(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          codec: 'H.264',
          framerate: 30
        }
      },
      {
        id: uuidv4(),
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
  } catch (err: any) {
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
    const { data: users, error: usersError } = await supabase
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
    } else if (users && users.length > 0) {
      // If we found users in the database, use the first one
      userId = users[0].id;
      console.log('Using existing user ID from database:', userId);
    } else {
      // Fall back to a UUID, but this will likely fail due to FK constraints
      userId = '00000000-0000-0000-0000-000000000000';
      console.log('WARNING: No valid users found, using placeholder ID:', userId);
      console.log('This will likely fail due to foreign key constraints');
    }
    
    // Create a test asset matching exact Supabase schema
    const testAsset = {
      id: uuidv4(),
      name: 'Test Asset',
      type: 'image',
      url: '/uploads/test-asset.jpg',
      thumbnail_url: '/uploads/thumb-test-asset.jpg',
      user_id: userId,
      owner_id: userId,
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
    const { data, error } = await supabase
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
  } catch (err: any) {
    console.error('Exception creating test asset:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create test asset',
      error: err.message
    });
  }
});

// Set up multer for temporary file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit
  }
});

// Get all assets with optional filtering
router.get('/', authenticateToken, async (req, res) => {
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
    const filters: AssetFilters = {
      userId: req.user.id
    };
    
    // Add optional filters from query parameters
    if (req.query.type) {
      filters.type = (req.query.type as string).split(',');
    }
    
    if (req.query.tags) {
      filters.tags = (req.query.tags as string).split(',');
    }
    
    if (req.query.categories) {
      filters.categories = (req.query.categories as string).split(',');
    }
    
    if (req.query.favouritesOnly === 'true') {
      filters.favouritesOnly = true;
    }
    
    if (req.query.searchTerm) {
      filters.searchTerm = req.query.searchTerm as string;
    }
    
    if (req.query.sortBy) {
      filters.sortBy = req.query.sortBy as any;
    }
    
    if (req.query.sortDirection) {
      filters.sortDirection = req.query.sortDirection as 'asc' | 'desc';
    }
    
    // Add pagination parameters if provided
    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string, 10);
    }
    
    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string, 10);
    }
    
    // Get assets with filters and pagination
    const result = await assetService.getAssets(filters);
    
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
  } catch (error: any) {
    console.error('Error fetching assets:', error.message);
    res.status(500).json({ message: 'Failed to fetch assets: ' + error.message });
  }
});

// Get available tags
router.get('/tags', authenticateToken, async (req, res) => {
  try {
    const tags = await assetService.getAvailableTags();
    
    return res.status(200).json({
      success: true,
      data: tags
    });
  } catch (error: any) {
    console.error('Error fetching tags:', error.message);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to fetch tags', 
      error: error.message 
    });
  }
});

// Get available categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await assetService.getAvailableCategories();
    
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error.message);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to fetch categories', 
      error: error.message 
    });
  }
});

// Batch update assets (add/remove tags and categories)
router.post('/batch-update', authenticateToken, async (req, res) => {
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
    const result = await assetService.batchUpdateAssets(
      assetIds, 
      req.user.id, 
      {
        addTags: addTags || [],
        removeTags: removeTags || [],
        addCategories: addCategories || [],
        removeCategories: removeCategories || []
      }
    );
    
    return res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: result.message,
      data: result.data
    });
  } catch (error: any) {
    console.error('Error in batch update:', error.message);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to perform batch update', 
      error: error.message 
    });
  }
});

// Batch delete assets
router.post('/batch-delete', authenticateToken, async (req, res) => {
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
    const result = await assetService.batchDeleteAssets(assetIds, req.user.id);
    
    return res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: result.message,
      data: result.data
    });
  } catch (error: any) {
    console.error('Error in batch delete:', error.message);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to perform batch delete', 
      error: error.message 
    });
  }
});

// Get a single asset by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const asset = await assetService.getAssetById(id);
    
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    
    res.json(asset);
  } catch (error: any) {
    console.error('Error fetching asset:', error.message);
    res.status(500).json({ message: 'Failed to fetch asset' });
  }
});

// Upload a new asset
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
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
    let tags: string[] = [];
    let categories: string[] = [];
    
    if (req.body.tags) {
      tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
    }
    
    if (req.body.categories) {
      categories = typeof req.body.categories === 'string' ? JSON.parse(req.body.categories) : req.body.categories;
    }
    
    // Upload asset using service
    const result = await assetService.uploadAsset(
      req.file,
      req.user.id,
      {
        name: name || req.file.originalname,
        type,
        description,
        tags,
        categories
      }
    );
    
    if (!result.success) {
      return res.status(500).json({ message: result.message || 'Failed to upload asset' });
    }
    
    // Return success response with asset data
    return res.status(201).json({
      success: true,
      message: 'Asset uploaded successfully',
      data: result.asset
    });
  } catch (error: any) {
    console.error('Error in asset upload:', error.message);
    res.status(500).json({ message: 'Failed to upload asset: ' + error.message });
  }
});

// Update an asset
router.put('/:id', authenticateToken, async (req, res) => {
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
    const result = await assetService.updateAsset(id, req.user.id, {
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
  } catch (error: any) {
    console.error('Error updating asset:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update asset: ' + error.message
    });
  }
});

// Delete an asset
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: 'User not properly authenticated' 
      });
    }

    const { id } = req.params;
    
    // Delete the asset using service
    const result = await assetService.deleteAsset(id, req.user.id);
    
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
  } catch (error: any) {
    console.error('Error deleting asset:', error.message);
    res.status(500).json({
      success: false, 
      message: 'Failed to delete asset: ' + error.message
    });
  }
});

// Toggle favourite status
router.put('/:id/favourite', authenticateToken, async (req, res) => {
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
    const result = await assetService.toggleFavourite(id, req.user.id, isFavourite);
    
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
  } catch (error: any) {
    console.error('Error toggling favourite:', error.message);
    res.status(500).json({
      success: false, 
      message: 'Failed to update favourite status: ' + error.message
    });
  }
});

// Increment asset usage count
router.post('/:id/increment-usage', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: 'User not properly authenticated' 
      });
    }

    const { id } = req.params;
    
    // Increment usage count using the service
    const result = await assetService.incrementUsageCount(id);
    
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
  } catch (error: any) {
    console.error('Error incrementing usage count:', error.message);
    res.status(500).json({
      success: false, 
      message: 'Failed to increment usage count: ' + error.message
    });
  }
});

// Serve asset files (in development mode)
router.get('/file/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../../uploads', req.params.filename);
  res.sendFile(filePath);
});



export default router;