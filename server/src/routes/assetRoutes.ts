import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, AUTH_MODE } from '../middleware/auth';
import { normalizeClientParams, normalizePaginationParams, normalizeAllParams } from '../middleware/paramNormalization';
import fs from 'fs';
import { supabase } from '../db/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { assetService, AssetFilters, ServiceResult, Asset } from '../services/assetService.new';

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

// Debug endpoint to check users table structure (REMOVE IN PRODUCTION)
router.get('/debug-users-schema', async (req, res) => {
  try {
    // First try to get the users schema
    const { data, error } = await supabase
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
      }, {} as Record<string, string>) : 
      { message: 'No data found in users table, but table exists' };
    
    // Check if there are any users in the table
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact' });
      
    // Try to see what tables exist
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_tables');
    
    return res.status(200).json({
      success: true,
      schema: schema,
      sampleData: data,
      userCount: count,
      tables: tables || 'Could not retrieve tables list',
      tablesError: tablesError
    });
  } catch (err: any) {
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
  } catch (err: any) {
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
        clientId: req.query.clientId?.toString() || '', // Include client ID for proper asset association
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
        clientId: req.query.clientId?.toString() || '', // Include client ID for proper asset association
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
      client_id: req.query.clientId as string || null, // Add client ID for proper asset association
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

// Dedicated endpoint for fetching assets by client slug
router.get('/by-client/:slug', authenticateToken, async (req, res) => {
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
    const options: Omit<AssetFilters, 'clientSlug'> = {
      userId: req.user.id
    };
    
    // Add pagination parameters
    if (req.query.limit) options.limit = parseInt(req.query.limit as string);
    if (req.query.offset) options.offset = parseInt(req.query.offset as string);
    
    // Add sorting parameters
    if (req.query.sortBy) options.sortBy = req.query.sortBy as string;
    if (req.query.sortDirection) options.sortDirection = req.query.sortDirection as 'asc' | 'desc';
    
    // Add filtering parameters
    if (req.query.type) options.type = req.query.type as string;
    if (req.query.search) options.search = req.query.search as string;
    if (req.query.favourite) options.favourite = req.query.favourite === 'true';
    
    console.log(`Fetching assets for client slug: ${slug} with options:`, options);
    
    const result = await assetService.getAssetsByClientSlug(slug, options);
    
    return res.status(200).json({
      success: true,
      message: 'Assets retrieved successfully',
      data: {
        assets: result.assets,
        total: result.total
      }
    });
  } catch (error: any) {
    console.error('Error fetching assets by client slug:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assets',
      error: error.message
    });
  }
});

