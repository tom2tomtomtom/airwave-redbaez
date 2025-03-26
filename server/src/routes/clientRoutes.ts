import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import { Request, Response } from 'express';
import { generateClientSlug, runClientSlugMigration } from '../migrations/addClientSlugs';

// SQL function to look up assets by client slug
async function createAssetLookupFunction() {
  const functionSQL = `
    CREATE OR REPLACE FUNCTION get_assets_by_client_slug(slug TEXT)
    RETURNS SETOF assets
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT a.*
      FROM assets a
      JOIN clients c ON a.client_id = c.id
      WHERE c.client_slug = slug;
    $$;
  `;
  
  try {
    const { error } = await supabase.rpc('execute_sql', { sql: functionSQL });
    
    if (error) {
      console.error('Error creating get_assets_by_client_slug function:', error);
      throw error;
    }
    
    console.log('Successfully created get_assets_by_client_slug function');
    return true;
  } catch (err) {
    console.error('Failed to create asset lookup function:', err);
    throw new Error('Could not create asset lookup function');
  }
}

const router = express.Router();

// Apply auth middleware to all client routes
router.use(authenticateToken);

// Validation rules for client creation/updating
const clientValidationRules = [
  body('name').notEmpty().withMessage('Client name is required').trim(),
  body('logo_url').optional({ nullable: true }).isURL().withMessage('Logo URL must be a valid URL'),
  body('primary_color').optional({ nullable: true }).isHexColor().withMessage('Primary colour must be a valid hex colour'),
  body('secondary_color').optional({ nullable: true }).isHexColor().withMessage('Secondary colour must be a valid hex colour'),
  body('description').optional({ nullable: true }).trim(),
  body('is_active').optional().isBoolean().withMessage('Is active must be a boolean')
];

