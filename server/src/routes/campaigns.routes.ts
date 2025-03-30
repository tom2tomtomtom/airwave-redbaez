/**
 * Campaign Routes
 * 
 * Handles all campaign-related API endpoints
 * Includes routes for campaign CRUD operations, search, and filtering
 */
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

import { BaseRouter } from './BaseRouter';
import { ApiError } from '../middleware/errorHandler';
import { validateRequest, validationSchemas } from '../middleware/validation';
import { logger } from '../utils/logger';
import { supabase } from '../db/supabaseClient';

/**
 * Campaign validation schemas
 */
const campaignValidation = {
  getCampaignById: Joi.object({
    id: validationSchemas.id
  }),
  
  createCampaign: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    clientId: validationSchemas.clientId.required(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    status: Joi.string().valid('draft', 'active', 'completed', 'archived').default('draft'),
    tags: Joi.array().items(Joi.string()).optional(),
    budget: Joi.number().optional(),
    campaignType: Joi.string().optional(),
    platforms: Joi.array().items(Joi.string()).optional()
  }),
  
  updateCampaign: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().allow('').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    status: Joi.string().valid('draft', 'active', 'completed', 'archived').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    budget: Joi.number().optional(),
    campaignType: Joi.string().optional(),
    platforms: Joi.array().items(Joi.string()).optional()
  }),
  
  getCampaigns: Joi.object({
    clientId: validationSchemas.clientId.optional(),
    status: Joi.string().valid('draft', 'active', 'completed', 'archived').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional(),
    sortBy: Joi.string().valid('name', 'createdAt', 'startDate', 'endDate', 'status').default('createdAt'),
    sortDirection: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Campaign routes implementation
 */
export class CampaignRouter extends BaseRouter {
  constructor() {
    super('/campaigns');
  }
  
  /**
   * Initialize all campaign routes
   */
  protected initializeRoutes(): void {
    // GET - Get all campaigns with filtering
    this.router.get(
      '/',
      validateRequest(campaignValidation.getCampaigns, 'query'),
      this.protectedRoute(this.getCampaigns.bind(this))
    );
    
    // GET - Get campaign by ID
    this.router.get(
      '/:id',
      validateRequest(campaignValidation.getCampaignById, 'params'),
      this.protectedRoute(this.getCampaignById.bind(this))
    );
    
    // POST - Create a new campaign
    this.router.post(
      '/',
      validateRequest(campaignValidation.createCampaign),
      this.protectedRoute(this.createCampaign.bind(this))
    );
    
    // PUT - Update a campaign
    this.router.put(
      '/:id',
      validateRequest(campaignValidation.updateCampaign),
      this.protectedRoute(this.updateCampaign.bind(this))
    );
    
    // DELETE - Delete a campaign
    this.router.delete(
      '/:id',
      this.protectedRoute(this.deleteCampaign.bind(this))
    );
    
    // POST - Add assets to campaign
    this.router.post(
      '/:id/assets',
      this.protectedRoute(this.addAssetsToCampaign.bind(this))
    );
    
    // GET - Get campaign assets
    this.router.get(
      '/:id/assets',
      this.protectedRoute(this.getCampaignAssets.bind(this))
    );
  }
  
  /**
   * Get campaigns with filtering
   */
  private async getCampaigns(req: Request, res: Response): Promise<void> {
    const {
      clientId,
      status,
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortDirection = 'desc'
    } = req.query;
    
    logger.debug('Getting campaigns with filters', {
      clientId,
      status,
      page,
      limit,
      search,
      sortBy,
      sortDirection
    });
    
    // Build query
    let query = supabase
      .from('campaigns')
      .select('*', { count: 'exact' });
    
    // Add filters
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // Execute the query to get data and count
    const { data: campaigns, error, count } = await query
      .order(sortBy as string, { ascending: sortDirection === 'asc' })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
    
    if (error) {
      logger.error('Error fetching campaigns', { error });
      throw ApiError.internal('Failed to fetch campaigns', { error });
    }
    
    // Transform to camelCase for response
    const transformedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      clientId: campaign.client_id,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      status: campaign.status,
      tags: campaign.tags,
      budget: campaign.budget,
      campaignType: campaign.campaign_type,
      platforms: campaign.platforms,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      createdBy: campaign.created_by
    }));
    
    // Return with pagination metadata
    res.success({
      campaigns: transformedCampaigns,
      pagination: {
        total: count ?? 0,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil((count ?? 0) / Number(limit))
      }
    }, 'Campaigns retrieved successfully');
  }
  
  /**
   * Get campaign by ID
   */
  private async getCampaignById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    logger.debug('Getting campaign by ID', { id });
    
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      logger.error('Error fetching campaign', { id, error });
      throw ApiError.notFound('Campaign not found', { id });
    }
    
    // Transform to camelCase for response
    const transformedCampaign = {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      clientId: campaign.client_id,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      status: campaign.status,
      tags: campaign.tags,
      budget: campaign.budget,
      campaignType: campaign.campaign_type,
      platforms: campaign.platforms,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      createdBy: campaign.created_by
    };
    
    res.success(transformedCampaign, 'Campaign retrieved successfully');
  }
  
  /**
   * Create a new campaign
   */
  private async createCampaign(req: Request, res: Response): Promise<void> {
    const {
      name,
      description,
      clientId,
      startDate,
      endDate,
      status = 'draft',
      tags,
      budget,
      campaignType,
      platforms
    } = req.body;
    
    const userId = req.user?.id;
    
    if (!userId) {
      throw ApiError.unauthorized('User ID is required');
    }
    
    logger.debug('Creating new campaign', { name, clientId });
    
    // Convert to snake_case for database insert
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert([
        {
          id: uuidv4(),
          name,
          description,
          client_id: clientId,
          start_date: startDate,
          end_date: endDate,
          status,
          tags,
          budget,
          campaign_type: campaignType,
          platforms,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating campaign', { error });
      throw ApiError.internal('Failed to create campaign', { error });
    }
    
    // Transform to camelCase for response
    const transformedCampaign = {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      clientId: campaign.client_id,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      status: campaign.status,
      tags: campaign.tags,
      budget: campaign.budget,
      campaignType: campaign.campaign_type,
      platforms: campaign.platforms,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      createdBy: campaign.created_by
    };
    
    res.success(transformedCampaign, 'Campaign created successfully', 201);
  }
  
  /**
   * Update a campaign
   */
  private async updateCampaign(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const {
      name,
      description,
      startDate,
      endDate,
      status,
      tags,
      budget,
      campaignType,
      platforms
    } = req.body;
    
    logger.debug('Updating campaign', { id, updates: req.body });
    
    // Convert to snake_case for database update
    const updateData: Record<string, any> = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;
    if (budget !== undefined) updateData.budget = budget;
    if (campaignType !== undefined) updateData.campaign_type = campaignType;
    if (platforms !== undefined) updateData.platforms = platforms;
    
    updateData.updated_at = new Date().toISOString();
    
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating campaign', { id, error });
      throw ApiError.internal('Failed to update campaign', { id, error });
    }
    
    if (!campaign) {
      throw ApiError.notFound('Campaign not found', { id });
    }
    
    // Transform to camelCase for response
    const transformedCampaign = {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      clientId: campaign.client_id,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      status: campaign.status,
      tags: campaign.tags,
      budget: campaign.budget,
      campaignType: campaign.campaign_type,
      platforms: campaign.platforms,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      createdBy: campaign.created_by
    };
    
    res.success(transformedCampaign, 'Campaign updated successfully');
  }
  
  /**
   * Delete a campaign
   */
  private async deleteCampaign(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    logger.debug('Deleting campaign', { id });
    
    // Check if campaign exists
    const { data: existingCampaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .single();
    
    if (!existingCampaign) {
      throw ApiError.notFound('Campaign not found', { id });
    }
    
    // Delete the campaign
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) {
      logger.error('Error deleting campaign', { id, error });
      throw ApiError.internal('Failed to delete campaign', { id, error });
    }
    
    res.success(null, 'Campaign deleted successfully');
  }
  
  /**
   * Add assets to campaign
   */
  private async addAssetsToCampaign(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { assetIds } = req.body;
    
    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      throw ApiError.validation('Asset IDs are required');
    }
    
    logger.debug('Adding assets to campaign', { campaignId: id, assetIds });
    
    // Check if campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .single();
    
    if (campaignError || !campaign) {
      throw ApiError.notFound('Campaign not found', { id });
    }
    
    // Create campaign_assets entries
    const campaignAssets = assetIds.map(assetId => ({
      id: uuidv4(),
      campaign_id: id,
      asset_id: assetId,
      added_at: new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('campaign_assets')
      .insert(campaignAssets);
    
    if (error) {
      logger.error('Error adding assets to campaign', { campaignId: id, error });
      throw ApiError.internal('Failed to add assets to campaign', { campaignId: id, error });
    }
    
    res.success(null, 'Assets added to campaign successfully');
  }
  
  /**
   * Get campaign assets
   */
  private async getCampaignAssets(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    logger.debug('Getting campaign assets', { campaignId: id });
    
    // First check if campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .single();
    
    if (campaignError || !campaign) {
      throw ApiError.notFound('Campaign not found', { id });
    }
    
    // Get campaign assets with join
    const { data: assets, error } = await supabase
      .from('campaign_assets')
      .select(`
        id,
        added_at,
        assets:asset_id (*)
      `)
      .eq('campaign_id', id);
    
    if (error) {
      logger.error('Error fetching campaign assets', { campaignId: id, error });
      throw ApiError.internal('Failed to fetch campaign assets', { campaignId: id, error });
    }
    
    // Transform response
    const transformedAssets = assets.map(item => {
      // The Supabase join returns assets as a single object, not an array
      const asset = item.assets as any;
      return {
        id: asset.id,
        name: asset.name,
        description: asset.description,
        type: asset.type,
        url: asset.url,
        thumbnailUrl: asset.thumbnail_url,
        metadata: asset.metadata,
        tags: asset.tags,
        clientId: asset.client_id,
        addedAt: item.added_at,
        campaignAssetId: item.id
      };
    });
    
    res.success(transformedAssets, 'Campaign assets retrieved successfully');
  }
}

// Export the router instance
export default new CampaignRouter().getRouter();
