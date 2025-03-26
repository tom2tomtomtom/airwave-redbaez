import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { supabase } from '../../lib/supabase';

interface ExportItem {
  id: string;
  campaignId: string;
  executionId: string;
  platform: string;
  format: string;
  url: string;
  status: string;
  createdAt: string;
}

interface ExportsState {
  exports: ExportItem[];
  loading: boolean;
  error: string | null;
  platformSpecs: any[];
}

const initialState: ExportsState = {
  exports: [],
  loading: false,
  error: null,
  platformSpecs: [],
};

// Helper function to get the current Supabase token
const getAuthToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || localStorage.getItem('airwave_auth_token');
};

// Async thunks
export const fetchPlatformSpecs = createAsyncThunk(
  'exports/fetchPlatformSpecs',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get('/api/exports/platform-specs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch platform specifications');
    }
  }
);

export const exportCampaign = createAsyncThunk(
  'exports/exportCampaign',
  async ({ campaignId, platforms }: { campaignId: string; platforms: string[] }, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.post(`/api/exports/campaign/${campaignId}`, { platforms }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export campaign');
    }
  }
);

export const fetchCampaignExports = createAsyncThunk(
  'exports/fetchCampaignExports',
  async (campaignId: string, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get(`/api/exports/campaign/${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch campaign exports');
    }
  }
);

export const downloadExport = createAsyncThunk(
  'exports/downloadExport',
  async (exportId: string, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get(`/api/exports/${exportId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to download export');
    }
  }
);

// Slice
const exportsSlice = createSlice({
  name: 'exports',
  initialState,
  reducers: {
    clearExports: (state) => {
      state.exports = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch platform specs
    builder.addCase(fetchPlatformSpecs.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchPlatformSpecs.fulfilled, (state, action: PayloadAction<any[]>) => {
      state.platformSpecs = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchPlatformSpecs.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Export campaign
    builder.addCase(exportCampaign.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(exportCampaign.fulfilled, (state, action: PayloadAction<ExportItem[]>) => {
      state.exports = [...state.exports, ...action.payload];
      state.loading = false;
    });
    builder.addCase(exportCampaign.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch campaign exports
    builder.addCase(fetchCampaignExports.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchCampaignExports.fulfilled, (state, action: PayloadAction<ExportItem[]>) => {
      state.exports = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchCampaignExports.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearExports } = exportsSlice.actions;

export default exportsSlice.reducer;