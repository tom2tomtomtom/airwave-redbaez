/**
 * V2 Client Routes
 * 
 * Handles client operations using slug-based endpoints
 */
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

import { BaseRouter } from '../BaseRouter';
import { ApiError } from '../../middleware/errorHandler';
import { validateRequest, validationSchemas } from '../../middleware/validation';
import { logger } from '../../utils/logger';
import { supabase } from '../../db/supabaseClient';

/**
 * Client validation schemas
 */
const clientValidation = {
  getClientBySlug: Joi.object({
    slug: Joi.string().required()
  }),
  
  createClient: Joi.object({
    name: Joi.string().required(),
    slug: Joi.string().required(),
    logo: Joi.string().optional(),
    primaryColor: Joi.string().optional(),
    secondaryColor: Joi.string().optional(),
    domain: Joi.string().optional()
  }),
  
  updateClient: Joi.object({
    name: Joi.string().optional(),
    logo: Joi.string().optional(),
    primaryColor: Joi.string().optional(),
    secondaryColor: Joi.string().optional(),
    domain: Joi.string().optional()
  })
};

/**
 * V2 Client Router implementation
 */
export class V2ClientRouter extends BaseRouter {
  constructor() {
    super('/clients');
  }
  
  /**
   * Initialize all V2 client routes
   */
  protected initializeRoutes(): void {
    // GET - Get all clients
    this.router.get(
      '/',
      this.protectedRoute(this.getAllClients.bind(this))
    );
    
    // GET - Get client by slug
    this.router.get(
      '/:slug',
      validateRequest(clientValidation.getClientBySlug, 'params'),
      this.protectedRoute(this.getClientBySlug.bind(this))
    );
    
    // POST - Create a new client
    this.router.post(
      '/',
      validateRequest(clientValidation.createClient),
      this.protectedRoute(this.createClient.bind(this))
    );
    
    // PUT - Update a client by slug
    this.router.put(
      '/:slug',
      validateRequest(clientValidation.updateClient),
      this.protectedRoute(this.updateClientBySlug.bind(this))
    );
    
    // DELETE - Delete a client by slug
    this.router.delete(
      '/:slug',
      this.protectedRoute(this.deleteClientBySlug.bind(this))
    );
  }
  
  /**
   * Get all clients
   */
  private async getAllClients(req: Request, res: Response): Promise<void> {
    logger.debug('Getting all clients');
    
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      logger.error('Error fetching clients', { error });
      throw new ApiError(500, 'Failed to retrieve clients');
    }
    
    res.success(clients, 'Clients retrieved successfully');
  }
  
  /**
   * Get client by slug
   */
  private async getClientBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    
    logger.debug('Getting client by slug', { slug });
    
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) {
      logger.error('Error fetching client', { slug, error });
      throw new ApiError(404, 'Client not found');
    }
    
    res.success(client, 'Client retrieved successfully');
  }
  
  /**
   * Create a new client
   */
  private async createClient(req: Request, res: Response): Promise<void> {
    const { name, slug, logo, primaryColor, secondaryColor, domain } = req.body;
    
    // Check if client with slug already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (existingClient) {
      throw new ApiError(409, `Client with slug "${slug}" already exists`);
    }
    
    logger.debug('Creating new client', { name, slug });
    
    const { data: client, error } = await supabase
      .from('clients')
      .insert([
        {
          name,
          slug,
          logo,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          domain
        }
      ])
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating client', { error });
      throw new ApiError(500, 'Failed to create client');
    }
    
    res.success(client, 'Client created successfully', 201);
  }
  
  /**
   * Update a client by slug
   */
  private async updateClientBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    const { name, logo, primaryColor, secondaryColor, domain } = req.body;
    
    logger.debug('Updating client', { slug, updates: req.body });
    
    // First get the client to check if it exists
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (fetchError || !existingClient) {
      throw new ApiError(404, 'Client not found');
    }
    
    // Update the client
    const { data: client, error } = await supabase
      .from('clients')
      .update({
        name,
        logo,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        domain
      })
      .eq('id', existingClient.id)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating client', { slug, error });
      throw new ApiError(500, 'Failed to update client');
    }
    
    res.success(client, 'Client updated successfully');
  }
  
  /**
   * Delete a client by slug
   */
  private async deleteClientBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    
    logger.debug('Deleting client', { slug });
    
    // First get the client to check if it exists
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (fetchError || !existingClient) {
      throw new ApiError(404, 'Client not found');
    }
    
    // Delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', existingClient.id);
    
    if (error) {
      logger.error('Error deleting client', { slug, error });
      throw new ApiError(500, 'Failed to delete client');
    }
    
    res.success(null, 'Client deleted successfully');
  }
}

// Export the router instance
export default new V2ClientRouter().getRouter();
