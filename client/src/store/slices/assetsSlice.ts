import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { Asset, AssetFilters } from '../../types/assets';

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

// Async thunks
export const fetchAssets = createAsyncThunk<any, AssetFilters | undefined>(
  'assets/fetchAssets',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/assets', { params: filters });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch assets');
    }
  }
);

export const uploadAsset = createAsyncThunk(
  'assets/uploadAsset',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/assets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload asset');
    }
  }
);

export const deleteAsset = createAsyncThunk(
  'assets/deleteAsset',
  async (assetId: string, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/assets/${assetId}`);
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
      const response = await axios.put(`/api/assets/${id}`, data);
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
      const state = getState() as { assets: AssetsState };
      const asset = state.assets.assets.find(a => a.id === assetId);
      
      if (!asset) {
        return rejectWithValue('Asset not found');
      }
      
      const isFavourite = !asset.isFavourite;
      const response = await axios.put(`/api/assets/${assetId}/favourite`, { isFavourite });
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
    builder.addCase(fetchAssets.fulfilled, (state, action: PayloadAction<Asset[]>) => {
      state.assets = action.payload;
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
    builder.addCase(uploadAsset.fulfilled, (state, action: PayloadAction<Asset>) => {
      state.assets.push(action.payload);
      state.loading = false;
    });
    builder.addCase(uploadAsset.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
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