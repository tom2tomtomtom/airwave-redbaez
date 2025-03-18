import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Asset, AssetFilters } from '../types/assets';
import { apiClient } from '../utils/api';
import { RootState } from '../store';

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
      
      await apiClient.assets.updateFavourite(assetId, !currentStatus);
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
      
      const response = await apiClient.assets.getAll(filters);
      return response.data.data;
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

  return {
    loading,
    error,
    toggleFavourite,
    deleteAsset,
    fetchAssets,
    downloadAsset
  };
};
