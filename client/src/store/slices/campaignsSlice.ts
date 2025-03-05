import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { Campaign, CampaignFormData, CampaignFilters, Execution } from '../../types/campaigns';

interface CampaignsState {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  currentCampaign: Campaign | null;
  filters: CampaignFilters;
}

const initialState: CampaignsState = {
  campaigns: [],
  loading: false,
  error: null,
  currentCampaign: null,
  filters: {
    search: '',
    status: 'all',
  },
};

// Async thunks
export const fetchCampaigns = createAsyncThunk(
  'campaigns/fetchCampaigns',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/campaigns');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch campaigns');
    }
  }
);

export const fetchCampaignById = createAsyncThunk(
  'campaigns/fetchCampaignById',
  async (campaignId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/campaigns/${campaignId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch campaign');
    }
  }
);

export const createCampaign = createAsyncThunk(
  'campaigns/createCampaign',
  async (campaignData: CampaignFormData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/campaigns', campaignData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create campaign');
    }
  }
);

export const updateCampaign = createAsyncThunk(
  'campaigns/updateCampaign',
  async ({ id, data }: { id: string; data: Partial<CampaignFormData> }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/campaigns/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update campaign');
    }
  }
);

export const deleteCampaign = createAsyncThunk(
  'campaigns/deleteCampaign',
  async (campaignId: string, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/campaigns/${campaignId}`);
      return campaignId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete campaign');
    }
  }
);

export const addExecutionToCampaign = createAsyncThunk(
  'campaigns/addExecution',
  async ({ campaignId, execution }: { campaignId: string; execution: Execution }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/campaigns/${campaignId}/executions`, execution);
      return { campaignId, execution: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add execution');
    }
  }
);

export const generateExecutionPreview = createAsyncThunk(
  'campaigns/generatePreview',
  async ({ campaignId, executionId }: { campaignId: string; executionId: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/creatomate/preview`, {
        campaignId,
        executionId
      });
      return { campaignId, executionId, preview: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate preview');
    }
  }
);

export const startCampaignRender = createAsyncThunk(
  'campaigns/startRender',
  async (campaignId: string, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/campaigns/${campaignId}/render`);
      return { campaignId, renders: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start campaign render');
    }
  }
);

// Slice
const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    setCampaignFilters: (state, action: PayloadAction<CampaignFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCampaignFilters: (state) => {
      state.filters = { search: '', status: 'all' };
    },
    setCurrentCampaign: (state, action: PayloadAction<Campaign | null>) => {
      state.currentCampaign = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch campaigns
    builder.addCase(fetchCampaigns.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchCampaigns.fulfilled, (state, action: PayloadAction<Campaign[]>) => {
      state.campaigns = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchCampaigns.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch campaign by ID
    builder.addCase(fetchCampaignById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchCampaignById.fulfilled, (state, action: PayloadAction<Campaign>) => {
      state.currentCampaign = action.payload;
      const index = state.campaigns.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.campaigns[index] = action.payload;
      }
      state.loading = false;
    });
    builder.addCase(fetchCampaignById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create campaign
    builder.addCase(createCampaign.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createCampaign.fulfilled, (state, action: PayloadAction<Campaign>) => {
      state.campaigns.unshift(action.payload);
      state.currentCampaign = action.payload;
      state.loading = false;
    });
    builder.addCase(createCampaign.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update campaign
    builder.addCase(updateCampaign.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateCampaign.fulfilled, (state, action: PayloadAction<Campaign>) => {
      const index = state.campaigns.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.campaigns[index] = action.payload;
      }
      if (state.currentCampaign?.id === action.payload.id) {
        state.currentCampaign = action.payload;
      }
      state.loading = false;
    });
    builder.addCase(updateCampaign.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Delete campaign
    builder.addCase(deleteCampaign.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteCampaign.fulfilled, (state, action: PayloadAction<string>) => {
      state.campaigns = state.campaigns.filter(c => c.id !== action.payload);
      if (state.currentCampaign?.id === action.payload) {
        state.currentCampaign = null;
      }
      state.loading = false;
    });
    builder.addCase(deleteCampaign.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Add execution to campaign
    builder.addCase(addExecutionToCampaign.fulfilled, (state, action) => {
      const { campaignId, execution } = action.payload;
      
      // Update in campaigns array
      const campaignIndex = state.campaigns.findIndex(c => c.id === campaignId);
      if (campaignIndex !== -1) {
        state.campaigns[campaignIndex].executions.push(execution);
      }
      
      // Update in current campaign if it's the same
      if (state.currentCampaign?.id === campaignId) {
        state.currentCampaign.executions.push(execution);
      }
    });

    // Generate execution preview
    builder.addCase(generateExecutionPreview.fulfilled, (state, action) => {
      const { campaignId, executionId, preview } = action.payload;
      
      // Update campaign and execution
      if (state.currentCampaign?.id === campaignId) {
        const executionIndex = state.currentCampaign.executions.findIndex(e => e.id === executionId);
        if (executionIndex !== -1) {
          state.currentCampaign.executions[executionIndex].thumbnailUrl = preview.thumbnailUrl;
          state.currentCampaign.executions[executionIndex].renderUrl = preview.url;
        }
      }
    });

    // Start campaign render
    builder.addCase(startCampaignRender.fulfilled, (state, action) => {
      const { campaignId } = action.payload;
      
      // Update campaign status
      const campaignIndex = state.campaigns.findIndex(c => c.id === campaignId);
      if (campaignIndex !== -1) {
        state.campaigns[campaignIndex].status = 'rendering';
      }
      
      if (state.currentCampaign?.id === campaignId) {
        state.currentCampaign.status = 'rendering';
      }
    });
  },
});

export const { 
  setCampaignFilters, 
  clearCampaignFilters,
  setCurrentCampaign 
} = campaignsSlice.actions;

export default campaignsSlice.reducer;