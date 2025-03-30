import { 
  createSlice, 
  createAsyncThunk, 
  PayloadAction,
  createEntityAdapter,
  EntityState
} from '@reduxjs/toolkit';
import axios from 'axios';
import { createSelector } from '@reduxjs/toolkit';
import { Asset, AssetFilters } from '../../types/assets';
import { supabase } from '../../lib/supabase';
import assetService from '../../services/assetService';
import { RootState } from '..'; 

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

// --- Define Entity Adapter and State ---
const assetsAdapter = createEntityAdapter<Asset>({
  // Assuming Asset type has an 'id' field
  // sortComparer: (a, b) => a.name.localeCompare(b.name), // Optional: sort by name
});

interface AssetsState extends EntityState<Asset> {
  loading: boolean;
  error: string | null;
  currentAssetId: string | null; 
  filters: AssetFilters;
}

const initialState: AssetsState = assetsAdapter.getInitialState({
  loading: false,
  error: null,
  currentAssetId: null,
  filters: {
    type: 'all',
    search: '',
    favourite: false,
    // Ensure any default sort is here if needed, e.g.:
    // sortBy: 'createdAt',
    // sortDirection: 'desc',
  },
});

// Helper function to get the current Supabase token 
const getAuthToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || localStorage.getItem('airwave_auth_token');
};

// --- Async Thunks (Add explicit return types) ---

/**
 * Main thunk for fetching assets by client slug - the primary approach
 * Returns the raw API response which might contain { assets: Asset[] } or similar
 */
