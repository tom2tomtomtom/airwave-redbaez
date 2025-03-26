import httpClient from '../../http-client';
import {
  Asset,
  AssetFilters,
  AssetResponse,
  AssetsListResponse,
  CreateAssetRequest,
  UpdateAssetRequest
} from '../../types/asset.types';

// Known working client ID from the database for fallback
const KNOWN_WORKING_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

/**
 * Asset Service - encapsulates all asset-related API calls
 */
class AssetService {
  private static instance: AssetService;
  private baseUrl = '/assets';

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AssetService {
    if (!AssetService.instance) {
      AssetService.instance = new AssetService();
    }
    return AssetService.instance;
  }

  /**
   * Ensure a valid client ID is used for operations
   */
  private ensureClientId(clientId?: string): string {
    // Use provided ID, localStorage, or fallback to known working ID
    return clientId || 
           localStorage.getItem('selectedClientId') || 
           localStorage.getItem('workingClientId') || 
           KNOWN_WORKING_CLIENT_ID;
  }

  /**
   * Get assets with filtering, sorting and pagination
   */
  public async getAssets(filters: AssetFilters = {}): Promise<Asset[]> {
    try {
      // Always ensure we have a client ID
      const clientId = this.ensureClientId(filters.clientId);
      
      // Store client ID in localStorage for components that rely on it
      localStorage.setItem('selectedClientId', clientId);
      localStorage.setItem('workingClientId', clientId);
      
      // Create params object with client ID
      const params: Record<string, any> = {
        ...filters,
        clientId,
      };
      
      // Log request for debugging
      console.log('🔍 AssetService: Fetching assets with params:', params);
      
      // Make API request
      const response = await httpClient.get<Asset[] | AssetsListResponse>(this.baseUrl, params);
      
      // Handle various response formats
      let assets: Asset[] = [];
      
      if (Array.isArray(response)) {
        assets = response;
      } else if ('assets' in response && Array.isArray(response.assets)) {
        assets = response.assets;
      }
      
      console.log(`✅ AssetService: Retrieved ${assets.length} assets`);
      return assets;
    } catch (error) {
      console.error('❌ AssetService: Error getting assets:', error);
      throw error;
    }
  }

  /**
   * Get a single asset by ID
   */
  public async getAsset(id: string, clientId?: string): Promise<Asset> {
    try {
      const effectiveClientId = this.ensureClientId(clientId);
      
      const asset = await httpClient.get<Asset>(`${this.baseUrl}/${id}`, {
        clientId: effectiveClientId
      });
      
      return asset;
    } catch (error) {
      console.error(`❌ AssetService: Error getting asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new asset
   */
  public async createAsset(request: CreateAssetRequest): Promise<Asset> {
    try {
      // Ensure client ID is set
      const clientId = this.ensureClientId(request.clientId);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', request.file);
      formData.append('name', request.name);
      formData.append('type', request.type);
      formData.append('clientId', clientId);
      
      if (request.description) {
        formData.append('description', request.description);
      }
      
      if (request.metadata) {
        formData.append('metadata', JSON.stringify(request.metadata));
      }
      
      // Make API request
      const response = await httpClient.post<Asset | AssetResponse>(
        this.baseUrl,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // Handle response format
      if ('asset' in response && response.asset) {
        return response.asset;
      }
      
      return response as Asset;
    } catch (error) {
      console.error('❌ AssetService: Error creating asset:', error);
      throw error;
    }
  }

  /**
   * Update an existing asset
   */
  public async updateAsset(id: string, request: UpdateAssetRequest, clientId?: string): Promise<Asset> {
    try {
      const effectiveClientId = this.ensureClientId(clientId);
      
      const response = await httpClient.put<Asset | AssetResponse>(
        `${this.baseUrl}/${id}`,
        {
          ...request,
          clientId: effectiveClientId
        }
      );
      
      // Handle response format
      if ('asset' in response && response.asset) {
        return response.asset;
      }
      
      return response as Asset;
    } catch (error) {
      console.error(`❌ AssetService: Error updating asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an asset
   */
  public async deleteAsset(id: string, clientId?: string): Promise<boolean> {
    try {
      const effectiveClientId = this.ensureClientId(clientId);
      
      const response = await httpClient.delete<AssetResponse>(`${this.baseUrl}/${id}`, {
        clientId: effectiveClientId
      });
      
      return response.success || false;
    } catch (error) {
      console.error(`❌ AssetService: Error deleting asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Toggle favourite status of an asset
   */
  public async toggleFavourite(id: string, isFavourite: boolean, clientId?: string): Promise<Asset> {
    try {
      const effectiveClientId = this.ensureClientId(clientId);
      
      const response = await httpClient.put<Asset | AssetResponse>(
        `${this.baseUrl}/${id}/favourite`,
        {
          favourite: isFavourite,
          clientId: effectiveClientId
        }
      );
      
      // Handle response format
      if ('asset' in response && response.asset) {
        return response.asset;
      }
      
      return response as Asset;
    } catch (error) {
      console.error(`❌ AssetService: Error toggling favourite for asset ${id}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const assetService = AssetService.getInstance();

// Export default for convenience
export default assetService;
