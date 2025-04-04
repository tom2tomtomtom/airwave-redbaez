/**
 * Unified Asset Service Implementation
 * Consolidates functionality from multiple asset services into a single service
 */
import { AbstractAssetService } from './AbstractAssetService';
import { Asset, AssetCreateParams, AssetUpdateParams, AssetListParams, AssetListResult } from '../types/serviceInterfaces';
import { supabase } from '../db/supabaseClient';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';

export class UnifiedAssetService extends AbstractAssetService {
  constructor() {
    super('UnifiedAsset');
  }
  
  /**
   * Initialize the service
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    // Ensure database tables exist
    await this.ensureTablesExist();
    
    logger.info('UnifiedAssetService initialized successfully');
  }
  
  /**
   * Ensure required database tables exist
   */
  private async ensureTablesExist(): Promise<void> {
    try {
      // Check if assets table exists
      const { data, error } = await supabase
        .from('assets')
        .select('id')
        .limit(1);
        
      if (error) {
        logger.error('Error checking assets table:', error);
        // In a real implementation, we would create the table if it doesn't exist
      } else {
        logger.debug('Assets table exists');
      }
    } catch (error) {
      logger.error('Error ensuring tables exist:', error);
    }
  }
  
  /**
   * Perform asset creation
   * @param data Asset creation parameters
   * @returns The created asset
   */
  protected async performAssetCreation(data: AssetCreateParams): Promise<Asset> {
    // Create asset record in database
    const { data: createdAsset, error } = await supabase
      .from('assets')
      .insert({
        name: data.name,
        type: data.type,
        metadata: data.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        `Failed to create asset in database: ${error.message}`,
        { details: error }
      );
    }
    
    if (!createdAsset) {
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Asset creation returned no data'
      );
    }
    
    // Map database record to Asset interface
    return this.mapDatabaseAsset(createdAsset);
  }
  
  /**
   * Perform asset retrieval
   * @param id Asset ID
   * @returns The asset or null if not found
   */
  protected async performAssetRetrieval(id: string): Promise<Asset | null> {
    // Retrieve asset record from database
    const { data: asset, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      // If the error is a not found error, return null
      if (error.code === 'PGRST116') {
        return null;
      }
      
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        `Failed to retrieve asset from database: ${error.message}`,
        { details: error, assetId: id }
      );
    }
    
    if (!asset) {
      return null;
    }
    
    // Map database record to Asset interface
    return this.mapDatabaseAsset(asset);
  }
  
  /**
   * Perform asset update
   * @param id Asset ID
   * @param data Asset update parameters
   * @returns The updated asset
   */
  protected async performAssetUpdate(id: string, data: Partial<AssetUpdateParams>): Promise<Asset> {
    // Update asset record in database
    const { data: updatedAsset, error } = await supabase
      .from('assets')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        `Failed to update asset in database: ${error.message}`,
        { details: error, assetId: id }
      );
    }
    
    if (!updatedAsset) {
      throw new ApiError(
        ErrorCode.RESOURCE_NOT_FOUND,
        `Asset not found: ${id}`,
        { assetId: id }
      );
    }
    
    // Map database record to Asset interface
    return this.mapDatabaseAsset(updatedAsset);
  }
  
  /**
   * Perform asset deletion
   * @param id Asset ID
   * @returns True if the asset was deleted, false otherwise
   */
  protected async performAssetDeletion(id: string): Promise<boolean> {
    // Delete asset record from database
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);
      
    if (error) {
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        `Failed to delete asset from database: ${error.message}`,
        { details: error, assetId: id }
      );
    }
    
    return true;
  }
  
  /**
   * Perform asset listing
   * @param params List parameters
   * @returns List result with assets and pagination info
   */
  protected async performAssetListing(params: AssetListParams): Promise<AssetListResult> {
    // Build query
    let query = supabase
      .from('assets')
      .select('*', { count: 'exact' });
      
    // Apply filters
    if (params.type) {
      query = query.eq('type', params.type);
    }
    
    if (params.search) {
      query = query.ilike('name', `%${params.search}%`);
    }
    
    // Apply sorting
    const sortBy = params.sortBy || 'created_at';
    const sortDirection = params.sortDirection || 'desc';
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });
    
    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    // Execute query
    const { data: assets, error, count } = await query;
    
    if (error) {
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        `Failed to list assets from database: ${error.message}`,
        { details: error }
      );
    }
    
    // Map database records to Asset interface
    const mappedAssets = assets ? assets.map(asset => this.mapDatabaseAsset(asset)) : [];
    
    // Calculate pagination info
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      items: mappedAssets,
      total,
      page,
      limit,
      hasMore: page < totalPages
    };
  }
  
  /**
   * Map a database asset record to the Asset interface
   * @param dbAsset Database asset record
   * @returns Asset interface
   */
  private mapDatabaseAsset(dbAsset: any): Asset {
    return {
      id: dbAsset.id,
      name: dbAsset.name,
      type: dbAsset.type,
      url: dbAsset.url,
      metadata: dbAsset.metadata || {},
      createdAt: new Date(dbAsset.created_at),
      updatedAt: new Date(dbAsset.updated_at)
    };
  }
}
