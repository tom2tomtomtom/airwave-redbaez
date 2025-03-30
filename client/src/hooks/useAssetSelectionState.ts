import { useState, useCallback, useEffect } from 'react';
import { Asset, AssetFilters, AssetType } from '../types/assets';
import { useAssetOperations } from './useAssetOperations';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

// Fallback client ID might still be needed if nothing is selected
const FALLBACK_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

/**
 * Custom hook for managing asset selection state and operations
 * @param initialType Initial asset type filter
 * @param initialFavourite Whether to show only favourites initially
 * @param initialSortBy Field to sort by (date, name, type)
 * @param initialSortDirection Sort direction (asc, desc)
 * @param showFilters Whether to display filtering options
 */
export const useAssetSelectionState = (
  initialType: AssetType | 'all' = 'all',
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

  // Get selected client ID from Redux
  const selectedClientIdFromStore = useSelector((state: RootState) => state.clients.selectedClientId);

  // State for filtering, sorting and pagination
  const [filters, setFilters] = useState<AssetFilters>(() => ({
    type: initialType,
    search: '',
    favourite: initialFavourite,
    sortBy: initialSortBy,
    sortDirection: initialSortDirection,
    // Initialize clientId using Redux state or fallback
    clientId: selectedClientIdFromStore || FALLBACK_CLIENT_ID
  }));

  // Use the asset operations hook
  const assetOperations = useAssetOperations();

  // Update internal filters if initial props change (excluding clientId)
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      type: initialType,
      favourite: initialFavourite,
      sortBy: initialSortBy,
      sortDirection: initialSortDirection,
      // Keep clientId managed by the Redux state listener below
    }));
  }, [initialType, initialFavourite, initialSortBy, initialSortDirection]);

  /**
   * Load assets using the current filters state.
   * This function now relies on the clientId being correctly set in the filters state.
   */
  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Determine the client ID to use for the request
      const clientIdForRequest = filters.clientId || FALLBACK_CLIENT_ID;
      console.log(`useAssetSelectionState: Fetching assets for client ID: ${clientIdForRequest} with filters:`, filters);

      const requestFilters = {
        ...filters, // Pass all current filters
        clientId: clientIdForRequest, // Ensure correct clientId is set
        _timestamp: new Date().getTime(), // Prevent caching
        debug: true
      };

      // Remove potential undefined/null values that might interfere with API query params
      Object.keys(requestFilters).forEach(key => {
        const K = key as keyof typeof requestFilters;
        if (requestFilters[K] === undefined || requestFilters[K] === null || requestFilters[K] === '') {
          delete requestFilters[K];
        }
      });
      // Explicitly ensure type='all' isn't sent if it's the filter
      if (requestFilters.type === 'all') {
        delete requestFilters.type;
      }

      console.log('useAssetSelectionState: Sending request filters:', requestFilters);
      let assetData = await assetOperations.fetchAssets(requestFilters);
      console.log(`useAssetSelectionState: Received ${assetData.length} assets.`);

      setAssets(assetData);

      // Clear selection if the selected asset is no longer in the filtered list
      if (selectedAssetId && !assetData.some(asset => asset.id === selectedAssetId)) {
        setSelectedAssetId(null);
      }
    } catch (err: any) {
      console.error('useAssetSelectionState: Error loading assets:', err);
      setError(getErrorMessage(err)); // Use helper to get message
    } finally {
      setLoading(false);
    }
  }, [filters, selectedAssetId, assetOperations]); // Depend on filters state

  // Effect to update filters.clientId when Redux selectedClientId changes
  useEffect(() => {
    const newClientId = selectedClientIdFromStore || FALLBACK_CLIENT_ID;
    if (newClientId !== filters.clientId) {
      console.log(`useAssetSelectionState: Redux client ID changed to ${newClientId}. Updating filters.`);
      setFilters(prevFilters => ({
        ...prevFilters,
        clientId: newClientId
      }));
      // Do NOT call loadAssets here, let the next effect handle it when filters change
    }
  }, [selectedClientIdFromStore, filters.clientId]); // Depend on Redux state and internal filter state

  // Effect to load assets when filters (including clientId) change
  useEffect(() => {
    console.log('useAssetSelectionState: Filters changed, reloading assets...', filters);
    loadAssets();
  }, [loadAssets]); // Depend on the memoized loadAssets function which depends on filters

  // Sort assets when they change or when sort options change (moved after loadAssets)
  useEffect(() => {
    const sortAssets = () => {
      // Ensure assets is an array before attempting to sort
      if (!Array.isArray(assets) || assets.length === 0) {
        setSortedAssets([]);
        return;
      }

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
   * Update specific filters and trigger reload
   */
  const updateFilters = useCallback((newFilters: Partial<AssetFilters>) => {
    // Don't allow updating clientId directly via this function
    const { clientId, ...otherNewFilters } = newFilters;
    if (clientId !== undefined) {
      console.warn("useAssetSelectionState: Attempted to update clientId via updateFilters. Ignoring.");
    }

    setFilters(prevFilters => ({
      ...prevFilters,
      ...otherNewFilters
    }));
    // No need to call loadAssets here anymore, the useEffect depending on filters will handle it.
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
    console.log('useAssetSelectionState: Asset changed, reloading...');
    await loadAssets(); // Reload assets after changes
  }, [loadAssets]);

  return {
    assets: sortedAssets, // Return sorted assets
    rawAssets: assets,
    selectedAssetId,
    loading: loading || assetOperations.loading,
    error: error || assetOperations.error,
    filters,
    selectAsset,
    updateFilters,
    loadAssets, // Expose loadAssets for potential manual refresh
    handleAssetChanged,
    getSelectedAsset,
    showFilters
  };
};

// Helper function to get error message (add if not already present)
const getErrorMessage = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else {
    return 'An unknown error occurred while handling assets';
  }
};