export const fetchAssetsByClientSlug = createAsyncThunk<any, { slug: string } & Omit<AssetFilters, 'clientSlug' | 'clientId'>>(
  'assets/fetchAssetsByClientSlug',
  async ({ slug, ...filters }, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const requestParams: Record<string, any> = {};
      if (filters.type) requestParams.type = filters.type;
      if (filters.search) requestParams.search = filters.search;
      if (filters.favourite) requestParams.favourite = filters.favourite;
      if (filters.sortBy) requestParams.sortBy = filters.sortBy;
      if (filters.sortDirection) requestParams.sortDirection = filters.sortDirection;
      requestParams._timestamp = new Date().getTime();
      console.log(`Fetching assets for client slug: ${slug} with params:`, requestParams);
      const response = await axios.get(`/api/v2/assets/by-client/${encodeURIComponent(slug)}`, { 
        params: requestParams,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data; 
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Generic asset fetching function that delegates or falls back.
 * Returns the raw API response or an array of Assets from the service.
 */
export const fetchAssets = createAsyncThunk<any, AssetFilters | undefined>(
  'assets/fetchAssets',
  async (filters, { rejectWithValue, dispatch }) => {
    try {
      if (filters?.clientSlug) {
        try {
          const result = await dispatch(fetchAssetsByClientSlug({
            slug: filters.clientSlug,
            ...filters
          })).unwrap(); 
          return result; 
        } catch (slugError) {
          console.log('Slug-based asset fetch failed, trying assetService:', slugError);
          try {
            const assets = await assetService.getAssets(filters);
            console.log('assetService returned assets:', assets.length);
            return assets; 
          } catch (serviceError) {
            console.error('Asset service also failed:', serviceError);
            throw serviceError; 
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
        
        const requestParams: Record<string, any> = {};
        if (filters) {
          if (filters.type) requestParams.type = filters.type;
          if (filters.search) requestParams.search = filters.search;
          if (filters.favourite) requestParams.favourite = filters.favourite;
          if (filters.sortBy) requestParams.sortBy = filters.sortBy;
          if (filters.sortDirection) requestParams.sortDirection = filters.sortDirection;
          
          if (filters.clientId) {
            requestParams.clientId = filters.clientId;
          } else if (filters.clientSlug) {
            requestParams.clientId = filters.clientSlug; 
            console.log('🔄 Using clientSlug as clientId:', filters.clientSlug);
          } else {
            const fallbackClientId = 'fe418478-806e-411a-ad0b-1b9a537a8081';
            requestParams.clientId = fallbackClientId;
            console.log('⚠️ Using fallback clientId:', fallbackClientId);
          }
          
          requestParams._timestamp = new Date().getTime();
          requestParams.debug = true; 
        }
        
        console.log('🔄 Sending asset request with params:', requestParams);
        const response = await axios.get('/api/v2/assets', { 
          params: requestParams,
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ Received ${response.data?.assets?.length || 0} assets from server`);
        console.log('📊 Raw API response:', response.data);
        return response.data; 
      } catch (apiError) {
        console.log('❌ Regular API asset fetch failed, trying assetService:', apiError);
        console.log('🔄 Final attempt using assetService with filters:', filters);
        const assets = await assetService.getAssets(filters);
        console.log('✅ Final assetService attempt returned assets:', assets.length);
        if (assets.length === 0) {
          console.warn('⚠️ All methods returned zero assets.');
        }
        return assets; 
      }
    } catch (error: any) {
      console.error('All asset fetch methods failed:', error);
      return rejectWithValue(getErrorMessage(error)); 
    }
  }
);

// Returns the created Asset object
export const uploadAsset = createAsyncThunk<Asset, FormData>(
  'assets/uploadAsset',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
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
      const response = await axios.post('/api/assets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        timeout: 120000, 
      });
      console.log('Upload response:', response.data);
      
      let assetData: any;
      if (response.data.data) assetData = response.data.data;
      else if (response.data.asset) assetData = response.data.asset;
      else assetData = response.data;

      if (typeof assetData === 'object' && assetData !== null && assetData.id) {
          return assetData as Asset;
      } else {
          console.error('Unexpected upload response format:', assetData);
          throw new Error('Failed to parse uploaded asset data from response');
      }
    } catch (error: any) {
      console.error('Asset upload failed:', error);
      console.error('Error details:', error.response?.data || error.message);
      return rejectWithValue(getErrorMessage(error)); 
    }
  }
);

// Returns the ID of the deleted asset
export const deleteAsset = createAsyncThunk<string, string>(
  'assets/deleteAsset',
  async (assetId: string, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      await axios.delete(`/api/assets/${assetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return assetId;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error)); 
    }
  }
);

// Returns the updated Asset object
export const updateAsset = createAsyncThunk<Asset, { id: string; data: Partial<Asset> }>(
  'assets/updateAsset',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const response = await axios.put(`/api/assets/${id}`, data, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (typeof response.data === 'object' && response.data !== null && response.data.id) {
          return response.data as Asset;
      } else {
          console.error('Unexpected update response format:', response.data);
          throw new Error('Failed to parse updated asset data from response');
      }
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error)); 
    }
  }
);

// Returns the updated Asset object after toggling favorite status
export const toggleFavoriteAsset = createAsyncThunk<Asset, string>(
  'assets/toggleFavorite',
  async (assetId: string, { getState, rejectWithValue }) => {
    const state = getState() as RootState; 
    const asset = assetsAdapter.getSelectors().selectById(state.assets, assetId);
    
    if (!asset) {
      return rejectWithValue('Asset not found in current state');
    }
    
    const isFavourite = !asset.isFavourite; 
    
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await axios.put(`/api/assets/${assetId}/favourite`, { isFavourite }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (typeof response.data === 'object' && response.data !== null && response.data.id) {
          return response.data as Asset;
      } else {
          console.error('Unexpected favorite toggle response format:', response.data);
          throw new Error('Failed to parse asset data from favorite toggle response');
      }
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error)); 
    }
  }
);

// --- Slice Definition ---
const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    setAssetFilters(state, action: PayloadAction<Partial<AssetFilters>>) { 
      state.filters = { ...state.filters, ...action.payload };
    },
    clearAssetFilters(state) {
      state.filters = initialState.filters; 
    },
    setCurrentAssetId(state, action: PayloadAction<string | null>) {
      state.currentAssetId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssets.fulfilled, (state, action: PayloadAction<Asset[] | { data?: Asset[] | any, assets?: Asset[] | any } | any>) => {
        state.loading = false;
        state.error = null;
        const payload = action.payload;
        let assetArray: Asset[] = [];
        
        // Handle different possible API response structures
        if (Array.isArray(payload)) {
          console.log('Reducer using direct assets array');
          assetArray = payload;
        } else if (payload && typeof payload === 'object') {
          // Check for data property (common pattern)
          if ('data' in payload && Array.isArray(payload.data)) {
            console.log('Reducer using assets array from data property');
            // Ensure items are Asset-like before accessing id
            assetArray = payload.data.filter((item: unknown): item is Asset => 
              typeof item === 'object' && item !== null && 'id' in item
            );
          } else if ('assets' in payload && Array.isArray(payload.assets)) {
            console.log('Reducer using assets array from assets property');
            // Ensure items are Asset-like before accessing id
            assetArray = payload.assets.filter((item: unknown): item is Asset => 
              typeof item === 'object' && item !== null && 'id' in item
            );
          } else {
            console.warn('Unexpected payload structure in fetchAssets.fulfilled:', payload);
          }
        } else {
          console.warn('Unexpected payload type in fetchAssets.fulfilled:', payload);
        }
        
        console.log(`Reducer setting ${assetArray.length} assets`);
        assetsAdapter.setAll(state, assetArray); 
      })
      .addCase(fetchAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch assets';
      })
      .addCase(uploadAsset.pending, (state) => {
        state.loading = true; 
        state.error = null;
      })
      .addCase(uploadAsset.fulfilled, (state, action: PayloadAction<Asset>) => {
        console.log('Reducer adding uploaded asset:', action.payload);
        assetsAdapter.addOne(state, action.payload); 
        state.loading = false;
      })
      .addCase(uploadAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to upload asset';
      })
      .addCase(deleteAsset.pending, (state, action) => {
        // Optionally mark the specific asset as deleting
        // state.entities[action.meta.arg]?.status = 'deleting'; 
      })
      .addCase(deleteAsset.fulfilled, (state, action: PayloadAction<string>) => {
        assetsAdapter.removeOne(state, action.payload); 
        if (state.currentAssetId === action.payload) {
          state.currentAssetId = null; 
        }
      })
      .addCase(deleteAsset.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to delete asset';
        // Optionally reset status if marked as deleting
        // const asset = state.entities[action.meta.arg];
        // if (asset) asset.status = 'idle'; 
      })
      .addCase(updateAsset.pending, (state, action) => {
        // Optionally mark the specific asset as updating
        // state.entities[action.meta.arg.id]?.status = 'updating';
      })
      .addCase(updateAsset.fulfilled, (state, action: PayloadAction<Asset>) => {
        assetsAdapter.upsertOne(state, action.payload); 
      })
      .addCase(updateAsset.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to update asset';
        // Optionally reset status if marked as updating
        // const asset = state.entities[action.meta.arg.id];
        // if (asset) asset.status = 'idle';
      })
      .addCase(toggleFavoriteAsset.pending, (state, action) => {
        // Optionally mark the specific asset as updating
        // state.entities[action.meta.arg]?.status = 'updating_favorite';
      })
      .addCase(toggleFavoriteAsset.fulfilled, (state, action: PayloadAction<Asset>) => {
        assetsAdapter.upsertOne(state, action.payload); 
      })
      .addCase(toggleFavoriteAsset.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to toggle favourite';
        // Optionally reset status if marked as updating
        // const asset = state.entities[action.meta.arg];
        // if (asset) asset.status = 'idle';
      });
  },
});