// Get all assets with optional filtering
router.get('/', authenticateToken, async (req, res) => {
  console.log('GET assets request, user:', req.user);
  console.log('Query params:', req.query);
  
  try {
    // Initialize filters
    let filters: AssetFilters = {};
    
    // Handle user ID - use the req.user.id if available, otherwise use development user ID
    if (req.user && req.user.id) {
      console.log(`Fetching assets for user ID: ${req.user.id}`);
      filters.userId = req.user.id;
    } else {
      // Use the development user ID as fallback
      console.log(`Using development user ID (${AUTH_MODE.DEV_USER_ID}) for asset retrieval`);
      filters.userId = AUTH_MODE.DEV_USER_ID;
    }
    
    // Add optional filters from query parameters
    if (req.query.type) {
      filters.type = (req.query.type as string).split(',');
    }
    
    // QUICKFIX: Handle selectedClientId parameter from frontend
    if (req.query.selectedClientId) {
      console.log('🔍 Found selectedClientId parameter:', req.query.selectedClientId);
      filters.clientId = req.query.selectedClientId as string;
    }
    
    // Also handle traditional clientId parameter
    else if (req.query.clientId || req.query.client_id) {
      // Prioritize clientId if both are present
      const clientIdValue = (req.query.clientId || req.query.client_id) as string;
      console.log('🔍 Filtering assets by clientId:', clientIdValue);
      
      // Check if this appears to be a client slug (human-readable) rather than UUID
      if (clientIdValue && !clientIdValue.includes('-') && isNaN(parseInt(clientIdValue))) {
        console.log('🚀 Using client slug for filtering:', clientIdValue);
        filters.clientSlug = clientIdValue.toLowerCase();
      } else {
        // It's a UUID-style client ID
        filters.clientId = clientIdValue;
      }
    }
    
    // Also add direct support for slug parameter
    if (req.query.clientSlug) {
      filters.clientSlug = (req.query.clientSlug as string).toLowerCase();
      console.log('🔑 Filtering assets directly by client slug:', filters.clientSlug);
    }
    
    console.log('Final asset filters:', filters);
    
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
  // ALWAYS use the file system approach when in development with the dev user
  // This avoids the foreign key constraint issues with Supabase
  const isUsingDevUser = req.user && req.user.id === AUTH_MODE.DEV_USER_ID;
  
  // Force prototype-like mode when using dev user ID
  const forceFileSystemMode = isUsingDevUser && process.env.NODE_ENV !== 'production';
  
  // Check if standard prototype mode is enabled
  const isConfiguredPrototypeMode = AUTH_MODE.CURRENT === 'prototype' || process.env.PROTOTYPE_MODE === 'true';
  
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
  console.log('Current auth mode:', AUTH_MODE.CURRENT);
  
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
    let tags: string[] = [];
    let categories: string[] = [];
    
    if (req.body.tags) {
      try {
        tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
        console.log('Parsed tags:', tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }
    
    if (req.body.categories) {
      try {
        categories = typeof req.body.categories === 'string' ? JSON.parse(req.body.categories) : req.body.categories;
        console.log('Parsed categories:', categories);
      } catch (e) {
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
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Create unique filename with sanitized name
        const fileExt = path.extname(req.file.originalname);
        const assetId = uuidv4();
        const sanitizedName = (name || req.file.originalname.split('.')[0])
          .replace(/[^a-zA-Z0-9]/g, '-')
          .substring(0, 30); // Limit length
        const assetFileName = `asset-${sanitizedName}-${assetId}${fileExt}`;
        const assetFilePath = path.join(uploadsDir, assetFileName);
        
        console.log('File system mode: Copying file from temp to uploads directory');
        console.log(`Source: ${req.file.path}`);
        console.log(`Destination: ${assetFilePath}`);
        
        // Move the file - use fs.renameSync for faster performance, but if that fails (e.g., across devices), fall back to copy
        try {
          fs.renameSync(req.file.path, assetFilePath);
          console.log('File moved successfully using rename');
        } catch (renameErr) {
          console.warn('Could not rename file, falling back to copy:', renameErr);
          fs.copyFileSync(req.file.path, assetFilePath);
          // Clean up the temp file after successful copy
          try {
            fs.unlinkSync(req.file.path);
          } catch (unlinkErr) {
            console.warn('Failed to clean up temp file:', unlinkErr);
          }
          console.log('File copied successfully');
        }
        
        // Generate thumbnail path
        const thumbnailFileName = `thumb-${assetId}${fileExt}`;
        const thumbnailPath = path.join(uploadsDir, thumbnailFileName);
        
        // Just copy the file to create a simple thumbnail
        fs.copyFileSync(assetFilePath, thumbnailPath);
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
      } catch (protoError: any) {
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
    const result = await assetService.uploadAsset(
      req.file,
      req.user.id,
      {
        name: name || req.file.originalname,
        type,
        description,
        tags,
        categories,
        clientId // Include the client ID for proper association
      }
    );
    
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
  } catch (error: any) {
    console.error('Exception in asset upload:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload asset: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Batch upload multiple assets
router.post('/batch-upload', authenticateToken, upload.array('images', 10), async (req, res) => {
  console.log('POST batch asset upload request received');
  console.log('User:', req.user);
  console.log('Files:', req.files ? `${(req.files as Express.Multer.File[]).length} files received` : 'No files');
  
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
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

    const files = req.files as Express.Multer.File[];
    const uploadedAssets = [];
    
    // SIMPLIFIED APPROACH - Just copy files to uploads directory
    for (const file of files) {
      try {
        // Generate a unique ID for this asset
        const assetId = uuidv4();
        
        // Create a normalized file name
        const fileExt = path.extname(file.originalname);
        const assetFileName = `asset-${assetId}${fileExt}`;
        
        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Copy file from temp to uploads directory
        const assetFilePath = path.join(uploadsDir, assetFileName);
        fs.copyFileSync(file.path, assetFilePath);
        
        // Create a simple thumbnail (just a copy for now)
        const thumbnailFileName = `thumb-${assetId}${fileExt}`;
        const thumbnailPath = path.join(uploadsDir, thumbnailFileName);
        fs.copyFileSync(file.path, thumbnailPath);
        
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
      } catch (fileError) {
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
  } catch (error: any) {
    console.error('Exception in batch asset upload:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload assets: ' + error.message,
      error: error
    });
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

    // Use a default status code of 200 if the result doesn't provide one
    const statusCode = 200;
    return res.status(statusCode).json({
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
      // Use a default status code of 500 if not specified
      const errorStatusCode = 500;
      return res.status(errorStatusCode).json({
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



/**
 * Create a new asset directly from a URL (for videos generated by AI)
 * This endpoint allows saving videos directly to the asset library without uploading files
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      name, 
      type, 
      url, 
      thumbnailUrl, 
      clientId,
      metadata
    } = req.body;
    
    console.log('Creating asset from URL:', { name, type, url, clientId });
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }
    
    // Create a unique ID for the asset
    const assetId = uuidv4();
    const userId = req.user?.id;
    
    // Initialize asset object with the provided data
    const asset: Asset = {
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
    const { data, error } = await supabase
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
      asset: assetService.transformAssetFromDb(dbRecord as any)
    });
  } catch (error: any) {
    console.error('Error creating asset from URL:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to create asset: ${error.message || 'Unknown error'}`
    });
  }
});

export default router;