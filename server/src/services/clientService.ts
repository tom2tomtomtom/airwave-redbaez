/**
 * Client service for the AIrWAVE application
 * Handles business logic for client management
 */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { supabase } from '../db/supabaseClient';

/**
 * Get all clients
 */
export const getAllClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json(clients);
  } catch (error) {
    logger.error('Error fetching clients:', error);
    res.status(500).json({ 
      message: 'Error fetching clients',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get a client by ID
 */
export const getClientById = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Error fetching client:', error);
    res.status(500).json({ 
      message: 'Error fetching client',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create a new client
 */
export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    
    const { name, logo_url, primary_color, secondary_color, description } = req.body;
    
    const { data: client, error } = await supabase
      .from('clients')
      .insert([
        { 
          name, 
          logo_url, 
          primary_color, 
          secondary_color, 
          description,
          is_active: true
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(client);
  } catch (error) {
    logger.error('Error creating client:', error);
    res.status(500).json({ 
      message: 'Error creating client',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update a client
 */
export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    
    const { id } = req.params;
    const { name, logo_url, primary_color, secondary_color, description, is_active } = req.body;
    
    // First check if client exists
    const { data: existingClient, error: fetchError } = await supabase
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
    
    const { data: client, error } = await supabase
      .from('clients')
      .update({ 
        name, 
        logo_url, 
        primary_color, 
        secondary_color, 
        description,
        is_active: is_active !== undefined ? is_active : existingClient.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(client);
  } catch (error) {
    logger.error('Error updating client:', error);
    res.status(500).json({ 
      message: 'Error updating client',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete a client
 */
export const deleteClient = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Error deleting client:', error);
    res.status(500).json({ 
      message: 'Error deleting client',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get related counts for a client
 */
export const getRelatedCounts = async (req: Request, res: Response): Promise<void> => {
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
    logger.error('Error fetching client related counts:', error);
    res.status(500).json({ 
      message: 'Error fetching client related counts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Helper function to get counts of assets, templates, and campaigns for a client
 */
const getClientRelatedCounts = async (clientId: string): Promise<{
  assets: number;
  templates: number;
  campaigns: number;
}> => {
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
};
