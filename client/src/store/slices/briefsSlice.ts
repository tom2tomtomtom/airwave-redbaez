import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

// Interface definitions
export interface Brief {
  id: string;
  title: string;
  content: string;
  userId: string;
  organisationId?: string;
  status: string;
  analysis?: BriefAnalysis;
  tags?: string[];
  insights?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BriefAnalysis {
  targetAudience: string[];
  keyMessages: string[];
  toneOfVoice: string[];
  campaignObjectives: string[];
  insightsAndRecommendations: string;
  suggestedVisualDirection: string;
}

export interface BriefFilters {
  searchTerm?: string;
  status?: string[];
  tags?: string[];
  organisationId?: string;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface BriefsState {
  briefs: Brief[];
  currentBrief: Brief | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  generatedContent: {
    loading: boolean;
    error: string | null;
    content: string[];
    contentType: string | null;
  };
}

// Initial state
const initialState: BriefsState = {
  briefs: [],
  currentBrief: null,
  loading: false,
  error: null,
  totalCount: 0,
  generatedContent: {
    loading: false,
    error: null,
    content: [],
    contentType: null
  }
};

// Async thunks
export const fetchBriefs = createAsyncThunk(
  'briefs/fetchBriefs',
  async (filters: BriefFilters = {}, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/briefs?' + new URLSearchParams({
        ...(filters.searchTerm && { searchTerm: filters.searchTerm }),
        ...(filters.status && { status: filters.status.join(',') }),
        ...(filters.organisationId && { organisationId: filters.organisationId }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortDirection && { sortDirection: filters.sortDirection }),
        ...(filters.limit && { limit: filters.limit.toString() }),
        ...(filters.offset && { offset: filters.offset.toString() })
      }));
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch briefs');
      }
      
      const data = await response.json();
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch briefs');
    }
  }
);

export const fetchBriefById = createAsyncThunk(
  'briefs/fetchBriefById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/briefs/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch brief');
      }
      
      const data = await response.json();
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch brief');
    }
  }
);

export const createBrief = createAsyncThunk(
  'briefs/createBrief',
  async (briefData: Partial<Brief>, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/briefs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(briefData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to create brief');
      }
      
      const data = await response.json();
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create brief');
    }
  }
);

export const updateBrief = createAsyncThunk(
  'briefs/updateBrief',
  async ({ id, updates }: { id: string; updates: Partial<Brief> }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/briefs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to update brief');
      }
      
      const data = await response.json();
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update brief');
    }
  }
);

export const deleteBrief = createAsyncThunk(
  'briefs/deleteBrief',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/briefs/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to delete brief');
      }
      
      return id; // Return the id to remove it from state
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete brief');
    }
  }
);

export const analyzeBrief = createAsyncThunk(
  'briefs/analyzeBrief',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/briefs/${id}/analyze`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to analyse brief');
      }
      
      const data = await response.json();
      return { id, analysis: data.data };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to analyse brief');
    }
  }
);

export const generateContent = createAsyncThunk(
  'briefs/generateContent',
  async ({ 
    id, 
    contentType, 
    count, 
    toneOfVoice, 
    targetLength, 
    additionalInstructions 
  }: { 
    id: string; 
    contentType: 'copy' | 'headline' | 'tagline' | 'cta'; 
    count: number; 
    toneOfVoice?: string; 
    targetLength?: 'short' | 'medium' | 'long'; 
    additionalInstructions?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/briefs/${id}/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentType,
          count,
          toneOfVoice,
          targetLength,
          additionalInstructions
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to generate content');
      }
      
      const data = await response.json();
      return { 
        content: data.data, 
        contentType 
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to generate content');
    }
  }
);

// Create slice
const briefsSlice = createSlice({
  name: 'briefs',
  initialState,
  reducers: {
    clearCurrentBrief: (state) => {
      state.currentBrief = null;
    },
    clearGeneratedContent: (state) => {
      state.generatedContent = {
        loading: false,
        error: null,
        content: [],
        contentType: null
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch briefs
      .addCase(fetchBriefs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBriefs.fulfilled, (state, action: PayloadAction<{ briefs: Brief[]; total: number }>) => {
        state.loading = false;
        state.briefs = action.payload.briefs;
        state.totalCount = action.payload.total;
      })
      .addCase(fetchBriefs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch brief by id
      .addCase(fetchBriefById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBriefById.fulfilled, (state, action: PayloadAction<Brief>) => {
        state.loading = false;
        state.currentBrief = action.payload;
      })
      .addCase(fetchBriefById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create brief
      .addCase(createBrief.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBrief.fulfilled, (state, action: PayloadAction<Brief>) => {
        state.loading = false;
        state.briefs.unshift(action.payload);
        state.totalCount += 1;
        state.currentBrief = action.payload;
      })
      .addCase(createBrief.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update brief
      .addCase(updateBrief.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBrief.fulfilled, (state, action: PayloadAction<Brief>) => {
        state.loading = false;
        const index = state.briefs.findIndex(brief => brief.id === action.payload.id);
        if (index !== -1) {
          state.briefs[index] = action.payload;
        }
        if (state.currentBrief?.id === action.payload.id) {
          state.currentBrief = action.payload;
        }
      })
      .addCase(updateBrief.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete brief
      .addCase(deleteBrief.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBrief.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.briefs = state.briefs.filter(brief => brief.id !== action.payload);
        state.totalCount -= 1;
        if (state.currentBrief?.id === action.payload) {
          state.currentBrief = null;
        }
      })
      .addCase(deleteBrief.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Analyze brief
      .addCase(analyzeBrief.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(analyzeBrief.fulfilled, (state, action: PayloadAction<{ id: string; analysis: BriefAnalysis }>) => {
        state.loading = false;
        // Update in list
        const index = state.briefs.findIndex(brief => brief.id === action.payload.id);
        if (index !== -1) {
          state.briefs[index].analysis = action.payload.analysis;
        }
        // Update current brief if it's the one that was analysed
        if (state.currentBrief?.id === action.payload.id) {
          state.currentBrief.analysis = action.payload.analysis;
        }
      })
      .addCase(analyzeBrief.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Generate content
      .addCase(generateContent.pending, (state) => {
        state.generatedContent.loading = true;
        state.generatedContent.error = null;
      })
      .addCase(generateContent.fulfilled, (state, action: PayloadAction<{ content: string[]; contentType: string }>) => {
        state.generatedContent.loading = false;
        state.generatedContent.content = action.payload.content;
        state.generatedContent.contentType = action.payload.contentType;
      })
      .addCase(generateContent.rejected, (state, action) => {
        state.generatedContent.loading = false;
        state.generatedContent.error = action.payload as string;
      });
  }
});

// Export actions and reducer
export const { clearCurrentBrief, clearGeneratedContent } = briefsSlice.actions;

// Selectors
export const selectAllBriefs = (state: RootState) => state.briefs?.briefs ?? [];
export const selectCurrentBrief = (state: RootState) => state.briefs?.currentBrief ?? null;
export const selectBriefsLoading = (state: RootState) => state.briefs?.loading ?? false;
export const selectBriefsError = (state: RootState) => state.briefs?.error ?? null;
export const selectBriefsTotalCount = (state: RootState) => state.briefs?.totalCount ?? 0;
export const selectGeneratedContent = (state: RootState) => state.briefs?.generatedContent ?? {
  loading: false,
  error: null,
  content: [],
  contentType: null
};

export default briefsSlice.reducer;