// Get all clients
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[SERVER] Fetching all clients');
    
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('[SERVER] Supabase error fetching clients:', error);
      throw error;
    }
    
    // Validate clients data
    if (!clients || !Array.isArray(clients)) {
      console.error('[SERVER] Invalid clients data format:', clients);
      throw new Error('Invalid client data format returned from database');
    }
    
    console.log(`[SERVER] Successfully fetched ${clients.length} clients`);
    
    // Send a consistent response format
    res.json(clients);
  } catch (error) {
    console.error('[SERVER] Error fetching clients:', error);
    res.status(500).json({ 
      message: 'Error fetching clients',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/clients/slug/:slug
 * @desc Get a client by its slug
 * @access Private
 */
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    console.log(`[SERVER] Fetching client by slug: ${slug}`);
    
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_slug', slug)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Client not found with this slug' });
      }
      throw error;
    }
    
    res.json(client);
  } catch (error) {
    console.error('[SERVER] Error fetching client by slug:', error);
    res.status(500).json({ 
      message: 'Error fetching client',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/clients/run-migration
 * @desc Run the client slug migration
 * @access Private (admin only)
 */
router.post('/run-migration', async (req: Request, res: Response) => {
  try {
    // Check if user is admin (in a real app)
    if (req.user?.role !== 'admin' && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Only administrators can run migrations' });
    }
    
    console.log('[SERVER] Running client slug migration');
    await runClientSlugMigration();
    
    res.json({ message: 'Client slug migration completed successfully' });
  } catch (error) {
    console.error('[SERVER] Error running client slug migration:', error);
    res.status(500).json({ 
      message: 'Error running migration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get a client by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ message: 'Client not found' });
        return;
      }
      throw error;
    }
    
    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ 
      message: 'Error fetching client',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new client
router.post('/', clientValidationRules, async (req: Request, res: Response) => {
  try {
    console.log('Client creation payload:', req.body);
    
    // Map fields from client-side format to database format
    // Handle differences between camelCase and snake_case, as well as naming differences
    interface DbClientData {
      name?: string;
      description?: string;
      logo_url?: string;
      is_active?: boolean;
      primary_color?: string;
      secondary_color?: string;
      client_slug?: string;
      created_at?: string;
      updated_at?: string;
    }
    
    const mappedData: DbClientData = {};
    
    // Direct mappings
    if (req.body.name) mappedData.name = req.body.name;
    if (req.body.description) mappedData.description = req.body.description;
    
    // Explicitly handle logo URL (it may be empty string which is falsy)
    console.log('Logo URL from request:', req.body.logoUrl);
    mappedData.logo_url = req.body.logoUrl || null; // Convert empty string to null if needed
    
    if (req.body.isActive !== undefined) mappedData.is_active = req.body.isActive;
    
    // Handle British spelling to American spelling conversion
    if (req.body.brandColour) mappedData.primary_color = req.body.brandColour;
    if (req.body.secondaryColour) mappedData.secondary_color = req.body.secondaryColour;
    
    // Also handle if someone is using American spelling on the frontend
    if (req.body.brandColor) mappedData.primary_color = req.body.brandColor;
    if (req.body.secondaryColor) mappedData.secondary_color = req.body.secondaryColor;
    
    console.log('Mapped client data for database:', mappedData);
    
    // Validate mapped data
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ errors: validationErrors.array() });
    }
    
    // Generate a slug from the client name
    const clientName = mappedData.name || 'client';
    const generatedSlug = await generateClientSlug(clientName);
    
    // Add the slug to the client data
    const clientData = {
      ...mappedData,
      client_slug: generatedSlug,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Check if this slug already exists (should be handled by generateClientSlug, but double-check)
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('client_slug', generatedSlug)
      .single();
    
    if (existingClient) {
      // Append random string if slug already exists
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      clientData.client_slug = `${generatedSlug}-${randomSuffix}`;
    }
    
    // No need for a second validation - we already did it above
    
    // Log the final client data being sent to the database
    console.log('Final client data being sent to database:', clientData);
    
    // Use the clientData that includes the slug
    const { data: client, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ 
      message: 'Error creating client',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/clients/create-asset-lookup
 * @desc Create the database function for asset lookup by client slug
 */
router.post('/create-asset-lookup', async (req: Request, res: Response) => {
  try {
    console.log('[SERVER] Creating asset lookup function');
    await createAssetLookupFunction();
    
    res.json({ message: 'Asset lookup function created successfully' });
  } catch (error) {
    console.error('[SERVER] Error creating asset lookup function:', error);
    res.status(500).json({ 
      message: 'Error creating asset lookup function',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update a client
router.put('/:id', clientValidationRules, async (req: Request, res: Response) => {
  try {
    console.log('Updating client:', req.params.id);
    console.log('Update payload:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    
    const { id } = req.params;
    
    // Map fields from client-side format to database format, just like in POST
    interface DbClientData {
      name?: string;
      description?: string;
      logo_url?: string;
      is_active?: boolean;
      primary_color?: string;
      secondary_color?: string;
      updated_at?: string;
    }
    
    const mappedData: DbClientData = {};
    
    // Direct mappings
    if (req.body.name) mappedData.name = req.body.name;
    if (req.body.description !== undefined) mappedData.description = req.body.description;
    
    // Explicitly handle logo URL (it may be empty string which is falsy)
    console.log('Logo URL from update request:', req.body.logoUrl);
    mappedData.logo_url = req.body.logoUrl || null; // Convert empty string to null if needed
    
    if (req.body.isActive !== undefined) mappedData.is_active = req.body.isActive;
    
    // Handle British spelling to American spelling conversion
    if (req.body.brandColour) mappedData.primary_color = req.body.brandColour;
    if (req.body.secondaryColour) mappedData.secondary_color = req.body.secondaryColour;
    
    // Also handle if someone is using American spelling on the frontend
    if (req.body.brandColor) mappedData.primary_color = req.body.brandColor;
    if (req.body.secondaryColor) mappedData.secondary_color = req.body.secondaryColor;
    
    // Always add updated timestamp
    mappedData.updated_at = new Date().toISOString();
    
    console.log('Mapped update data:', mappedData);
    
    // Check if we're using a slug or UUID for lookup
    let lookupField = 'id';
    
    // If the ID param is not a UUID, assume it's a slug
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      console.log('ID appears to be a slug, using client_slug for lookup');
      lookupField = 'client_slug';
    }
    
    // First check if client exists
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq(lookupField, id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        res.status(404).json({ message: 'Client not found' });
        return;
      }
      throw fetchError;
    }
    
    console.log('Found existing client:', existingClient);
    
    const { data: client, error } = await supabase
      .from('clients')
      .update(mappedData)
      .eq('id', existingClient.id) // Always use the database ID for updates
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ 
      message: 'Error updating client',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to get counts of related items for a client
async function getClientRelatedCounts(clientId: string): Promise<{
  assets: number;
  templates: number;
  campaigns: number;
}> {
  // Get asset count
  const { count: assetCount, error: assetError } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);
  
  if (assetError) throw assetError;
  
  // Get template count
  const { count: templateCount, error: templateError } = await supabase
    .from('templates')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);
  
  if (templateError) throw templateError;
  
  // Get campaign count
  const { count: campaignCount, error: campaignError } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);
  
  if (campaignError) throw campaignError;
  
  return {
    assets: assetCount || 0,
    templates: templateCount || 0,
    campaigns: campaignCount || 0
  };
}

// Delete a client
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First check if client exists
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        res.status(404).json({ message: 'Client not found' });
        return;
      }
      throw fetchError;
    }
    
    // Check if client has associated assets, templates, or campaigns
    const counts = await getClientRelatedCounts(id);
    const totalRelated = counts.assets + counts.templates + counts.campaigns;
    
    if (totalRelated > 0) {
      res.status(400).json({ 
        message: 'Cannot delete client with associated assets, templates, or campaigns',
        counts
      });
      return;
    }
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ 
      message: 'Error deleting client',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get related counts for a client
router.get('/:id/counts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First check if client exists
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        res.status(404).json({ message: 'Client not found' });
        return;
      }
      throw fetchError;
    }
    
    const counts = await getClientRelatedCounts(id);
    res.json(counts);
  } catch (error) {
    console.error('Error fetching client related counts:', error);
    res.status(500).json({ 
      message: 'Error fetching client related counts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
