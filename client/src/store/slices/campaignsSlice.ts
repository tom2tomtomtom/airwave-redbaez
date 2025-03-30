import { 
  createSlice, 
  createAsyncThunk, 
  PayloadAction,
  createEntityAdapter, 
  EntityState 
} from '@reduxjs/toolkit';
import axios from 'axios';
import { createSelector } from '@reduxjs/toolkit'; 
import { Campaign, CampaignFormData, CampaignFilters, Execution } from '../../types/campaigns';
import { supabase } from '../../lib/supabase';
import { RootState } from '..'; 

interface CampaignsState extends EntityState<Campaign> {
  loading: boolean;
  error: string | null;
  currentCampaignId: string | null;
  filters: CampaignFilters;
}

const campaignsAdapter = createEntityAdapter<Campaign>({ });

const initialState: CampaignsState = campaignsAdapter.getInitialState({
  loading: false,
  error: null,
  currentCampaignId: null,
  filters: {
    search: '',
    status: 'all',
  },
});

const getAuthToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || localStorage.getItem('airwave_auth_token'); 
};

export const fetchCampaigns = createAsyncThunk<Campaign[], string | undefined>(
  'campaigns/fetchCampaigns',
  async (clientId, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const response = await axios.get('/api/campaigns', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: clientId ? { clientId } : undefined
      });
      return response.data as Campaign[]; 
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch campaigns');
    }
  }
);

export const fetchCampaignById = createAsyncThunk<Campaign, string>(
  'campaigns/fetchCampaignById',
  async (campaignId: string, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const response = await axios.get(`/api/campaigns/${campaignId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data as Campaign;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch campaign');
    }
  }
);

export const createCampaign = createAsyncThunk<Campaign, CampaignFormData>(
  'campaigns/createCampaign',
  async (campaignData: CampaignFormData, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const response = await axios.post('/api/campaigns', campaignData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data as Campaign;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create campaign');
    }
  }
);

export const updateCampaign = createAsyncThunk<Campaign, { id: string; data: Partial<CampaignFormData> }>(
  'campaigns/updateCampaign',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const response = await axios.put(`/api/campaigns/${id}`, data, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data as Campaign;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update campaign');
    }
  }
);

export const deleteCampaign = createAsyncThunk<string, string>(
  'campaigns/deleteCampaign',
  async (campaignId: string, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      await axios.delete(`/api/campaigns/${campaignId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return campaignId; 
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete campaign');
    }
  }
);

export const addExecutionToCampaign = createAsyncThunk<
  { campaignId: string; execution: Execution }, 
  { campaignId: string; execution: Execution }, 
  { state: RootState } 
>(
  'campaigns/addExecution',
  async ({ campaignId, execution }, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const response = await axios.post(`/api/campaigns/${campaignId}/executions`, execution, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return { campaignId, execution: response.data as Execution }; 
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add execution');
    }
  }
);

export const generateExecutionPreview = createAsyncThunk<
  { campaignId: string; executionId: string; preview: any }, 
  { campaignId: string; executionId: string },
  { state: RootState }
>(
  'campaigns/generatePreview',
  async ({ campaignId, executionId }, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const response = await axios.post(`/api/creatomate/preview`, 
        { campaignId, executionId }, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      return { campaignId, executionId, preview: response.data }; 
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate preview');
    }
  }
);

export const startCampaignRender = createAsyncThunk<
  { campaignId: string; renderData: any }, 
  string, 
  { state: RootState }
>(
  'campaigns/startRender',
  async (campaignId, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const response = await axios.post(`/api/campaigns/${campaignId}/render`, null, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return { campaignId, renderData: response.data }; 
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start render');
    }
  }
);

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    setCampaignFilters(state, action: PayloadAction<Partial<CampaignFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCampaignFilters(state) {
      state.filters = initialState.filters; 
    },
    setCurrentCampaignId(state, action: PayloadAction<string | null>) {
      state.currentCampaignId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCampaigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action: PayloadAction<Campaign[]>) => {
        campaignsAdapter.setAll(state, action.payload); 
        state.loading = false;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch campaigns';
      })
      .addCase(fetchCampaignById.pending, (state) => {
        state.loading = true; 
        state.error = null;
      })
      .addCase(fetchCampaignById.fulfilled, (state, action: PayloadAction<Campaign>) => {
        campaignsAdapter.upsertOne(state, action.payload); 
        state.currentCampaignId = action.payload.id; 
        state.loading = false;
      })
      .addCase(fetchCampaignById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch campaign';
      })
      .addCase(createCampaign.pending, (state) => {
        state.loading = true; 
        state.error = null;
      })
      .addCase(createCampaign.fulfilled, (state, action: PayloadAction<Campaign>) => {
        campaignsAdapter.addOne(state, action.payload); 
        state.loading = false;
      })
      .addCase(createCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to create campaign';
      })
      .addCase(updateCampaign.pending, (state) => {
        state.loading = true; 
        state.error = null;
      })
      .addCase(updateCampaign.fulfilled, (state, action: PayloadAction<Campaign>) => {
        campaignsAdapter.upsertOne(state, action.payload); 
        if (state.currentCampaignId === action.payload.id) {
        }
        state.loading = false;
      })
      .addCase(updateCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update campaign';
      })
      .addCase(deleteCampaign.pending, (state) => {
        state.loading = true; 
        state.error = null;
      })
      .addCase(deleteCampaign.fulfilled, (state, action: PayloadAction<string>) => {
        campaignsAdapter.removeOne(state, action.payload); 
        if (state.currentCampaignId === action.payload) {
          state.currentCampaignId = null; 
        }
        state.loading = false;
      })
      .addCase(deleteCampaign.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to delete campaign';
      })
      .addCase(addExecutionToCampaign.fulfilled, (state, action) => {
        const { campaignId, execution } = action.payload;
        const campaign = state.entities[campaignId];
        if (campaign) {
          const existingExecutions = campaign.executions || []; 
          campaignsAdapter.updateOne(state, {
            id: campaignId,
            changes: { executions: [...existingExecutions, execution] }, 
          });
        }
      })
      .addCase(generateExecutionPreview.fulfilled, (state, action) => {
        const { campaignId, executionId, preview } = action.payload;
        const campaign = state.entities[campaignId];
        if (campaign && campaign.executions) {
          const executionIndex = campaign.executions.findIndex(ex => ex.id === executionId);
          if (executionIndex !== -1) {
            const updatedExecution = { 
              ...campaign.executions[executionIndex], 
              previewUrl: preview.url 
            };
            const updatedExecutions = [...campaign.executions];
            updatedExecutions[executionIndex] = updatedExecution;
            
            campaignsAdapter.updateOne(state, {
              id: campaignId,
              changes: { executions: updatedExecutions },
            });
          }
        }
      })
      .addCase(startCampaignRender.fulfilled, (state, action) => {
        const { campaignId, renderData } = action.payload;
        campaignsAdapter.updateOne(state, {
          id: campaignId,
          changes: { 
            status: 'rendering', 
          },
        });
      });
  },
});

