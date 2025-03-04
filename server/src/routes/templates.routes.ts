import express from 'express';
import { checkAuth, checkAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// GET - Get all templates (with filtering options)
router.get('/', checkAuth, async (req, res) => {
  try {
    const { brandId, platform, category } = req.query;
    
    // In a real implementation, this would query your database or Creatomate API
    // For prototype, we'll return mock data
    
    // Mock template data - In production this would come from Supabase
    const templates = [
      {
        id: '1',
        name: 'Modern Product Showcase',
        brand: 'Nike',
        brandId: '1',
        description: 'Sleek template for showcasing products with animated transitions',
        platforms: ['instagram', 'facebook'],
        aspectRatios: ['1:1', '4:5', '9:16'],
        thumbnailUrl: 'https://example.com/thumbnails/template1.jpg',
        creatomateTemplateId: 'creatomate-123',
        category: 'product'
      },
      {
        id: '2',
        name: 'Bold Promotion',
        brand: 'Adidas',
        brandId: '2',
        description: 'High-energy template for promotional content with dynamic text effects',
        platforms: ['instagram', 'facebook', 'tiktok'],
        aspectRatios: ['9:16', '16:9'],
        thumbnailUrl: 'https://example.com/thumbnails/template2.jpg',
        creatomateTemplateId: 'creatomate-456',
        category: 'promotion'
      },
      {
        id: '3',
        name: 'Testimonial Spotlight',
        brand: 'Coca-Cola',
        brandId: '3',
        description: 'Template for highlighting customer testimonials with elegant styling',
        platforms: ['youtube', 'facebook'],
        aspectRatios: ['16:9', '1:1'],
        thumbnailUrl: 'https://example.com/thumbnails/template3.jpg',
        creatomateTemplateId: 'creatomate-789',
        category: 'testimonial'
      }
    ];
    
    // Filter templates based on query parameters
    let filteredTemplates = [...templates];
    
    if (brandId) {
      filteredTemplates = filteredTemplates.filter(t => t.brandId === brandId);
    }
    
    if (platform) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.platforms.includes(platform as string)
      );
    }
    
    if (category) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.category === category
      );
    }
    
    res.json({
      success: true,
      data: filteredTemplates
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

// GET - Get a specific template by ID
router.get('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock template data - In production this would come from Supabase
    const templates = [
      {
        id: '1',
        name: 'Modern Product Showcase',
        brand: 'Nike',
        brandId: '1',
        description: 'Sleek template for showcasing products with animated transitions',
        platforms: ['instagram', 'facebook'],
        aspectRatios: ['1:1', '4:5', '9:16'],
        thumbnailUrl: 'https://example.com/thumbnails/template1.jpg',
        creatomateTemplateId: 'creatomate-123',
        category: 'product',
        // Template structure that would be sent to Creatomate
        structure: {
          scenes: [
            {
              elements: [
                { type: 'video', name: 'product_video', position: 'center' },
                { type: 'text', name: 'product_name', position: 'bottom' },
                { type: 'text', name: 'tagline', position: 'top' }
              ],
              duration: 5
            }
          ]
        }
      },
      // Other templates...
    ];
    
    const template = templates.find(t => t.id === id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message
    });
  }
});

// POST - Create a new template (admin only)
router.post('/', checkAuth, checkAdmin, async (req, res) => {
  try {
    const { 
      name, 
      brandId, 
      description, 
      platforms, 
      aspectRatios, 
      creatomateTemplateId,
      category,
      structure
    } = req.body;
    
    // Validate required fields
    if (!name || !brandId || !creatomateTemplateId || !platforms || !aspectRatios) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // In production, this would create a new template in your database
    const newTemplate = {
      id: Date.now().toString(),
      name,
      brandId,
      description,
      platforms,
      aspectRatios,
      creatomateTemplateId,
      category,
      structure,
      thumbnailUrl: req.body.thumbnailUrl || 'https://example.com/default-thumbnail.jpg'
    };
    
    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: newTemplate
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
});

// PUT - Update a template (admin only)
router.put('/:id', checkAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // In production, this would update the template in your database
    // For now, we just return the merged data
    res.json({
      success: true,
      message: 'Template updated successfully',
      data: {
        id,
        ...updates
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
});

// DELETE - Delete a template (admin only)
router.delete('/:id', checkAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // In production, this would delete the template from your database
    res.json({
      success: true,
      message: 'Template deleted successfully',
      data: { id }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
});

export default router;