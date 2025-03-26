import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { Asset, AssetFilters } from '../../types/assets';
import { supabase } from '../../lib/supabase';
import assetService from '../../services/assetService';

/**
 * Helper function to extract error messages from various error types
 */
const getErrorMessage = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else {
    return 'An unknown error occurred';
  }
};

interface AssetsState {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  currentAsset: Asset | null;
  filters: AssetFilters;
}

const initialState: AssetsState = {
  assets: [],
  loading: false,
  error: null,
  currentAsset: null,
  filters: {
    type: 'all',
    search: '',
    favourite: false,
  },
};

// Helper function to get the current Supabase token
const getAuthToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || localStorage.getItem('airwave_auth_token');
};

// Async thunks
/**
 * Main thunk for fetching assets by client slug - the primary approach
 */
export const fetchAssetsByClientSlug = createAsyncThunk<any, { slug: string } & Omit<AssetFilters, 'clientSlug' | 'clientId'>>(
  'assets/fetchAssetsByClientSlug',
  async ({ slug, ...filters }, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Format parameters properly for the API
      const requestParams: Record<string, any> = {};
      
      // Map filter properties to API parameters
      if (filters.type) requestParams.type = filters.type;
      if (filters.search) requestParams.search = filters.search;
      if (filters.favourite) requestParams.favourite = filters.favourite;
      if (filters.sortBy) requestParams.sortBy = filters.sortBy;
      if (filters.sortDirection) requestParams.sortDirection = filters.sortDirection;
      
      // Add timestamp to force fresh data
      requestParams._timestamp = new Date().getTime();
      
      console.log(`Fetching assets for client slug: ${slug} with params:`, requestParams);
      
      // Use clean endpoint with slug in URL path
      const response = await axios.get(`/api/v2/assets/by-client/${encodeURIComponent(slug)}`, { 
        params: requestParams,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Generic asset fetching function that delegates to slug-based version when possible
 */
export const fetchAssets = createAsyncThunk<any, AssetFilters | undefined>(
  'assets/fetchAssets',
  async (filters, { rejectWithValue, dispatch }) => {
    try {
      // Always prioritize client slug if available
      if (filters?.clientSlug) {
        try {
          return dispatch(fetchAssetsByClientSlug({
            slug: filters.clientSlug,
            ...filters
          })).unwrap();
        } catch (slugError) {
          console.log('Slug-based asset fetch failed, trying assetService:', slugError);
          // Fall back to asset service
          try {
            const assets = await assetService.getAssets(filters);
            console.log('assetService returned assets:', assets.length);
            return assets; // Return the assets directly
          } catch (serviceError) {
            console.error('Asset service also failed:', serviceError);
            throw serviceError; // Let the main catch handle it
          }
        }
      }
      
      try {
        console.log('🔐 Getting auth token for asset request');
        const token = await getAuthToken();
        
        if (!token) {
          console.warn('⚠️ No auth token available');
          throw new Error('Authentication required');
        }
        
        // Format parameters properly for the API
        const requestParams: Record<string, any> = {};
        
        if (filters) {
          // Map filter properties to API parameters and ensure clientId is included
          if (filters.type) requestParams.type = filters.type;
          if (filters.search) requestParams.search = filters.search;
          if (filters.favourite) requestParams.favourite = filters.favourite;
          if (filters.sortBy) requestParams.sortBy = filters.sortBy;
          if (filters.sortDirection) requestParams.sortDirection = filters.sortDirection;
          
          // Ensure we always have a clientId - crucial for the server
          if (filters.clientId) {
            requestParams.clientId = filters.clientId;
          } else if (filters.clientSlug) {
            // If we have a slug but no ID, use the slug as ID temporarily
            requestParams.clientId = filters.clientSlug;
            console.log('🔄 Using clientSlug as clientId:', filters.clientSlug);
          } else {
            // If we still don't have a clientId, use the one from logs
            const fallbackClientId = 'fe418478-806e-411a-ad0b-1b9a537a8081';
            requestParams.clientId = fallbackClientId;
            console.log('⚠️ Using fallback clientId:', fallbackClientId);
          }
          
          // Add timestamp to force fresh data and debug flag
          requestParams._timestamp = new Date().getTime();
          requestParams.debug = true; // Request extra debugging info from the server
        }
        
        console.log('🔄 Sending asset request with params:', requestParams);
        
        // Use the new v2 API endpoint which is simpler and more reliable
        const response = await axios.get('/api/v2/assets', { 
          params: requestParams,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`✅ Received ${response.data?.assets?.length || 0} assets from server`);
        console.log('📊 Raw API response:', response.data);
        return response.data;
      } catch (apiError) {
        console.log('❌ Regular API asset fetch failed, trying assetService:', apiError);
        // Fall back to asset service
        console.log('🔄 Final attempt using assetService with filters:', filters);
        const assets = await assetService.getAssets(filters);
        console.log('✅ Final assetService attempt returned assets:', assets.length);
        if (assets.length === 0) {
          console.warn('⚠️ All methods returned zero assets. This suggests there might be issues with:');
          console.warn('1. The client ID not being valid for any assets in the database');
          console.warn('2. The database not containing any assets for this client');
          console.warn('3. Server filter logic filtering out all potential assets');
        }
        return assets; // Return the assets directly
      }
    } catch (error: any) {
      console.error('All asset fetch methods failed:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch assets');
    }
  }
);

export const uploadAsset = createAsyncThunk(
  'assets/uploadAsset',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      // Log what we're uploading for debugging
      console.log('Uploading asset with form data keys:', Array.from(formData.keys()));
      
      const file = formData.get('file') as File;
      if (file) {
        console.log('Uploading file:', {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString()
        });
      }
      
      // Set a longer timeout for the upload request
      const response = await axios.post('/api/assets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        timeout: 120000, // 2 minutes
      });
      
      console.log('Upload response:', response.data);
      
      // Handle different response formats
      if (response.data.data) {
        // If the response has a data property, use that
        return response.data.data;
      } else if (response.data.asset) {
        // If the response has an asset property, use that
        return response.data.asset;
      } else {
        // Otherwise use the whole response data
        return response.data;
      }
    } catch (error: any) {
      console.error('Asset upload failed:', error);
      console.error('Error details:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to upload asset');
    }
  }
);

export const deleteAsset = createAsyncThunk(
  'assets/deleteAsset',
  async (assetId: string, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await axios.delete(`/api/assets/${assetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return assetId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete asset');
    }
  }
);

export const updateAsset = createAsyncThunk(
  'assets/updateAsset',
  async ({ id, data }: { id: string; data: Partial<Asset> }, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.put(`/api/assets/${id}`, data, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update asset');
    }
  }
);

export const toggleFavoriteAsset = createAsyncThunk(
  'assets/toggleFavorite',
  async (assetId: string, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      const state = getState() as { assets: AssetsState };
      const asset = state.assets.assets.find(a => a.id === assetId);
      
      if (!asset) {
        return rejectWithValue('Asset not found');
      }
      
      const isFavourite = !asset.isFavourite;
      const response = await axios.put(`/api/assets/${assetId}/favourite`, { isFavourite }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle favourite');
    }
  }
);

// Slice
const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    setAssetFilters: (state, action: PayloadAction<AssetFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearAssetFilters: (state) => {
      state.filters = { type: 'all', search: '', favourite: false };
    },
    setCurrentAsset: (state, action: PayloadAction<Asset | null>) => {
      state.currentAsset = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch assets
    builder.addCase(fetchAssets.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchAssets.fulfilled, (state, action) => {
      // Handle different response formats, supporting direct arrays and API responses
      let assetArray: Asset[] = [];
      
      console.log('Asset payload received:', action.payload);
      
      if (action.payload && typeof action.payload === 'object') {
        // Handle direct array from assetService
        if (Array.isArray(action.payload)) {
          console.log('Using direct asset array from assetService');
          assetArray = action.payload;
        }
        // Handle v2 API format: { success: true, assets: [], total: number }
        else if (action.payload.success === true && Array.isArray(action.payload.assets)) {
          console.log('Using assets array from v2 API format with success property');
          assetArray = action.payload.assets;
        }
        // Handle legacy formats
        else if (action.payload.data && Array.isArray(action.payload.data.assets)) {
          console.log('Using assets array from data.assets property');
          assetArray = action.payload.data.assets;
        } else if (action.payload.data && Array.isArray(action.payload.data)) {
          console.log('Using assets array from data property');
          assetArray = action.payload.data;
        } else if (action.payload.assets && Array.isArray(action.payload.assets)) {
          console.log('Using assets array from assets property');
          assetArray = action.payload.assets;
        }
      }
      
      // Ensure we always have an array
      state.assets = assetArray || [];
      console.log(`Loaded ${state.assets.length} assets`);
      state.loading = false;
    });
    builder.addCase(fetchAssets.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Upload asset
    builder.addCase(uploadAsset.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(uploadAsset.fulfilled, (state, action) => {
      console.log('Asset upload fulfilled with payload:', action.payload);
      
      // Handle different response formats
      let asset: Asset;
      
      if (typeof action.payload === 'object' && action.payload !== null) {
        // Extract the asset from the payload - handle different response structures
        let assetData: any;
        
        if (action.payload.data && typeof action.payload.data === 'object') {
          // Response has { data: {...} } structure
          assetData = action.payload.data;
          console.log('Using data property from payload:', assetData);
        } else if (action.payload.asset && typeof action.payload.asset === 'object') {
          // Response has { asset: {...} } structure
          assetData = action.payload.asset;
          console.log('Using asset property from payload:', assetData);
        } else {
          // Direct object response
          assetData = action.payload;
          console.log('Using direct payload object:', assetData);
        }
        
        // Convert to expected Asset format
        asset = {
          id: assetData.id || `temp-${Date.now()}`,
          name: assetData.name || 'Unnamed Asset',
          type: assetData.type || 'image',
          description: assetData.description || '',
          url: assetData.url || '',
          thumbnailUrl: assetData.thumbnailUrl || assetData.thumbnail_url || '',
          tags: Array.isArray(assetData.tags) ? assetData.tags : [],
          isFavourite: Boolean(assetData.isFavourite),
          size: assetData.size || 0,
          width: assetData.width || undefined,
          height: assetData.height || undefined,
          duration: assetData.duration || undefined,
          createdAt: assetData.createdAt || assetData.created_at || new Date().toISOString(),
          updatedAt: assetData.updatedAt || assetData.updated_at || new Date().toISOString(),
          ownerId: assetData.ownerId || assetData.owner_id || assetData.userId || assetData.user_id || '',
          clientSlug: assetData.clientSlug || assetData.client_slug || '',
          clientId: assetData.clientId || assetData.client_id || '',
          // Store additional properties in metadata
          metadata: {
            previewUrl: assetData.previewUrl || '',
            categories: Array.isArray(assetData.categories) ? assetData.categories : [],
            usageCount: assetData.usageCount || 0,
            ...(assetData.metadata || {})
          }
        };
        
        console.log('Processed asset object:', asset);
      } else {
        // This should not happen, but just in case
        console.warn('Received unexpected payload format:', action.payload);
        asset = {
          id: `temp-${Date.now()}`,
          name: 'Unknown Asset',
          type: 'image', // Use a valid AssetType value
          url: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ownerId: '',
          clientSlug: '',
          clientId: '',
        };
      }
      
      // Add to assets array
      state.assets.unshift(asset); // Add to beginning of array to show newest first
      state.loading = false;
    });
    builder.addCase(uploadAsset.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      console.error('Asset upload rejected:', action.payload);
    });

    // Delete asset
    builder.addCase(deleteAsset.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteAsset.fulfilled, (state, action: PayloadAction<string>) => {
      state.assets = state.assets.filter(asset => asset.id !== action.payload);
      state.loading = false;
    });
    builder.addCase(deleteAsset.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update asset
    builder.addCase(updateAsset.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateAsset.fulfilled, (state, action: PayloadAction<Asset>) => {
      const index = state.assets.findIndex(asset => asset.id === action.payload.id);
      if (index !== -1) {
        state.assets[index] = action.payload;
      }
      if (state.currentAsset?.id === action.payload.id) {
        state.currentAsset = action.payload;
      }
      state.loading = false;
    });
    builder.addCase(updateAsset.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Toggle favorite
    builder.addCase(toggleFavoriteAsset.fulfilled, (state, action: PayloadAction<Asset>) => {
      const index = state.assets.findIndex(asset => asset.id === action.payload.id);
      if (index !== -1) {
        state.assets[index] = action.payload;
      }
      if (state.currentAsset?.id === action.payload.id) {
        state.currentAsset = action.payload;
      }
    });
  },
});

export const { setAssetFilters, clearAssetFilters, setCurrentAsset } = assetsSlice.actions;

export default assetsSlice.reducer;