import express from 'express';
import { supabase } from '../../db/supabaseClient';
import { authenticateToken } from '../../middleware/auth';
import { Asset } from '../../types/shared';

const router = express.Router();

/**
 * Transform a database asset record to the client-friendly Asset format
 */
const transformAssetFromDb = (dbAsset: any): Asset => {
  return {
    id: dbAsset.id,
    name: dbAsset.name,
    type: dbAsset.type,
    url: dbAsset.url,
    thumbnailUrl: dbAsset.thumbnail_url,
    description: dbAsset.description || '',
    tags: dbAsset.tags || [],
    clientSlug: dbAsset.client_slug || '',
    clientId: dbAsset.client_id,
    isFavourite: dbAsset.is_favourite || false,
    createdAt: dbAsset.created_at,
    updatedAt: dbAsset.updated_at,
    ownerId: dbAsset.owner_id || dbAsset.user_id,
    size: dbAsset.size,
    width: dbAsset.width,
    height: dbAsset.height,
    duration: dbAsset.duration,
    status: dbAsset.status || 'ready',
    metadata: dbAsset.metadata || {}
  };
};

/**
 * Get all assets with optional filtering
 * GET /api/v2/assets
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('GET v2/assets request, user:', req.user?.id);
    console.log('Query params:', req.query);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not properly authenticated'
      });
    }
    
    // Build the base query
    let dataQuery = supabase
      .from('assets')
      .select('*, clients(client_slug)');
    
    // Apply filters
    // Client filter
    if (req.query.clientId) {
      dataQuery = dataQuery.eq('client_id', req.query.clientId);
    }
    
    // Type filter
    if (req.query.type && req.query.type !== 'all') {
      dataQuery = dataQuery.eq('type', req.query.type);
    }
    
    // Search filter
    if (req.query.search) {
      const searchTerm = req.query.search as string;
      dataQuery = dataQuery.ilike('name', `%${searchTerm}%`);
    }
    
    // Favourite filter
    if (req.query.favourite === 'true') {
      dataQuery = dataQuery.eq('is_favourite', true);
    }
    
    // Apply pagination
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    // Apply sorting
    const sortBy = req.query.sortBy || 'created_at';
    const sortDirection = req.query.sortDirection || 'desc';
    
    // Map frontend field names to database field names
    let sortField: string;
    if (sortBy === 'name') {
      sortField = 'name';
    } else if (sortBy === 'createdAt') {
      sortField = 'created_at';
    } else if (sortBy === 'updatedAt') {
      sortField = 'updated_at';
    } else {
      sortField = 'created_at'; // Default
    }
    
    dataQuery = dataQuery
      .order(sortField, { ascending: sortDirection === 'asc' })
      .range(offset, offset + limit - 1);
    
    // Execute the query
    const { data: rawAssets, error, count } = await dataQuery;
    
    if (error) {
      console.error('Error fetching assets:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch assets',
        error: error.message
      });
    }
    
    // Transform the assets to include client slug
    const assets = rawAssets.map(asset => {
      const clientSlug = asset.clients?.client_slug || '';
      delete asset.clients; // Remove the nested client object
      
      return transformAssetFromDb({
        ...asset,
        client_slug: clientSlug
      });
    });
    
    return res.status(200).json({
      success: true,
      assets,
      total: count || assets.length
    });
  } catch (error: any) {
    console.error('Error in GET /v2/assets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assets',
      error: error.message
    });
  }
});

/**
 * Get assets by client slug
 * GET /api/v2/assets/by-client/:slug
 */
router.get('/by-client/:slug', authenticateToken, async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    console.log(`GET v2/assets/by-client/${slug} request`);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not properly authenticated'
      });
    }
    
    // 1. Find the client using the slug
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, client_slug')
      .eq('client_slug', slug)
      .single();
    
    if (clientError) {
      if (clientError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: `Client with slug "${slug}" not found`
        });
      }
      
      console.error('Error finding client by slug:', clientError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch client',
        error: clientError.message
      });
    }
    
    // 2. Build the assets query
    let dataQuery = supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .eq('client_id', client.id);
    
    // Apply filters
    // Type filter
    if (req.query.type && req.query.type !== 'all') {
      dataQuery = dataQuery.eq('type', req.query.type);
    }
    
    // Search filter
    if (req.query.search) {
      const searchTerm = req.query.search as string;
      dataQuery = dataQuery.ilike('name', `%${searchTerm}%`);
    }
    
    // Favourite filter
    if (req.query.favourite === 'true') {
      dataQuery = dataQuery.eq('is_favourite', true);
    }
    
    // Apply pagination
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    // Apply sorting
    const sortBy = req.query.sortBy || 'created_at';
    const sortDirection = req.query.sortDirection || 'desc';
    
    // Map frontend field names to database field names
    let sortField: string;
    if (sortBy === 'name') {
      sortField = 'name';
    } else if (sortBy === 'createdAt') {
      sortField = 'created_at';
    } else if (sortBy === 'updatedAt') {
      sortField = 'updated_at';
    } else {
      sortField = 'created_at'; // Default
    }
    
    dataQuery = dataQuery
      .order(sortField, { ascending: sortDirection === 'asc' })
      .range(offset, offset + limit - 1);
    
    // Execute the query
    const { data: rawAssets, error, count } = await dataQuery;
    
    if (error) {
      console.error('Error fetching assets by client slug:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch assets',
        error: error.message
      });
    }
    
    // Transform the assets to include client slug
    const assets = rawAssets.map(asset => transformAssetFromDb({
      ...asset,
      client_slug: client.client_slug
    }));
    
    console.log(`Found ${assets.length} assets for client slug "${slug}"`);
    
    return res.status(200).json({
      success: true,
      assets,
      total: count || assets.length
    });
  } catch (error: any) {
    console.error('Error in GET /v2/assets/by-client/:slug:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assets',
      error: error.message
    });
  }
});

export default router;
