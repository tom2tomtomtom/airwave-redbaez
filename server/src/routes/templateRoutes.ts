import express from 'express';
import { checkAuth, checkAdmin } from '../middleware/auth.middleware';
import { supabase } from '../db/supabaseClient';
import { creatomateService } from '../services/creatomateService';

const router = express.Router();

// Get all templates
router.get('/', checkAuth, async (req, res) => {
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
router.get('/:id', checkAuth, async (req, res) => {
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

    // Transform template data
    const template = transformTemplateFromDb(data);

    res.json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error.message);
    res.status(500).json({ message: 'Failed to fetch template' });
  }
});

// Add a new template (admin only)
router.post('/', checkAuth, checkAdmin, async (req, res) => {
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
    if (!name || !format || !thumbnailUrl) {
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
router.put('/:id', checkAuth, checkAdmin, async (req, res) => {
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
router.delete('/:id', checkAuth, checkAdmin, async (req, res) => {
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
router.put('/:id/favorite', checkAuth, async (req, res) => {
  try {
    const { isFavorite } = req.body;
    
    // In prototype mode, we'll just respond with success
    if (process.env.PROTOTYPE_MODE === 'true') {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (error) throw error;
      
      const template = transformTemplateFromDb(data);
      template.isFavorite = isFavorite;
      
      res.json(template);
      return;
    }
    
    // In production mode, manage user_template_favorites table
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
router.post('/import-from-creatomate', checkAuth, checkAdmin, async (req, res) => {
  try {
    // In prototype mode, just simulate a successful import
    if (process.env.PROTOTYPE_MODE === 'true') {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({ 
        message: 'Templates imported successfully', 
        count: 5 
      });
      return;
    }
    
    // For production mode, would use actual Creatomate API
    // This would need to be implemented
    res.json({ 
      message: 'Templates imported successfully', 
      count: 0 
    });
  } catch (error: any) {
    console.error('Error importing templates:', error.message);
    res.status(500).json({ message: 'Failed to import templates from Creatomate' });
  }
});

// Helper function to transform template from database format to API format
function transformTemplateFromDb(template: any) {
  return {
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
    isFavorite: template.is_favorite || false,
    slots: template.slots || []
  };
}

export default router;