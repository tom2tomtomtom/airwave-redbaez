/**
 * Client Routes
 * 
 * Handles all client-related API endpoints
 * Provides client CRUD operations with validation
 */
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

import { BaseRouter } from './BaseRouter';
import { ApiError } from '../middleware/errorHandler';
import { validateRequest, validationSchemas } from '../middleware/validation';
import { logger } from '../utils/logger';
import { supabase } from '../db/supabaseClient';

/**
 * Client validation schemas
 */
const clientValidation = {
  getClientById: Joi.object({
    id: validationSchemas.id
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
    slug: Joi.string().optional(),
    logo: Joi.string().optional(),
    primaryColor: Joi.string().optional(),
    secondaryColor: Joi.string().optional(),
    domain: Joi.string().optional()
  })
};

/**
 * Client routes implementation
 */
export class ClientRouter extends BaseRouter {
  constructor() {
    super('/clients');
  }
  
  /**
   * Initialize all client routes
   */
  protected initializeRoutes(): void {
    // GET - Get all clients
    this.router.get(
      '/',
      this.protectedRoute(this.getAllClients.bind(this))
    );
    
    // GET - Get client by ID
    this.router.get(
      '/:id',
      validateRequest(clientValidation.getClientById, 'params'),
      this.protectedRoute(this.getClientById.bind(this))
    );
    
    // POST - Create a new client
    this.router.post(
      '/',
      validateRequest(clientValidation.createClient),
      this.protectedRoute(this.createClient.bind(this))
    );
    
    // PUT - Update a client
    this.router.put(
      '/:id',
      validateRequest(clientValidation.updateClient),
      this.protectedRoute(this.updateClient.bind(this))
    );
    
    // DELETE - Delete a client
    this.router.delete(
      '/:id',
      this.protectedRoute(this.deleteClient.bind(this))
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
      throw ApiError.internal('Failed to retrieve clients', { error });
    }
    
    res.success(clients, 'Clients retrieved successfully');
  }
  
  /**
   * Get client by ID
   */
  private async getClientById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    logger.debug('Getting client by ID', { id });
    
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      logger.error('Error fetching client', { id, error });
      throw ApiError.notFound('Client not found', { id });
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
      throw ApiError.conflict(`Client with slug "${slug}" already exists`, { slug });
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
      throw ApiError.internal('Failed to create client', { error });
    }
    
    res.success(client, 'Client created successfully', 201);
  }
  
  /**
   * Update a client
   */
  private async updateClient(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, slug, logo, primaryColor, secondaryColor, domain } = req.body;
    
    logger.debug('Updating client', { id, updates: req.body });
    
    // Check if slug is being changed and if the new slug already exists
    if (slug) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single();
      
      if (existingClient) {
        throw ApiError.conflict(`Client with slug "${slug}" already exists`, { slug });
      }
    }
    
    // Update the client
    const { data: client, error } = await supabase
      .from('clients')
      .update({
        name,
        slug,
        logo,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        domain
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating client', { id, error });
      throw ApiError.internal('Failed to update client', { id, error });
    }
    
    if (!client) {
      throw ApiError.notFound('Client not found', { id });
    }
    
    res.success(client, 'Client updated successfully');
  }
  
  /**
   * Delete a client
   */
  private async deleteClient(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    logger.debug('Deleting client', { id });
    
    // Check if client exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .single();
    
    if (!existingClient) {
      throw ApiError.notFound('Client not found', { id });
    }
    
    // Delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) {
      logger.error('Error deleting client', { id, error });
      throw ApiError.internal('Failed to delete client', { id, error });
    }
    
    res.success(null, 'Client deleted successfully');
  }
}

// Export the router instance
export default new ClientRouter().getRouter();
