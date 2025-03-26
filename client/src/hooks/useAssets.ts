import { useState, useEffect, useCallback } from 'react';
import { assetService } from '../api/services/assets/asset.service';
import { Asset, AssetFilters } from '../api/types/asset.types';
import { clientService } from '../api/services/clients/client.service';

/**
 * Custom hook for asset operations with proper error handling
 * 
 * @param initialFilters - Optional initial filters to apply
 */
export function useAssets(initialFilters?: AssetFilters) {
  // State for managing assets data and UI states
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetFilters>(initialFilters || {});

  // Ensure we have a client ID
  const ensureClientId = useCallback((currentFilters: AssetFilters): AssetFilters => {
    if (!currentFilters.clientId) {
      const clientId = clientService.getSelectedClientId();
      return { ...currentFilters, clientId: clientId || undefined };
    }
    return currentFilters;
  }, []);

  /**
   * Load assets with filters
   * @param customFilters - Optional custom filters to apply for this request only
   */
  const loadAssets = useCallback(async (customFilters?: AssetFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use custom filters or current state
      const filtersToUse = ensureClientId(customFilters || filters);
      
      // Log for debugging purposes
      console.log('🔄 useAssets: Loading assets with filters:', filtersToUse);
      
      const fetchedAssets = await assetService.getAssets(filtersToUse);
      setAssets(fetchedAssets);
      
      // Update stored filters if custom filters were provided
      if (customFilters) {
        setFilters(filtersToUse);
      }
      
      console.log(`✅ useAssets: Loaded ${fetchedAssets.length} assets`);
    } catch (err) {
      console.error('❌ useAssets: Error loading assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [filters, ensureClientId]);

  // Load assets on mount and when filters change
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  /**
   * Toggle favourite status of an asset
   * @param asset - The asset to toggle favourite status for
   */
  const toggleFavourite = useCallback(async (asset: Asset) => {
    try {
      const updatedAsset = await assetService.toggleFavourite(
        asset.id, 
        !asset.favourite,
        filters.clientId
      );
      
      // Update the asset in the local state
      setAssets(currentAssets => 
        currentAssets.map(a => 
          a.id === asset.id ? { ...a, favourite: !a.favourite } : a
        )
      );
      
      // Update selected asset if needed
      if (selectedAsset?.id === asset.id) {
        setSelectedAsset(updatedAsset);
      }
      
      return true;
    } catch (err) {
      console.error('❌ useAssets: Error toggling favourite:', err);
      setError(err instanceof Error ? err.message : 'Failed to update favourite status');
      return false;
    }
  }, [filters, selectedAsset]);

  /**
   * Delete an asset
   * @param assetId - ID of the asset to delete
   */
  const deleteAsset = useCallback(async (assetId: string) => {
    try {
      const success = await assetService.deleteAsset(
        assetId,
        filters.clientId
      );
      
      if (success) {
        // Remove the asset from local state
        setAssets(currentAssets => currentAssets.filter(a => a.id !== assetId));
        
        // Clear selected asset if it was deleted
        if (selectedAsset?.id === assetId) {
          setSelectedAsset(null);
        }
        
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ useAssets: Error deleting asset:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete asset');
      return false;
    }
  }, [filters, selectedAsset]);

  /**
   * Update filters and reload assets
   * @param newFilters - New filters to apply
   */
  const updateFilters = useCallback((newFilters: Partial<AssetFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    loadAssets(updatedFilters);
  }, [filters, loadAssets]);
  
  /**
   * Select an asset
   * @param asset - Asset to select, or null to clear selection
   */
  const selectAsset = useCallback((asset: Asset | null) => {
    setSelectedAsset(asset);
  }, []);
  
  /**
   * Get an asset by ID
   * @param id - ID of the asset to get
   */
  const getAssetById = useCallback(async (id: string) => {
    try {
      return await assetService.getAsset(id, filters.clientId);
    } catch (err) {
      console.error(`❌ useAssets: Error getting asset ${id}:`, err);
      setError(err instanceof Error ? err.message : `Failed to get asset ${id}`);
      return null;
    }
  }, [filters]);
  
  // Listen for client changes
  useEffect(() => {
    const handleClientChange = () => {
      // Reload assets when client changes
      loadAssets();
    };
    
    window.addEventListener('clientChanged', handleClientChange);
    
    return () => {
      window.removeEventListener('clientChanged', handleClientChange);
    };
  }, [loadAssets]);

  return {
    // State
    assets,
    selectedAsset,
    loading,
    error,
    filters,
    
    // Actions
    loadAssets,
    toggleFavourite,
    deleteAsset,
    updateFilters,
    selectAsset,
    getAssetById,
  };
}
