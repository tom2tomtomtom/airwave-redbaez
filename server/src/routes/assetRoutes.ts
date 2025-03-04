import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabaseClient';
import { authenticateToken } from '../middleware/auth';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
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

// Get all assets for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('owner_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data.map(transformAssetFromDb));
  } catch (error: any) {
    console.error('Error fetching assets:', error.message);
    res.status(500).json({ message: 'Failed to fetch assets' });
  }
});

// Get a single asset by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    res.json(transformAssetFromDb(data));
  } catch (error: any) {
    console.error('Error fetching asset:', error.message);
    res.status(500).json({ message: 'Failed to fetch asset' });
  }
});

// Upload a new asset
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { name, type, description, tags } = req.body;
    let assetUrl = '';
    let thumbnailUrl = '';
    let content = '';
    let metadata: any = {};
    
    // Parse tags if they exist
    const parsedTags = tags ? JSON.parse(tags) : [];

    // For text assets, use the content field
    if (type === 'text') {
      content = req.body.content || '';
    } else if (req.file) {
      // For file assets, upload to cloud storage or process locally
      const filePath = req.file.path;
      const mimeType = req.file.mimetype;
      
      // In production, upload to cloud storage
      if (process.env.NODE_ENV === 'production') {
        // TODO: Implement cloud storage upload
        assetUrl = `/api/assets/file/${req.file.filename}`;
      } else {
        // In development, serve from local path
        assetUrl = `/api/assets/file/${req.file.filename}`;
      }
      
      // Generate thumbnail or extract metadata based on asset type
      if (type === 'image') {
        // Extract image metadata
        const imageInfo = await sharp(filePath).metadata();
        metadata = {
          width: imageInfo.width,
          height: imageInfo.height,
          format: imageInfo.format,
          size: req.file.size
        };
        
        // Create thumbnail
        const thumbnailFilename = `thumbnail-${path.basename(req.file.filename)}`;
        const thumbnailPath = path.join(path.dirname(filePath), thumbnailFilename);
        
        await sharp(filePath)
          .resize(300, 300, { fit: 'inside' })
          .toFile(thumbnailPath);
          
        thumbnailUrl = `/api/assets/file/${thumbnailFilename}`;
      } else if (type === 'video') {
        // TODO: Extract video metadata with ffmpeg
        metadata = {
          size: req.file.size
        };
        
        // Generate video thumbnail (in production)
        if (process.env.NODE_ENV === 'production') {
          const thumbnailFilename = `thumbnail-${path.basename(req.file.filename)}.jpg`;
          const thumbnailPath = path.join(path.dirname(filePath), thumbnailFilename);
          
          // This would normally use ffmpeg
          // For now, just set a placeholder
          thumbnailUrl = `/api/assets/file/${thumbnailFilename}`;
        }
      } else if (type === 'audio') {
        // TODO: Extract audio metadata with ffmpeg
        metadata = {
          size: req.file.size
        };
      }
    } else if (!content) {
      return res.status(400).json({ message: 'No file uploaded and no content provided' });
    }

    // Store asset in database
    const { data, error } = await supabase
      .from('assets')
      .insert([
        {
          name,
          type,
          url: assetUrl,
          thumbnail_url: thumbnailUrl,
          content,
          description,
          tags: parsedTags,
          metadata,
          owner_id: req.user.id
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(transformAssetFromDb(data));
  } catch (error: any) {
    console.error('Error uploading asset:', error.message);
    res.status(500).json({ message: 'Failed to upload asset' });
  }
});

// Update an asset
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, tags } = req.body;
    
    // First verify ownership
    const { data: existingAsset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .single();
      
    if (fetchError || !existingAsset) {
      return res.status(404).json({ message: 'Asset not found or permission denied' });
    }
    
    // Update the asset
    const { data, error } = await supabase
      .from('assets')
      .update({
        name,
        description,
        tags,
        updated_at: new Date()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(transformAssetFromDb(data));
  } catch (error: any) {
    console.error('Error updating asset:', error.message);
    res.status(500).json({ message: 'Failed to update asset' });
  }
});

// Delete an asset
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // First fetch the asset to get file path
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .single();
      
    if (fetchError || !asset) {
      return res.status(404).json({ message: 'Asset not found or permission denied' });
    }
    
    // Delete the asset from database
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id);

    if (error) throw error;
    
    // Delete the file if it exists and is stored locally
    if (asset.url && !asset.url.startsWith('http')) {
      const filename = path.basename(asset.url.replace('/api/assets/file/', ''));
      const filePath = path.join(__dirname, '../../uploads', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Also delete thumbnail if it exists
      if (asset.thumbnail_url && !asset.thumbnail_url.startsWith('http')) {
        const thumbnailFilename = path.basename(asset.thumbnail_url.replace('/api/assets/file/', ''));
        const thumbnailPath = path.join(__dirname, '../../uploads', thumbnailFilename);
        
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    }

    res.json({ message: 'Asset deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting asset:', error.message);
    res.status(500).json({ message: 'Failed to delete asset' });
  }
});

// Toggle favorite status
router.put('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { isFavorite } = req.body;
    
    // Update the asset
    const { data, error } = await supabase
      .from('assets')
      .update({
        is_favorite: isFavorite,
        updated_at: new Date()
      })
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json(transformAssetFromDb(data));
  } catch (error: any) {
    console.error('Error toggling favorite:', error.message);
    res.status(500).json({ message: 'Failed to update favorite status' });
  }
});

// Serve asset files (in development mode)
router.get('/file/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../../uploads', req.params.filename);
  res.sendFile(filePath);
});

// Helper function to transform asset from database format to API format
function transformAssetFromDb(asset: any) {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    url: asset.url,
    thumbnailUrl: asset.thumbnail_url,
    content: asset.content,
    description: asset.description,
    tags: asset.tags || [],
    metadata: asset.metadata || {},
    createdAt: asset.created_at,
    updatedAt: asset.updated_at,
    size: asset.metadata?.size,
    width: asset.metadata?.width,
    height: asset.metadata?.height,
    duration: asset.metadata?.duration,
    ownerId: asset.owner_id,
    isFavorite: asset.is_favorite
  };
}

export default router;