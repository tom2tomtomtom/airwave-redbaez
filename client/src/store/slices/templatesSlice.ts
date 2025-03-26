import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { Template, TemplateFilters } from '../../types/templates';
import { supabase } from '../../lib/supabase';

interface TemplatesState {
  templates: Template[];
  loading: boolean;
  error: string | null;
  currentTemplate: Template | null;
  filters: TemplateFilters;
}

const initialState: TemplatesState = {
  templates: [],
  loading: false,
  error: null,
  currentTemplate: null,
  filters: {
    search: '',
    format: 'all',
    platform: 'all',
    favorites: false,
  },
};

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
      const template = state.templates.templates.find(t => t.id === templateId);
      
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

// Slice
const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    setTemplateFilters: (state, action: PayloadAction<TemplateFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearTemplateFilters: (state) => {
      state.filters = { search: '', format: 'all', platform: 'all', favorites: false };
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
      state.templates = action.payload;
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
      state.currentTemplate = action.payload;
      // Also update in templates array if exists
      const index = state.templates.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.templates[index] = action.payload;
      } else {
        state.templates.push(action.payload);
      }
      state.loading = false;
    });
    builder.addCase(fetchTemplateById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Toggle favorite
    builder.addCase(toggleFavoriteTemplate.fulfilled, (state, action: PayloadAction<Template>) => {
      const index = state.templates.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.templates[index] = action.payload;
      }
      if (state.currentTemplate?.id === action.payload.id) {
        state.currentTemplate = action.payload;
      }
    });
    
    // Delete template
    builder.addCase(deleteTemplate.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteTemplate.fulfilled, (state, action: PayloadAction<string>) => {
      state.templates = state.templates.filter(t => t.id !== action.payload);
      if (state.currentTemplate?.id === action.payload) {
        state.currentTemplate = null;
      }
      state.loading = false;
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

export default templatesSlice.reducer;