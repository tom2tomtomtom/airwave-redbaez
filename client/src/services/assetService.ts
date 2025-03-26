import axios from 'axios';
import { Asset, AssetFilters } from '../types/assets';

// Get the current environment for debugging
const isDevelopment = process.env.NODE_ENV === 'development';
const debugMode = true; // Set to true to enable verbose logging

// Known valid client IDs from the database
const KNOWN_CLIENT_IDS = {
  PRIMARY_CLIENT: 'fe418478-806e-411a-ad0b-1b9a537a8081', // Confirmed from SQL, used by both assets
  USER_ID: 'd53c7f82-42af-4ed0-a83b-2cbf505748db' // The owner/user ID for both assets
};

// Confirmed specific assets IDs from database
const KNOWN_ASSETS = {
  JUNIPER_BRAINFOG: '3feaa091-bd0b-4501-8c67-a5f96c767e1a',
  ADMIN_TEST: '919ab7fc-71fc-4a76-9662-c1349bd7023c'
};

const API_URL = '/api/v2/assets';

export const assetService = {
  // Get all assets with filtering
  async getAssets(filters?: AssetFilters): Promise<Asset[]> {
    try {
      // Ensure we have a clientId - this is required by the server
      const updatedFilters = { ...filters };
      
      if (!updatedFilters.clientId && updatedFilters.clientSlug) {
        console.log('Using clientSlug as clientId:', updatedFilters.clientSlug);
        // If we have a slug but no ID, use the slug as ID temporarily
        updatedFilters.clientId = updatedFilters.clientSlug;
      } else if (!updatedFilters.clientId) {
        // If we still don't have a clientId, try to get it from localStorage or use a default
        const selectedClientId = localStorage.getItem('selectedClientId');
        if (selectedClientId) {
          console.log('Using selectedClientId from localStorage:', selectedClientId);
          updatedFilters.clientId = selectedClientId;
        } else {
          // Use the confirmed client ID from the SQL that we know has assets
          const fallbackClientId = KNOWN_CLIENT_IDS.PRIMARY_CLIENT;
          console.log('Using confirmed clientId from SQL:', fallbackClientId);
          updatedFilters.clientId = fallbackClientId;
        }
      }
      
      // Ensure the client ID is a valid UUID format - some observed client IDs in the database
      // appear to be missing characters
      if (updatedFilters.clientId && updatedFilters.clientId.length < 36) {
        console.warn('Client ID may be truncated or invalid:', updatedFilters.clientId);
      }
      
      console.log('Fetching assets with filters:', updatedFilters);
      const response = await axios.get(API_URL, { params: updatedFilters });
      console.log('Asset service response:', response.data);
      
      // Handle v2 API format { success: true, assets: [], total: number }
      if (response.data.success === true && Array.isArray(response.data.assets)) {
        return response.data.assets;
      }
      
      // Handle legacy format { data: { assets: [] } }
      if (response.data.data && Array.isArray(response.data.data.assets)) {
        return response.data.data.assets;
      }
      
      // Handle legacy format { data: [] }
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // Handle legacy format { assets: [] }
      if (response.data.assets && Array.isArray(response.data.assets)) {
        return response.data.assets;
      }
      
      // Handle direct array format
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      console.warn('Unknown asset response format:', response.data);
      return [];
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  },

  // Upload a new asset
  async uploadAsset(formData: FormData): Promise<Asset> {
    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Handle v2 API format
      if (response.data.success === true && response.data.asset) {
        return response.data.asset;
      }
      
      // Handle legacy format
      if (response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error uploading asset:', error);
      throw error;
    }
  },

  // Delete an asset
  async deleteAsset(assetId: string): Promise<void> {
    try {
      await axios.delete(`${API_URL}/${assetId}`);
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  },

  // Update an asset
  async updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    try {
      const response = await axios.put(`${API_URL}/${id}`, data);
      
      // Handle v2 API format
      if (response.data.success === true && response.data.asset) {
        return response.data.asset;
      }
      
      // Handle legacy format
      if (response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  },

  // Diagnostic function to directly verify asset storage in the database
  async verifyAssetStorage(clientId: string): Promise<any> {
    try {
      console.log('🔍 Running asset storage verification for client:', clientId);
      
      // Create diagnostic results object
      const results: Record<string, any> = {};
      
      // First check the provided clientId
      try {
        const response = await axios.get(`${API_URL}`, {
          params: {
            clientId,
            debug: true,
            _timestamp: new Date().getTime()
          }
        });
        results[clientId] = response.data;
        console.log(`📊 Assets for ${clientId}:`, response.data?.assets?.length || 'No assets array');
      } catch (err) {
        results[clientId] = { error: (err as Error).message };
      }
      
      // Then try the confirmed primary client ID from SQL if different
      const primaryClientId = KNOWN_CLIENT_IDS.PRIMARY_CLIENT;
      if (primaryClientId !== clientId) {
        try {
          const response = await axios.get(`${API_URL}`, {
            params: {
              clientId: primaryClientId,
              debug: true,
              _timestamp: new Date().getTime()
            }
          });
          results[primaryClientId] = response.data;
          console.log(`📊 Assets for ${primaryClientId}:`, response.data?.assets?.length || 'No assets array');
        } catch (err) {
          results[primaryClientId] = { error: (err as Error).message };
        }
      }
      
      // Try direct asset retrieval for known asset IDs
      try {
        const adminTestAssetId = KNOWN_ASSETS.ADMIN_TEST;
        const directAssetResponse = await axios.get(`${API_URL}/${adminTestAssetId}`, {
          params: {
            clientId: primaryClientId,
            debug: true,
            _timestamp: new Date().getTime()
          }
        });
        results['directAsset'] = directAssetResponse.data;
        console.log(`📊 Direct asset retrieval result:`, directAssetResponse.data);
      } catch (err) {
        results['directAsset'] = { error: (err as Error).message };
      }
      
      return { diagnosticResults: results };
    } catch (error) {
      console.error('❌ Asset diagnostic failed:', error);
      throw error;
    }
  },

  // Toggle favourite status (handles both British and American spellings)
  async toggleFavourite(assetId: string, isFavourite: boolean): Promise<Asset> {
    try {
      // Send both spelling variants to ensure compatibility
      const response = await axios.put(`${API_URL}/${assetId}/favourite`, { 
        isFavourite: isFavourite,
        isFavorite: isFavourite 
      });
      
      // Handle v2 API format
      if (response.data.success === true && response.data.asset) {
        return response.data.asset;
      }
      
      // Handle legacy format
      if (response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error toggling favourite:', error);
      throw error;
    }
  }
};

export default assetService;