export const { 
  setCampaignFilters, 
  clearCampaignFilters,
  setCurrentCampaignId 
} = campaignsSlice.actions;

const campaignsSelectors = campaignsAdapter.getSelectors<RootState>(
  (state) => state.campaigns 
);

export const selectAllCampaigns = campaignsSelectors.selectAll;
export const selectCampaignEntities = campaignsSelectors.selectEntities;
export const selectCampaignIds = campaignsSelectors.selectIds;
export const selectTotalCampaigns = campaignsSelectors.selectTotal;

export const selectCampaignById = campaignsSelectors.selectById; 

export const selectCurrentCampaignId = (state: RootState): string | null => state.campaigns.currentCampaignId;

export const selectCampaignFilters = (state: RootState): CampaignFilters => state.campaigns.filters;

export const selectCampaignsLoading = (state: RootState): boolean => state.campaigns.loading;

export const selectCampaignsError = (state: RootState): string | null => state.campaigns.error;

export const selectCurrentCampaign = createSelector(
  [selectCampaignEntities, selectCurrentCampaignId], 
  (entities, currentId) => (currentId ? entities[currentId] : null) 
);

export const selectFilteredCampaigns = createSelector(
  [selectAllCampaigns, selectCampaignFilters], 
  (campaigns, filters) => { 
    const { search, status } = filters;
    if (!search && status === 'all') {
      return campaigns; 
    }
    return campaigns.filter(campaign => {
      const searchMatch = search 
        ? campaign.name.toLowerCase().includes(search.toLowerCase()) 
        : true;
      const statusMatch = status !== 'all' ? campaign.status === status : true;
      return searchMatch && statusMatch;
    });
  }
);

export const selectActiveCampaigns = createSelector(
  [selectAllCampaigns],
  (campaigns) => campaigns.filter(c => c.status === 'active') 
);

export const selectCampaignsByClientId = createSelector(
  [selectAllCampaigns, (state: RootState, clientId: string | null) => clientId], 
  (campaigns, clientId) => {
    if (!clientId) return campaigns; 
    return campaigns.filter(c => c.client === clientId); 
  }
);

export default campaignsSlice.reducer;