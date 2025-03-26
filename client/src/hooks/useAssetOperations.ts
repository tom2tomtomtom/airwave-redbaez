import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Asset, AssetFilters } from '../types/assets';
import { apiClient } from '../utils/api';
import { RootState } from '../store';
import assetService from '../services/assetService';

/**
 * Custom hook for asset management operations
 */
export const useAssetOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get token from Redux store
  const authToken = useSelector((state: RootState) => state.auth.token);

  /**
   * Toggle favourite status of an asset
   */
  const toggleFavourite = async (assetId: string, currentStatus: boolean): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      // Try with the new asset service first
      try {
        await assetService.toggleFavourite(assetId, !currentStatus);
      } catch (serviceErr) {
        console.warn('Asset service failed for toggle favourite, falling back to apiClient:', serviceErr);
        // Fall back to the original method
        await apiClient.assets.updateFavourite(assetId, !currentStatus);
      }
      
      return !currentStatus;
    } catch (err: any) {
      console.error('Error toggling favourite status:', err);
      setError(err.response?.data?.message || 'Failed to update favourite status');
      return currentStatus;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete an asset
   */
  const deleteAsset = async (assetId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await apiClient.assets.delete(assetId);
      return true;
    } catch (err: any) {
      console.error('Error deleting asset:', err);
      setError(err.response?.data?.message || 'Failed to delete asset');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch assets with optional filters
   */
  const fetchAssets = async (filters?: AssetFilters): Promise<Asset[]> => {
    try {
      setLoading(true);
      setError(null);
      
      // Verify we have a token before making the request
      const token = authToken || localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found when fetching assets');
        setError('You need to be logged in to view assets');
        return [];
      }
      
      // Get the current user from either local storage or URL parameters
      const currentUserId = localStorage.getItem('airwave_user_id') || 
                          (window.location.search ? new URLSearchParams(window.location.search).get('userId') : null);
      
      // Create a new filters object that includes the userId
      const filtersWithUser = {
        ...filters,
        userId: currentUserId
      };
      
      console.log('fetchAssets: Sending request with filters', JSON.stringify(filtersWithUser));
      console.log('fetchAssets: Using token from:', authToken ? 'Redux store' : 'localStorage');
      console.log('fetchAssets: Including userId:', currentUserId);
      console.log('fetchAssets: Token length:', token.length);
      
      const response = await apiClient.assets.getAll(filtersWithUser);
      
      console.log('fetchAssets: Raw API response structure:', 
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          dataKeys: response.data ? Object.keys(response.data) : [],
          dataSuccess: response.data?.success,
          hasData: response.data?.data !== undefined
        }));
      
      // Handle specific response format from the API
      // Based on the logs, we know the structure is: { success: true, data: {...} }
      // where data is an object containing the assets information
      
      // Based on our logs, the response has this structure:
      // { success: true, data: { assets: [], pagination: {...} } }
      
      if (response.data && response.data.success === true && response.data.data) {
        const responseData = response.data.data;
        
        // Check for assets array in the response.data.data.assets path
        if (responseData.assets && Array.isArray(responseData.assets)) {
          console.log('Found assets array in response.data.data.assets with length:', responseData.assets.length);
          return responseData.assets as Asset[];
        }
        
        // Other possible formats
        if (typeof responseData === 'object' && responseData !== null) {
          // If it's a single asset object
          if ('id' in responseData) {
            console.log('Found single asset object:', responseData);
            return [responseData as Asset];
          }
          
          // If it's an object with numbered keys (like {0: asset1, 1: asset2})
          if (Object.keys(responseData).length > 0 && !isNaN(parseInt(Object.keys(responseData)[0]))) {
            const assetsArray = Object.values(responseData) as Asset[];
            console.log('Converted object with numbered keys to array of length:', assetsArray.length);
            return assetsArray;
          }
          
          // If it's an object with asset IDs as keys
          const possibleAssets = Object.values(responseData);
          if (possibleAssets.length > 0 && possibleAssets.every(item => 
              typeof item === 'object' && item !== null && 'id' in item)) {
            console.log('Extracted assets from object values, length:', possibleAssets.length);
            return possibleAssets as Asset[];
          }
        } else if (Array.isArray(responseData)) {
          // If it's already an array
          console.log('Found assets array with length:', responseData.length);
          return responseData as Asset[];
        }
      } else if (response.data && Array.isArray(response.data)) {
        // If assets are directly in response.data
        console.log('Using direct response.data array with length:', response.data.length);
        return response.data;
      } else if (response.data && typeof response.data === 'object' && response.data.assets && Array.isArray(response.data.assets)) {
        // If assets are under a field named 'assets'
        console.log('Using response.data.assets array with length:', response.data.assets.length);
        return response.data.assets;
      }
      
      // Log the entire response with detailed structure
      console.warn('Could not extract assets from response:', response.data);
      
      // Print out the detailed structure of response.data.data
      if (response.data && response.data.data) {
        console.log('Detailed data structure:');
        console.log('Type of data:', typeof response.data.data);
        console.log('Is data an array:', Array.isArray(response.data.data));
        console.log('JSON of data:', JSON.stringify(response.data.data, null, 2));
        
        // Try to extract assets if data is an object
        if (typeof response.data.data === 'object' && !Array.isArray(response.data.data)) {
          const keys = Object.keys(response.data.data);
          console.log('Keys in data object:', keys);
          
          // Special case: if the object has numeric keys that are assets
          // This is a common pattern in some APIs that return objects instead of arrays
          if (keys.length > 0) {
            const sampleValue = response.data.data[keys[0]];
            console.log('Sample value from first key:', sampleValue);
            
            // If the values look like assets, return them
            if (sampleValue && typeof sampleValue === 'object' && ('id' in sampleValue || 'name' in sampleValue || 'type' in sampleValue)) {
              const extractedAssets = Object.values(response.data.data) as Asset[];
              console.log('Successfully extracted assets as object values, count:', extractedAssets.length);
              return extractedAssets;
            }
          }
        }
      }
      return [];
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.response?.data?.message || 'Failed to fetch assets');
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download an asset
   */
  const downloadAsset = async (assetId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.assets.download(assetId);
      
      // Create a download link for the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers if available
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'download';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (err: any) {
      console.error('Error downloading asset:', err);
      setError(err.response?.data?.message || 'Failed to download asset');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Debug function to directly check the assets table
   */
  const debugAssetsTable = async (): Promise<any> => {
    try {
      setLoading(true);
      setError(null);
      
      // Directly call the debug schema endpoint
      const response = await apiClient.defaults.get('/api/assets/debug-schema');
      return response.data;
    } catch (err: any) {
      console.error('Error debugging assets table:', err);
      setError(err.response?.data?.message || 'Failed to debug assets table');
      return {};
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    toggleFavourite,
    deleteAsset,
    fetchAssets,
    downloadAsset,
    debugAssetsTable
  };
};
