import { apiCall } from '../common/httpClient';
import { Asset, AssetFilters, AssetOperationResult, AssetType } from './assetTypes';

// Known working client ID from SQL database - fallback for critical operations
const KNOWN_WORKING_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

/**
 * Asset Service - Centralised access point for all asset-related API operations
 */
class AssetService {
  /**
   * Get assets based on provided filters
   */
  async getAssets(filters?: AssetFilters): Promise<Asset[]> {
    // Ensure we have a client ID by falling back to the known working one
    const clientId = filters?.clientId || filters?.client_id || KNOWN_WORKING_CLIENT_ID;
    
    // Force clientId into localStorage for components that rely on it
    if (clientId) {
      localStorage.setItem('selectedClientId', clientId);
      localStorage.setItem('workingClientId', clientId);
    }
    
    // Create clean parameters object with both client_id formats for compatibility
    const params: Record<string, any> = {
      clientId,
      client_id: clientId,
      _timestamp: Date.now() // Prevent caching
    };
    
    // Add optional filters
    if (filters) {
      if (filters.type && filters.type !== 'all') {
        params.type = filters.type;
      }
      
      if (filters.search) {
        params.search = filters.search;
      }
      
      if (filters.favourite !== undefined) {
        params.favourite = filters.favourite;
      }
      
      if (filters.sortBy) {
        params.sortBy = filters.sortBy;
      }
      
      if (filters.sortDirection) {
        params.sortDirection = filters.sortDirection;
      }
      
      if (filters.limit) {
        params.limit = filters.limit;
      }
      
      if (filters.offset) {
        params.offset = filters.offset;
      }
    }
    
    try {
      console.log('🔍 Getting assets with params:', params);
      
      // Request with consistent error handling
      const response = await apiCall<any>({
        method: 'get',
        url: '/assets',
        params
      });
      
      // Handle various response formats from the API
      let assets: Asset[] = [];
      
      if (response) {
        if (Array.isArray(response)) {
          assets = response;
        } else if (response.assets && Array.isArray(response.assets)) {
          assets = response.assets;
        } else if (response.data && Array.isArray(response.data)) {
          assets = response.data;
        } else if (response.data?.assets && Array.isArray(response.data.assets)) {
          assets = response.data.assets;
        } else if (typeof response === 'object') {
          // Extract assets if we have an object with numbered keys containing assets
          const possibleAssets = Object.values(response);
          if (possibleAssets.length > 0 && possibleAssets.every(item => 
            typeof item === 'object' && item !== null && 'id' in item)) {
            assets = possibleAssets as Asset[];
          }
        }
      }
      
      console.log(`✅ Retrieved ${assets.length} assets successfully`);
      return assets;
    } catch (error) {
      console.error('❌ Error getting assets:', error);
      throw error;
    }
  }
  
  /**
   * Get a single asset by ID
   */
  async getAssetById(id: string, clientId?: string): Promise<Asset> {
    const effectiveClientId = clientId || KNOWN_WORKING_CLIENT_ID;
    
    try {
      const asset = await apiCall<Asset>({
        method: 'get',
        url: `/assets/${id}`,
        params: {
          clientId: effectiveClientId,
          _timestamp: Date.now()
        }
      });
      
      return asset;
    } catch (error) {
      console.error(`❌ Error getting asset ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Toggle the favourite status of an asset
   */
  async toggleFavourite(id: string, isFavourite: boolean, clientId?: string): Promise<AssetOperationResult> {
    const effectiveClientId = clientId || KNOWN_WORKING_CLIENT_ID;
    
    try {
      const result = await apiCall<AssetOperationResult>({
        method: 'put',
        url: `/assets/${id}/favourite`,
        data: {
          favourite: isFavourite,
          clientId: effectiveClientId
        }
      });
      
      return result;
    } catch (error) {
      console.error(`❌ Error toggling favourite for asset ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Upload a new asset
   */
  async uploadAsset(data: FormData): Promise<Asset> {
    try {
      // Ensure the formData has a client ID
      if (!data.has('clientId') && !data.has('client_id')) {
        data.append('clientId', KNOWN_WORKING_CLIENT_ID);
      }
      
      const asset = await apiCall<Asset>({
        method: 'post',
        url: '/assets',
        data,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return asset;
    } catch (error) {
      console.error('❌ Error uploading asset:', error);
      throw error;
    }
  }
  
  /**
   * Delete an asset
   */
  async deleteAsset(id: string, clientId?: string): Promise<AssetOperationResult> {
    const effectiveClientId = clientId || KNOWN_WORKING_CLIENT_ID;
    
    try {
      const result = await apiCall<AssetOperationResult>({
        method: 'delete',
        url: `/assets/${id}`,
        params: {
          clientId: effectiveClientId
        }
      });
      
      return result;
    } catch (error) {
      console.error(`❌ Error deleting asset ${id}:`, error);
      throw error;
    }
  }
}

// Export as singleton instance
const assetService = new AssetService();
export default assetService;