// --- Exports ---
export const {
  setAssetFilters,
  clearAssetFilters,
  setCurrentAssetId 
} = assetsSlice.actions;

// --- Selectors ---

const assetsSelectors = assetsAdapter.getSelectors<RootState>(
  (state) => state.assets 
);

export const selectAllAssets = assetsSelectors.selectAll;
export const selectAssetEntities = assetsSelectors.selectEntities;
export const selectAssetIds = assetsSelectors.selectIds;
export const selectTotalAssets = assetsSelectors.selectTotal;

export const selectAssetById = assetsSelectors.selectById;

export const selectCurrentAssetId = (state: RootState): string | null => state.assets.currentAssetId;

export const selectAssetFilters = (state: RootState): AssetFilters => state.assets.filters;

export const selectAssetsLoading = (state: RootState): boolean => state.assets.loading;

export const selectAssetsError = (state: RootState): string | null => state.assets.error;

// --- Memoized Selectors ---

export const selectCurrentAsset = createSelector(
  [selectAssetEntities, selectCurrentAssetId], 
  (entities, currentId) => (currentId ? entities[currentId] : null) 
);

export const selectFilteredAssets = createSelector(
  [selectAllAssets, selectAssetFilters], 
  (assets, filters) => { 
    const { type, search, favourite } = filters;
    if (type === 'all' && !search && !favourite) {
      return assets; 
    }
    return assets.filter(asset => {
      const typeMatch = type !== 'all' ? asset.type === type : true;
      const searchMatch = search
        ? (asset.name?.toLowerCase().includes(search.toLowerCase()) || 
           asset.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) 
        : true;
      const favoriteMatch = favourite ? asset.isFavourite === true : true;
      
      return typeMatch && searchMatch && favoriteMatch;
    });
  }
);

export const selectFavoriteAssets = createSelector(
  [selectAllAssets],
  (assets) => assets.filter(a => a.isFavourite === true)
);

export default assetsSlice.reducer;