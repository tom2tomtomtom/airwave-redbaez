import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { assetService } from '../api/services/assets/asset.service';
import { Asset, AssetFilters } from '../api/types/asset.types';
import { RootState } from '../store';

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

  // Get selectedClientId from Redux store
  const selectedClientId = useSelector((state: RootState) => state.clients.selectedClientId);

  /**
   * Load assets with filters
   * @param customFilters - Optional custom filters to apply for this request only
   */
  const loadAssets = useCallback(async (customFilters?: AssetFilters) => {
    if (!selectedClientId) {
      console.warn('useAssets: Cannot load assets, no client selected.');
      setAssets([]); // Clear assets if no client
      return; // Prevent API call if no client ID
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Use custom filters or current state, ensuring clientId is from Redux
      const filtersToUse: AssetFilters = { 
        ...(customFilters || filters),
        clientId: selectedClientId
      };
      
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
  // Depend on selectedClientId now
  }, [filters, selectedClientId]); 

  // Load assets on mount and when filters or selectedClientId change
  useEffect(() => {
    loadAssets();
  // Depend on selectedClientId
  }, [loadAssets, selectedClientId]);

  /**
   * Toggle favourite status of an asset
   * @param asset - The asset to toggle favourite status for
   */
  const toggleFavourite = useCallback(async (asset: Asset) => {
    if (!selectedClientId) {
      console.warn('useAssets: Cannot toggle favourite, no client selected.');
      return false;
    }
    
    try {
      const updatedAsset = await assetService.toggleFavourite(
        asset.id, 
        !asset.favourite,
        selectedClientId // Use Redux client ID
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
  // Depend on selectedClientId
  }, [selectedAsset, selectedClientId]); 

  /**
   * Delete an asset
   * @param assetId - ID of the asset to delete
   */
  const deleteAsset = useCallback(async (assetId: string) => {
    if (!selectedClientId) {
      console.warn('useAssets: Cannot delete asset, no client selected.');
      return false;
    }
    
    try {
      const success = await assetService.deleteAsset(
        assetId,
        selectedClientId // Use Redux client ID
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
  // Depend on selectedClientId
  }, [selectedAsset, selectedClientId]);

  /**
   * Update filters and reload assets
   * @param newFilters - New filters to apply
   */
  const updateFilters = useCallback((newFilters: Partial<AssetFilters>) => {
    // Ensure clientId from Redux is preserved
    const updatedFilters = { 
      ...filters, 
      ...newFilters,
      clientId: selectedClientId || undefined // Keep Redux clientId 
    };
    loadAssets(updatedFilters);
  // Depend on selectedClientId and loadAssets
  }, [filters, selectedClientId, loadAssets]);
  
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
    if (!selectedClientId) {
      console.warn('useAssets: Cannot get asset by ID, no client selected.');
      return null;
    }
    
    try {
      return await assetService.getAsset(id, selectedClientId); // Use Redux client ID
    } catch (err) {
      console.error(`❌ useAssets: Error getting asset ${id}:`, err);
      setError(err instanceof Error ? err.message : `Failed to get asset ${id}`);
      return null;
    }
  // Depend on selectedClientId
  }, [selectedClientId]);
  
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
