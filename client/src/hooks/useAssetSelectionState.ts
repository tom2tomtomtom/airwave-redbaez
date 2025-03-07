import { useState, useCallback, useEffect } from 'react';
import { Asset, AssetFilters } from '../types/assets';
import { useAssetOperations } from './useAssetOperations';

/**
 * Custom hook for managing asset selection state and operations
 * @param initialType Initial asset type filter
 * @param initialFavourite Whether to show only favourites initially
 * @param sortBy Field to sort by (date, name, type)
 * @param sortDirection Sort direction (asc, desc)
 * @param showFilters Whether to display filtering options
 */
export const useAssetSelectionState = (
  initialType: string = 'all',
  initialFavourite: boolean = false,
  initialSortBy: string = 'date',
  initialSortDirection: 'asc' | 'desc' = 'desc',
  showFilters: boolean = true
) => {
  // State for assets list and selection
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortedAssets, setSortedAssets] = useState<Asset[]>([]);
  
  // State for filtering, sorting and pagination
  const [filters, setFilters] = useState<AssetFilters>({
    type: 'all',
    search: '',
    favourite: false,
    sortBy: 'date',
    sortDirection: 'desc'
  });
  
  // Use the asset operations hook
  const assetOperations = useAssetOperations();
  
  // Initialize filters with props
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      type: initialType,
      favourite: initialFavourite,
      sortBy: initialSortBy,
      sortDirection: initialSortDirection
    }));
  }, [initialType, initialFavourite, initialSortBy, initialSortDirection]);

  // Sort assets when they change or when sort options change
  useEffect(() => {
    const sortAssets = () => {
      // Create a copy to avoid mutating original array
      const sorted = [...assets].sort((a, b) => {
        const { sortBy, sortDirection } = filters;
        
        // Handle different sorting fields
        if (sortBy === 'date') {
          // Convert dates to timestamps for comparison
          const dateA = new Date(a.updatedAt || a.createdAt).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt).getTime();
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        if (sortBy === 'name') {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          return sortDirection === 'asc' 
            ? nameA.localeCompare(nameB) 
            : nameB.localeCompare(nameA);
        }
        
        if (sortBy === 'type') {
          const typeA = a.type;
          const typeB = b.type;
          return sortDirection === 'asc' 
            ? typeA.localeCompare(typeB) 
            : typeB.localeCompare(typeA);
        }
        
        return 0;
      });
      
      setSortedAssets(sorted);
    };
    
    sortAssets();
  }, [assets, filters.sortBy, filters.sortDirection]);

  /**
   * Load assets with current filters
   */
  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const assetData = await assetOperations.fetchAssets(filters);
      setAssets(assetData);
      
      // Clear selection if the selected asset is no longer in the filtered list
      if (selectedAssetId && !assetData.some(asset => asset.id === selectedAssetId)) {
        setSelectedAssetId(null);
      }
    } catch (err) {
      console.error('Error loading assets:', err);
      setError('Failed to load assets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters, selectedAssetId, assetOperations]);
  
  /**
   * Update filters and reload assets
   */
  const updateFilters = useCallback((newFilters: Partial<AssetFilters>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
  }, []);
  
  /**
   * Select an asset by ID
   */
  const selectAsset = useCallback((assetId: string | null) => {
    setSelectedAssetId(assetId);
  }, []);
  
  /**
   * Get the currently selected asset
   */
  const getSelectedAsset = useCallback(() => {
    if (!selectedAssetId) return null;
    return assets.find(asset => asset.id === selectedAssetId) || null;
  }, [assets, selectedAssetId]);
  
  /**
   * Handle asset changes (update, delete, etc.) and refresh the list
   */
  const handleAssetChanged = useCallback(async () => {
    await loadAssets();
  }, [loadAssets]);
  
  // Effect to load assets when component mounts or filters change
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return {
    assets: sortedAssets,
    rawAssets: assets,
    selectedAssetId,
    loading: loading || assetOperations.loading,
    error: error || assetOperations.error,
    filters,
    selectAsset,
    updateFilters,
    loadAssets,
    handleAssetChanged,
    getSelectedAsset,
    showFilters
  };
};
