import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Initialize environment variables
dotenv.config();

// Server configuration
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API route for testing
app.get('/api/test', (req, res) => {
  res.json({
    message: 'AIrWAVE API is running!',
    environment: process.env.NODE_ENV || 'development',
    creatomateConfigured: !!process.env.CREATOMATE_API_KEY,
    supabaseConfigured: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_KEY
  });
});

// Sample assets route
app.get('/api/assets', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'mock-asset-1',
        name: 'Demo Product Image',
        type: 'image',
        description: 'Sample product image for demonstration',
        file_url: 'https://via.placeholder.com/500x500?text=Product',
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-asset-2',
        name: 'Demo Video',
        type: 'video',
        description: 'Sample video for demonstration',
        file_url: 'https://example.com/sample-video.mp4',
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-asset-3',
        name: 'Demo Audio',
        type: 'audio',
        description: 'Sample audio for demonstration',
        file_url: 'https://example.com/sample-audio.mp3',
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-asset-4',
        name: 'Demo Text',
        type: 'text',
        content: 'This is a sample text for demonstration purposes. It can be used for ad copy, descriptions, or any other text content.',
        created_at: new Date().toISOString()
      }
    ]
  });
});

// Sample templates route
app.get('/api/templates', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'mock-template-1',
        name: 'Product Showcase Square',
        description: 'A dynamic template for showcasing products with animated text overlays.',
        format: 'square',
        thumbnail_url: 'https://via.placeholder.com/500x500?text=Product+Showcase',
        preview_url: 'https://example.com/preview-1.mp4',
        platforms: ['instagram', 'facebook'],
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-template-2',
        name: 'Brand Story Vertical',
        description: 'Vertical video template for telling your brand story with multiple scenes.',
        format: 'portrait',
        thumbnail_url: 'https://via.placeholder.com/500x889?text=Brand+Story',
        preview_url: 'https://example.com/preview-2.mp4',
        platforms: ['instagram', 'tiktok'],
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-template-3',
        name: 'Product Demo Landscape',
        description: 'Landscape video for detailed product demonstrations and features.',
        format: 'landscape',
        thumbnail_url: 'https://via.placeholder.com/800x450?text=Product+Demo',
        preview_url: 'https://example.com/preview-3.mp4',
        platforms: ['youtube', 'facebook'],
        created_at: new Date().toISOString()
      }
    ]
  });
});

// Sample campaigns route
app.get('/api/campaigns', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'mock-campaign-1',
        name: 'Summer Collection Launch',
        description: 'Launch campaign for our new summer collection',
        client: 'Fashion Brand',
        status: 'active',
        platforms: ['instagram', 'facebook', 'tiktok'],
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-campaign-2',
        name: 'Holiday Promotion',
        description: 'Special discounts and offers for the holiday season',
        client: 'Retail Company',
        status: 'draft',
        platforms: ['facebook', 'youtube'],
        created_at: new Date().toISOString()
      }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`Sample assets: http://localhost:${PORT}/api/assets`);
  console.log(`Sample templates: http://localhost:${PORT}/api/templates`);
  console.log(`Sample campaigns: http://localhost:${PORT}/api/campaigns`);
});