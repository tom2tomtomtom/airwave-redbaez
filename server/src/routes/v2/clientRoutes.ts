import express from 'express';
import { logger } from '../../utils/logger';
import { supabase } from '../../db/supabaseClient';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = express.Router();

/**
 * Get all clients
 * GET /api/v2/clients
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const response = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    const clients = response.data || [];
    const error = response.error;
    
    if (error) {
      logger.error('Error fetching clients:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch clients',
        error: error.message
      });
    }
    
    // Transform to new client format with slug as primary identifier
    const transformedClients = clients.map((client: any) => ({
      slug: client.client_slug,
      name: client.name,
      logoUrl: client.logo_url,
      brandColour: client.primary_color,
      secondaryColour: client.secondary_color,
      description: client.description,
      isActive: client.is_active,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      id: client.id // Keep for backward compatibility
    }));
    
    return res.status(200).json({
      success: true,
      clients: transformedClients
    });
  } catch (error: any) {
    logger.error('Error in GET /clients:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: error.message
    });
  }
});

/**
 * Get client by slug
 * GET /api/v2/clients/by-slug/:slug
 */
router.get('/by-slug/:slug', authenticateToken, async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    
    const response = await supabase
      .from('clients')
      .select('*')
      .eq('client_slug', slug)
      .single();
    
    const client = response.data;
    const error = response.error;
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: `Client with slug "${slug}" not found`
        });
      }
      
      logger.error('Error fetching client by slug:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch client',
        error: error.message
      });
    }
    
    // Transform to new client format
    const transformedClient = {
      slug: client.client_slug,
      name: client.name,
      logoUrl: client.logo_url,
      brandColour: client.primary_color,
      secondaryColour: client.secondary_color,
      description: client.description,
      isActive: client.is_active,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      id: client.id // Keep for backward compatibility
    };
    
    return res.status(200).json({
      success: true,
      client: transformedClient
    });
  } catch (error: any) {
    logger.error('Error in GET /clients/by-slug/:slug:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch client',
      error: error.message
    });
  }
});

export default router;
