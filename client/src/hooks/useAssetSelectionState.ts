import { useState, useCallback, useEffect } from 'react';
import { Asset, AssetFilters, AssetType } from '../types/assets';
import { useAssetOperations } from './useAssetOperations';

// Known working client ID from SQL database
const KNOWN_WORKING_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

/**
 * Custom hook for managing asset selection state and operations
 * @param initialType Initial asset type filter
 * @param initialFavourite Whether to show only favourites initially
 * @param sortBy Field to sort by (date, name, type)
 * @param sortDirection Sort direction (asc, desc)
 * @param showFilters Whether to display filtering options
 */
export const useAssetSelectionState = (
  initialType: AssetType | 'all' = 'all',
  initialFavourite: boolean = false,
  initialSortBy: string = 'date',
  initialSortDirection: 'asc' | 'desc' = 'desc',
  showFilters: boolean = true,
  initialClientId?: string
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
    sortDirection: 'desc',
    client_id: initialClientId || KNOWN_WORKING_CLIENT_ID,
    clientId: initialClientId || KNOWN_WORKING_CLIENT_ID
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
      sortDirection: initialSortDirection,
      client_id: initialClientId || KNOWN_WORKING_CLIENT_ID,
      clientId: initialClientId || KNOWN_WORKING_CLIENT_ID
    }));
  }, [initialType, initialFavourite, initialSortBy, initialSortDirection, initialClientId]);

  // Sort assets when they change or when sort options change
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
   * Load assets with current filters
   */
  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching assets with filters:', filters);
      // Add a timestamp parameter to prevent caching
      const timestamp = new Date().getTime();
      
      // Create a detailed request object for debugging
      const requestFilters = {
        type: filters.type !== 'all' ? filters.type : undefined,
        search: filters.search || undefined,
        favourite: filters.favourite || undefined,
        sortBy: filters.sortBy || undefined,
        sortDirection: filters.sortDirection || undefined,
        clientId: filters.clientId || filters.client_id || KNOWN_WORKING_CLIENT_ID, // Use clientId with fallback to known working ID
        _timestamp: timestamp, // Add timestamp to force fresh data
        debug: true // Request detailed response for debugging
      };
      
      // Debug client ID filtering
      const clientId = filters.clientId || filters.client_id;
      if (clientId) {
        console.log(`⚠️ Filtering assets for client ID: ${clientId}`);
        
        // Special handling for Juniper client which we know has ID issues
        if (clientId === 'fd790d19-6610-4cd5-b90f-214808e94a19' || 
            clientId.includes('fd790d19')) {
          console.log('⚠️ Special handling for Juniper client');
        }
      }
      
      console.log('Sending exact request filters:', JSON.stringify(requestFilters));
      
      // Fetch assets from API
      let assetData = await assetOperations.fetchAssets(requestFilters);
      
      console.log('Received assets count:', assetData.length);
      console.log('First asset data sample:', assetData.length > 0 ? assetData[0] : 'No assets');
      console.log('Asset URLs:', assetData.map(asset => asset.url));
      // Double-check filtering on the client side if type filter is set
      // This ensures we only show exactly what was requested
      if (filters.type !== 'all' && filters.type) {
        console.log(`Applying strict filtering for type: ${filters.type}`);
        assetData = assetData.filter(asset => asset.type === filters.type);
        console.log(`After strict filtering: ${assetData.length} assets remain`);
      }
      
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
    // We need to manually load assets here since we removed loadAssets from the effect dependency
    // array to prevent infinite loops
    setTimeout(() => loadAssets(), 0);
  }, [loadAssets]);
  
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
  // Using an empty dependency array to ensure it only runs once on mount
  // We'll rely on explicit calls to loadAssets when filters change
  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
