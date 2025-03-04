import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import { CreatomateService } from '../services/creatomateService';

const router = express.Router();
const creatomateService = new CreatomateService();

// Get all templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data for frontend
    const templates = data.map(transformTemplateFromDb);

    res.json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error.message);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

// Get template by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Get template details from Creatomate if in production mode
    let creatomateTemplate = null;
    if (process.env.NODE_ENV === 'production' && data.creatomate_template_id) {
      try {
        creatomateTemplate = await creatomateService.getTemplate(data.creatomate_template_id);
      } catch (creatomateError) {
        console.error('Error fetching from Creatomate:', creatomateError);
        // Continue without Creatomate data
      }
    }

    // Merge Creatomate data if available
    const template = transformTemplateFromDb(data, creatomateTemplate);

    res.json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error.message);
    res.status(500).json({ message: 'Failed to fetch template' });
  }
});

// Add a new template (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      format, 
      thumbnailUrl, 
      previewUrl, 
      duration, 
      platforms, 
      parameters, 
      requirements,
      creatomateTemplateId 
    } = req.body;

    // Validate required fields
    if (!name || !format || !thumbnailUrl || !creatomateTemplateId) {
      return res.status(400).json({ message: 'Missing required template fields' });
    }

    // Insert into database
    const { data, error } = await supabase
      .from('templates')
      .insert([
        {
          name,
          description,
          format,
          thumbnail_url: thumbnailUrl,
          preview_url: previewUrl,
          duration,
          platforms,
          parameters,
          requirements,
          creatomate_template_id: creatomateTemplateId,
          created_by: req.user.id
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(transformTemplateFromDb(data));
  } catch (error: any) {
    console.error('Error creating template:', error.message);
    res.status(500).json({ message: 'Failed to create template' });
  }
});

// Update a template (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      format, 
      thumbnailUrl, 
      previewUrl, 
      duration, 
      platforms, 
      parameters, 
      requirements 
    } = req.body;

    // Update in database
    const { data, error } = await supabase
      .from('templates')
      .update({
        name,
        description,
        format,
        thumbnail_url: thumbnailUrl,
        preview_url: previewUrl,
        duration,
        platforms,
        parameters,
        requirements,
        updated_at: new Date()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(transformTemplateFromDb(data));
  } catch (error: any) {
    console.error('Error updating template:', error.message);
    res.status(500).json({ message: 'Failed to update template' });
  }
});

// Delete a template (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error.message);
    res.status(500).json({ message: 'Failed to delete template' });
  }
});

// Toggle favorite status for a template
router.put('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { isFavorite } = req.body;
    
    // Check if user favorite exists
    const { data: existingFavorite } = await supabase
      .from('user_template_favorites')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('template_id', req.params.id)
      .single();
    
    if (isFavorite && !existingFavorite) {
      // Add favorite
      await supabase
        .from('user_template_favorites')
        .insert([
          {
            user_id: req.user.id,
            template_id: req.params.id
          }
        ]);
    } else if (!isFavorite && existingFavorite) {
      // Remove favorite
      await supabase
        .from('user_template_favorites')
        .delete()
        .eq('user_id', req.user.id)
        .eq('template_id', req.params.id);
    }
    
    // Get updated template
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    
    const template = transformTemplateFromDb(data);
    template.isFavorite = isFavorite;
    
    res.json(template);
  } catch (error: any) {
    console.error('Error toggling favorite:', error.message);
    res.status(500).json({ message: 'Failed to update favorite status' });
  }
});

// Import templates from Creatomate (admin only)
router.post('/import-from-creatomate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // In a real implementation, this would fetch templates from Creatomate API
    // For prototype, we'll simulate with mock data
    if (process.env.PROTOTYPE_MODE === 'true') {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({ 
        message: 'Templates imported successfully', 
        count: 5 
      });
      return;
    }
    
    // For production mode
    const templates = await creatomateService.listTemplates();
    
    // Process each template and save to database
    let importCount = 0;
    for (const template of templates) {
      // Check if template already exists
      const { data: existingTemplate } = await supabase
        .from('templates')
        .select('id')
        .eq('creatomate_template_id', template.id)
        .single();
        
      if (!existingTemplate) {
        // Insert new template
        await supabase
          .from('templates')
          .insert([{
            name: template.name,
            description: template.description || '',
            format: determineTemplateFormat(template),
            thumbnail_url: template.thumbnailUrl || '',
            preview_url: template.previewUrl || '',
            duration: template.duration || '',
            platforms: determinePlatforms(template),
            parameters: template.parameters || [],
            requirements: deriveRequirements(template),
            creatomate_template_id: template.id,
            created_by: req.user.id
          }]);
          
        importCount++;
      }
    }
    
    res.json({ 
      message: 'Templates imported successfully', 
      count: importCount 
    });
  } catch (error: any) {
    console.error('Error importing templates:', error.message);
    res.status(500).json({ message: 'Failed to import templates from Creatomate' });
  }
});

// Helper function to transform template from database format to API format
function transformTemplateFromDb(template: any, creatomateTemplate?: any) {
  const transformed = {
    id: template.id,
    name: template.name,
    description: template.description || '',
    format: template.format,
    thumbnailUrl: template.thumbnail_url,
    previewUrl: template.preview_url,
    duration: template.duration,
    platforms: template.platforms || [],
    parameters: template.parameters || [],
    requirements: template.requirements || [],
    creatomateTemplateId: template.creatomate_template_id,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
    isFavorite: template.is_favorite || false
  };
  
  // Merge any additional data from Creatomate if available
  if (creatomateTemplate) {
    // Add/override with Creatomate data as needed
  }
  
  return transformed;
}

// Helper function to determine template format from Creatomate template
function determineTemplateFormat(creatomateTemplate: any): string {
  // Logic to determine if square, portrait, landscape, story based on dimensions
  // For prototype, return a default
  return 'square';
}

// Helper function to determine supported platforms from Creatomate template
function determinePlatforms(creatomateTemplate: any): string[] {
  // Logic to determine platform compatibility
  // For prototype, return defaults
  return ['instagram', 'facebook'];
}

// Helper function to derive asset requirements from Creatomate template
function deriveRequirements(creatomateTemplate: any): any[] {
  // Logic to extract what assets are needed based on template structure
  // For prototype, return empty array
  return [];
}

export default router;