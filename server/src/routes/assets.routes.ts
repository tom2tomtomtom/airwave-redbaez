import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { checkAuth } from '../middleware/auth.middleware';

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine folder based on file type
    let folder = 'uploads/other';
    
    if (file.mimetype.startsWith('video/')) {
      folder = 'uploads/videos';
    } else if (file.mimetype.startsWith('image/')) {
      folder = 'uploads/images';
    } else if (file.mimetype.startsWith('audio/')) {
      folder = 'uploads/voiceovers';
    }
    
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  }
});

// Configure upload limits
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 100 // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific file types
    const allowedTypes = [
      // Videos
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported: ${file.mimetype}`));
    }
  }
});

// Routes
// Get all assets (with optional filtering)
router.get('/', checkAuth, async (req, res) => {
  try {
    // Implement asset retrieval logic
    // This would typically involve database queries
    
    res.json({
      success: true,
      message: 'Assets retrieved successfully',
      data: [] // Replace with actual data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assets',
      error: error.message
    });
  }
});

// Upload a new asset
router.post(
  '/upload',
  checkAuth,
  upload.single('asset'),
  async (req, res) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      // Determine asset type based on MIME type
      let assetType = 'other';
      if (file.mimetype.startsWith('video/')) assetType = 'video';
      else if (file.mimetype.startsWith('image/')) assetType = 'image';
      else if (file.mimetype.startsWith('audio/')) assetType = 'voiceover';
      
      // Here you would save the asset metadata to your database
      // e.g., create an Asset record with file path, type, name, etc.
      
      res.json({
        success: true,
        message: 'Asset uploaded successfully',
        data: {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          path: file.path,
          type: assetType
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to upload asset',
        error: error.message
      });
    }
  }
);

// Get a specific asset by ID
router.get('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Implement asset retrieval by ID
    // This would involve database queries
    
    res.json({
      success: true,
      message: 'Asset retrieved successfully',
      data: { id } // Replace with actual data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset',
      error: error.message
    });
  }
});

// Update asset metadata
router.put('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Implement asset update logic
    // This would involve database updates
    
    res.json({
      success: true,
      message: 'Asset updated successfully',
      data: { id, ...updates } // Replace with actual data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update asset',
      error: error.message
    });
  }
});

// Delete an asset
router.delete('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Implement asset deletion logic
    // This would involve database deletion and file system operations
    
    res.json({
      success: true,
      message: 'Asset deleted successfully',
      data: { id }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete asset',
      error: error.message
    });
  }
});

export default router;