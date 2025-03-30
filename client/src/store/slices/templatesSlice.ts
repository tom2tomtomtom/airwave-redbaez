import { createSlice, createAsyncThunk, PayloadAction, createEntityAdapter, EntityState } from '@reduxjs/toolkit';
import axios from 'axios';
import { Template, TemplateFilters } from '../../types/templates';
import { supabase } from '../../lib/supabase';
import { RootState } from '../index';

// Create entity adapter
const templateAdapter = createEntityAdapter<Template>();

// Define state using EntityState
interface TemplatesState extends EntityState<Template> {
  loading: boolean;
  error: string | null;
  currentTemplate: Template | null;
  filters: TemplateFilters;
}

// Define initial state using the adapter
const initialState: TemplatesState = templateAdapter.getInitialState({
  loading: false,
  error: null,
  currentTemplate: null,
  filters: {
    search: '',
    format: 'all',
    platform: 'all',
    favorites: false,
  },
});

// Helper function to get the current Supabase token
const getAuthToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || localStorage.getItem('airwave_auth_token');
};

// Async thunks
export const fetchTemplates = createAsyncThunk(
  'templates/fetchTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get('/api/templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch templates');
    }
  }
);

export const fetchTemplateById = createAsyncThunk(
  'templates/fetchTemplateById',
  async (templateId: string, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get(`/api/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch template');
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  'templates/deleteTemplate',
  async (templateId: string, { rejectWithValue }) => {
    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await axios.delete(`/api/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return templateId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete template');
    }
  }
);

export const toggleFavoriteTemplate = createAsyncThunk(
  'templates/toggleFavorite',
  async (templateId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { templates: TemplatesState };
      const template = state.templates.entities[templateId];
      
      if (!template) {
        return rejectWithValue('Template not found');
      }
      
      const isFavorite = !template.isFavorite;
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.put(`/api/templates/${templateId}/favorite`, { isFavorite }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle favorite');
    }
  }
);

// Slice definition
const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    setTemplateFilters: (state, action: PayloadAction<Partial<TemplateFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearTemplateFilters: (state) => {
      state.filters = { ...initialState.filters }; // Reset to initial filters
    },
    setCurrentTemplate: (state, action: PayloadAction<Template | null>) => {
      state.currentTemplate = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch templates
    builder.addCase(fetchTemplates.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTemplates.fulfilled, (state, action: PayloadAction<Template[]>) => {
      templateAdapter.setAll(state, action.payload); // Use adapter's setAll
      state.loading = false;
    });
    builder.addCase(fetchTemplates.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch template by ID
    builder.addCase(fetchTemplateById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTemplateById.fulfilled, (state, action: PayloadAction<Template>) => {
      templateAdapter.upsertOne(state, action.payload); // Use adapter's upsertOne
      state.currentTemplate = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchTemplateById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Toggle favorite
    builder.addCase(toggleFavoriteTemplate.fulfilled, (state, action: PayloadAction<Template>) => {
      // Update using adapter's updateOne or upsertOne if the full object is returned
      templateAdapter.updateOne(state, { id: action.payload.id, changes: { isFavorite: action.payload.isFavorite } }); 
      if (state.currentTemplate?.id === action.payload.id) {
        state.currentTemplate = { ...state.currentTemplate, ...action.payload };
      }
    });
    builder.addCase(toggleFavoriteTemplate.rejected, (state, action) => {
      // Handle potential error display if needed
      state.error = action.payload as string;
    });

    // Delete template
    builder.addCase(deleteTemplate.pending, (state) => {
      // Optional: handle intermediate state if needed
    });
    builder.addCase(deleteTemplate.fulfilled, (state, action: PayloadAction<string>) => {
      templateAdapter.removeOne(state, action.payload); // Use adapter's removeOne
      if (state.currentTemplate?.id === action.payload) {
        state.currentTemplate = null;
      }
      state.loading = false; // Ensure loading is set to false
    });
    builder.addCase(deleteTemplate.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { 
  setTemplateFilters, 
  clearTemplateFilters, 
  setCurrentTemplate 
} = templatesSlice.actions;

// Export adapter selectors
export const { 
  selectAll: selectAllTemplates, 
  selectById: selectTemplateById, 
  selectIds: selectTemplateIds 
} = templateAdapter.getSelectors((state: RootState) => state.templates);

export default templatesSlice.reducer;