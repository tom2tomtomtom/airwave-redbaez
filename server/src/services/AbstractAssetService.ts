/**
 * Abstract Asset Service Class
 * Provides common functionality for asset-related services
 */
import { AssetService, Asset, AssetCreateParams, AssetUpdateParams, AssetListParams, AssetListResult } from '../types/serviceInterfaces';
import { AbstractBaseService } from './AbstractBaseService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';

export abstract class AbstractAssetService extends AbstractBaseService implements AssetService {
  constructor(serviceName: string) {
    super(serviceName);
  }
  
  /**
   * Create a new asset
   * @param data Asset creation parameters
   * @returns The created asset
   */
  public async createAsset(data: AssetCreateParams): Promise<Asset> {
    this.validateInitialized();
    logger.info(`Creating ${data.type} asset: ${data.name}`);
    
    try {
      // Validate input
      this.validateAssetData(data);
      
      // Implement actual asset creation in derived classes
      const asset = await this.performAssetCreation(data);
      
      logger.info(`Asset created successfully: ${asset.id}`);
      return asset;
    } catch (error) {
      logger.error(`Error creating asset:`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to create asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { assetName: data.name, assetType: data.type }
      );
    }
  }
  
  /**
   * Get an asset by ID
   * @param id Asset ID
   * @returns The asset or null if not found
   */
  public async getAsset(id: string): Promise<Asset | null> {
    this.validateInitialized();
    logger.info(`Retrieving asset: ${id}`);
    
    try {
      // Implement actual asset retrieval in derived classes
      const asset = await this.performAssetRetrieval(id);
      
      if (asset) {
        logger.debug(`Asset retrieved: ${id}`);
      } else {
        logger.debug(`Asset not found: ${id}`);
      }
      
      return asset;
    } catch (error) {
      logger.error(`Error retrieving asset ${id}:`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to retrieve asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { assetId: id }
      );
    }
  }
  
  /**
   * Update an asset
   * @param id Asset ID
   * @param data Asset update parameters
   * @returns The updated asset
   */
  public async updateAsset(id: string, data: Partial<AssetUpdateParams>): Promise<Asset> {
    this.validateInitialized();
    logger.info(`Updating asset: ${id}`);
    
    try {
      // Check if asset exists
      const existingAsset = await this.getAsset(id);
      
      if (!existingAsset) {
        throw new ApiError(
          ErrorCode.RESOURCE_NOT_FOUND,
          `Asset not found: ${id}`,
          { assetId: id }
        );
      }
      
      // Implement actual asset update in derived classes
      const updatedAsset = await this.performAssetUpdate(id, data);
      
      logger.info(`Asset updated successfully: ${id}`);
      return updatedAsset;
    } catch (error) {
      logger.error(`Error updating asset ${id}:`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to update asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { assetId: id }
      );
    }
  }
  
  /**
   * Delete an asset
   * @param id Asset ID
   * @returns True if the asset was deleted, false otherwise
   */
  public async deleteAsset(id: string): Promise<boolean> {
    this.validateInitialized();
    logger.info(`Deleting asset: ${id}`);
    
    try {
      // Check if asset exists
      const existingAsset = await this.getAsset(id);
      
      if (!existingAsset) {
        throw new ApiError(
          ErrorCode.RESOURCE_NOT_FOUND,
          `Asset not found: ${id}`,
          { assetId: id }
        );
      }
      
      // Implement actual asset deletion in derived classes
      const result = await this.performAssetDeletion(id);
      
      if (result) {
        logger.info(`Asset deleted successfully: ${id}`);
      } else {
        logger.warn(`Failed to delete asset: ${id}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error deleting asset ${id}:`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to delete asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { assetId: id }
      );
    }
  }
  
  /**
   * List assets with filtering and pagination
   * @param params List parameters
   * @returns List result with assets and pagination info
   */
  public async listAssets(params: AssetListParams): Promise<AssetListResult> {
    this.validateInitialized();
    logger.info(`Listing assets with params:`, params);
    
    try {
      // Implement actual asset listing in derived classes
      const result = await this.performAssetListing(params);
      
      logger.debug(`Listed ${result.items.length} assets (total: ${result.total})`);
      return result;
    } catch (error) {
      logger.error(`Error listing assets:`, error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `Failed to list assets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  /**
   * Validate asset data
   * @param data Asset data to validate
   * @throws ApiError if validation fails
   */
  protected validateAssetData(data: AssetCreateParams): void {
    if (!data.name || data.name.trim() === '') {
      throw new ApiError(
        ErrorCode.VALIDATION_FAILED,
        'Asset name is required',
        { field: 'name' }
      );
    }
    
    if (!data.type) {
      throw new ApiError(
        ErrorCode.VALIDATION_FAILED,
        'Asset type is required',
        { field: 'type' }
      );
    }
  }
  
  /**
   * Perform asset creation
   * Should be implemented by derived classes
   */
  protected abstract performAssetCreation(data: AssetCreateParams): Promise<Asset>;
  
  /**
   * Perform asset retrieval
   * Should be implemented by derived classes
   */
  protected abstract performAssetRetrieval(id: string): Promise<Asset | null>;
  
  /**
   * Perform asset update
   * Should be implemented by derived classes
   */
  protected abstract performAssetUpdate(id: string, data: Partial<AssetUpdateParams>): Promise<Asset>;
  
  /**
   * Perform asset deletion
   * Should be implemented by derived classes
   */
  protected abstract performAssetDeletion(id: string): Promise<boolean>;
  
  /**
   * Perform asset listing
   * Should be implemented by derived classes
   */
  protected abstract performAssetListing(params: AssetListParams): Promise<AssetListResult>;
}
