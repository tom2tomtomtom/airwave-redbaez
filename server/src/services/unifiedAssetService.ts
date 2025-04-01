import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Asset, AssetFilters } from '../types/assetTypes';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';
import { ServiceResult } from '../types/serviceTypes';
import { redisClient } from '../utils/redis';
import { logger } from '../utils/logger';

// Define asset types locally if not exported from assetTypes
type AssetType = 'image' | 'video' | 'audio' | 'text';

/**
 * Unified Asset Service
 * This service consolidates all asset-related operations across the platform
 * and provides consistent error handling, caching, and database operations.
 */
export class UnifiedAssetService {
  private static instance: UnifiedAssetService;
  private supabase: SupabaseClient;
  private readonly serviceLogger: any; // Using any for now as the logger type is not exported
  private readonly useCache: boolean;
  
  // Private logger property to use throughout the class
  
  private constructor() {
    // Initialize the logger
    this.serviceLogger = logger;
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY; // Using the key that's available in the .env file
    
    if (!supabaseUrl || !supabaseKey) {
      this.serviceLogger.warn('Supabase credentials not found. Using mock client for development.');
      // Create a mock client for development
      this.supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              data: [],
              error: null
            })
          })
        })
      } as unknown as SupabaseClient;
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    
    this.useCache = process.env.REDIS_ENABLED === 'true';
    
    this.serviceLogger.info(`UnifiedAssetService initialized. Cache enabled: ${this.useCache}`);
  }
  
  /**
   * Get singleton instance of the UnifiedAssetService
   */
  public static getInstance(): UnifiedAssetService {
    if (!UnifiedAssetService.instance) {
      UnifiedAssetService.instance = new UnifiedAssetService();
    }
    return UnifiedAssetService.instance;
  }
  
  /**
   * Get assets with filtering, sorting and pagination
   * @param filters Asset filters
   * @returns Assets and total count
   */
  public async getAssets(filters: AssetFilters): Promise<{assets: Asset[], total: number}> {
    const cacheKey = this.getCacheKey('assets', filters);
    
    try {
      // Try to get from cache first
      if (this.useCache) {
        const cachedResult = await this.getFromCache<{assets: Asset[], total: number}>(cacheKey);
        if (cachedResult) {
          this.serviceLogger.debug('Cache hit for assets query', { filters });
          return cachedResult;
        }
      }
      
      // Default pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      
      // Start building the query
      let query = this.supabase
        .from('assets')
        .select('*, tags(*)', { count: 'exact' });
      
      // Apply filters
      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      // Apply sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortDirection = filters.sortDirection || 'desc';
      query = query.order(sortBy, { ascending: sortDirection === 'asc' });
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute the query
      const { data, error, count } = await query;
      
      if (error) {
        throw new ApiError(
          ErrorCode.DATABASE_ERROR,
          'Failed to retrieve assets',
          { error: error.message, filters }
        );
      }
      
      // Transform the data to match the Asset type
      const assets = data.map(this.mapAssetFromDatabase);
      
      const result = {
        assets,
        total: count || assets.length
      };
      
      // Cache the result
      if (this.useCache) {
        await this.setInCache(cacheKey, result, 300); // Cache for 5 minutes
      }
      
      return result;
    } catch (error) {
      this.serviceLogger.error('Error getting assets', { error, filters });
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to retrieve assets',
        { error: error instanceof Error ? error.message : String(error), filters }
      );
    }
  }
  
  /**
   * Get assets by client slug with optional filtering and pagination
   * @param slug The client slug to get assets for
   * @param options Optional filtering and pagination options
   * @returns Object containing paginated assets and total count
   */
  public async getAssetsByClientSlug(slug: string, options: any = {}): Promise<{assets: Asset[], total: number}> {
    try {
      this.serviceLogger.info(`Getting assets for client slug: ${slug}`);
      
      // Default pagination values
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      
      // Look up the client ID from the slug
      const clientId = await this.lookupClientId(slug);
      if (!clientId) {
        this.serviceLogger.warn(`No client ID found for slug: ${slug}`);
        return { assets: [], total: 0 };
      }
      
      // Prepare filters including the client ID
      const filters: AssetFilters = {
        ...options,
        clientId,
        limit,
        offset
      };
      
      // Get assets with the client ID filter
      return await this.getAssets(filters);
    } catch (error) {
      this.serviceLogger.error('Error getting assets by client slug', { error, slug });
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to retrieve assets for this client',
        { slug, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  /**
   * Get a single asset by ID
   * @param id Asset ID
   * @param clientId Client ID for access control
   * @returns Asset or null if not found
   */
  public async getAssetById(id: string, clientId?: string): Promise<Asset | null> {
    const cacheKey = `asset:${id}:${clientId || 'public'}`;
    
    try {
      // Try to get from cache first
      if (this.useCache) {
        const cachedAsset = await this.getFromCache<Asset>(cacheKey);
        if (cachedAsset) {
          this.serviceLogger.debug('Cache hit for asset by ID', { id });
          return cachedAsset;
        }
      }
      
      // Build query
      let query = this.supabase
        .from('assets')
        .select('*, tags(*)')
        .eq('id', id);
      
      // Apply client ID filter for access control if provided
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      // Execute query
      const { data, error } = await query.single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        
        throw new ApiError(
          ErrorCode.DATABASE_ERROR,
          'Failed to retrieve asset',
          { id, clientId, error: error.message }
        );
      }
      
      const asset = this.mapAssetFromDatabase(data);
      
      // Cache the asset
      if (this.useCache) {
        await this.setInCache(cacheKey, asset, 300); // Cache for 5 minutes
      }
      
      return asset;
    } catch (error) {
      this.serviceLogger.error('Error getting asset by ID', { error, id, clientId });
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        'Failed to retrieve asset',
        { id, clientId, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  /**
   * Look up a client ID from a slug
   * @param slug Client slug
   * @returns Client ID or null if not found
   */
  private async lookupClientId(slug: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return data.id;
    } catch (error) {
      this.serviceLogger.error('Error looking up client ID', { error, slug });
      return null;
    }
  }
  
  /**
   * Map a database asset record to the Asset type
   * @param dbAsset Database asset record
   * @returns Mapped Asset object
   */
  private mapAssetFromDatabase(dbAsset: any): Asset {
    return {
      id: dbAsset.id,
      name: dbAsset.name,
      description: dbAsset.description || '',
      type: dbAsset.type as AssetType,
      url: dbAsset.url,
      thumbnailUrl: dbAsset.thumbnail_url,
      clientId: dbAsset.client_id,
      // Using client_slug or deriving a slug from client_id if missing
      clientSlug: dbAsset.client_slug || `client-${dbAsset.client_id}`,
      // Using owner_id or a default value if missing
      ownerId: dbAsset.owner_id || 'system',
      createdAt: dbAsset.created_at ? new Date(dbAsset.created_at).toISOString() : new Date().toISOString(),
      updatedAt: dbAsset.updated_at ? new Date(dbAsset.updated_at).toISOString() : new Date().toISOString(),
      metadata: dbAsset.metadata || {},
      isFavourite: dbAsset.is_favourite || dbAsset.favourite || false,
      tags: dbAsset.tags?.map((tag: any) => tag.name) || [],
      status: dbAsset.status || 'active'
    };
  }
  
  /**
   * Generate a cache key for a specific query
   * @param prefix Key prefix
   * @param params Query parameters
   * @returns Cache key string
   */
  private getCacheKey(prefix: string, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj: any, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          obj[key] = params[key];
        }
        return obj;
      }, {});
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }
  
  /**
   * Get a value from Redis cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.useCache || !redisClient.isConnected()) {
      return null;
    }
    
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.serviceLogger.warn('Error getting from cache', { error, key });
      return null;
    }
  }
  
  /**
   * Set a value in Redis cache
   * @param key Cache key
   * @param value Value to cache
   * @param expirySeconds Expiry time in seconds
   */
  private async setInCache(key: string, value: any, expirySeconds: number): Promise<void> {
    if (!this.useCache || !redisClient.isConnected()) {
      return;
    }
    
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: expirySeconds });
    } catch (error) {
      this.serviceLogger.warn('Error setting in cache', { error, key });
    }
  }
}

// Export singleton instance
export const unifiedAssetService = UnifiedAssetService.getInstance();
