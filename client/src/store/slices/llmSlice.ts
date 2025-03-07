import { createSlice, createAsyncThunk, PayloadAction, SerializedError } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/api';

// Types for motivation and brief data
export interface Motivation {
  id: string;
  title: string;
  description: string;
  explanation: string;
  selected: boolean;
}

export interface BriefData {
  clientName: string;
  projectName: string;
  productDescription: string;
  targetAudience: string;
  competitiveContext: string;
  campaignObjectives: string;
  keyMessages: string;
  mandatories: string;
  additionalInfo?: string;
  tonePreference?: string;
}

export interface CopyVariation {
  id: string;
  frames: string[];
  callToAction?: string;
  tone: string;
  style: string;
  selected: boolean;
}

export type CopyLength = 'short' | 'medium' | 'long';

export interface CopyGenerationRequest {
  motivationIds: string[];
  tone: string;
  style: string;
  frameCount: number;
  length: CopyLength;
  includeCallToAction: boolean;
  callToActionText?: string;
}

interface LoadingState {
  processingBrief: boolean;
  regeneratingMotivations: boolean;
  generatingCopy: boolean;
}

interface ErrorState {
  processBrief: string | null;
  regenerateMotivations: string | null;
  generateCopy: string | null;
}

interface LLMState {
  brief: BriefData | null;
  motivations: Motivation[];
  copyVariations: CopyVariation[];
  selectedCopyVariation: CopyVariation | null;
  selectedMotivations: Motivation[];
  loading: LoadingState;
  error: ErrorState;
}

const initialState: LLMState = {
  brief: null,
  motivations: [],
  copyVariations: [],
  selectedCopyVariation: null,
  selectedMotivations: [],
  loading: {
    processingBrief: false,
    regeneratingMotivations: false,
    generatingCopy: false,
  },
  error: {
    processBrief: null,
    regenerateMotivations: null,
    generateCopy: null,
  }
};

/**
 * Process a client brief to generate motivations
 */
export const processBrief = createAsyncThunk<
  { brief: BriefData; motivations: Motivation[] },
  BriefData,
  { rejectValue: string }
>(
  'llm/processBrief',
  async (briefData, { rejectWithValue }) => {
    try {
      const response = await apiClient.llm.parseBrief(briefData);
      return { 
        brief: briefData, 
        motivations: response.data.data.motivations 
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to process brief'
      );
    }
  }
);

/**
 * Regenerate motivations based on user feedback
 */
export const regenerateMotivations = createAsyncThunk<
  Motivation[],
  { briefData: BriefData; feedback: string },
  { rejectValue: string }
>(
  'llm/regenerateMotivations',
  async ({ briefData, feedback }, { rejectWithValue }) => {
    try {
      const response = await apiClient.llm.regenerateMotivations(briefData, feedback);
      return response.data.data.motivations;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to regenerate motivations'
      );
    }
  }
);

/**
 * Generate copy based on selected motivations
 */
export const generateCopy = createAsyncThunk<
  CopyVariation[],
  { 
    copyRequest: CopyGenerationRequest; 
    briefData: BriefData;
    motivations: Motivation[] 
  },
  { rejectValue: string }
>(
  'llm/generateCopy',
  async ({ copyRequest, briefData, motivations }, { rejectWithValue }) => {
    try {
      const response = await apiClient.llm.generateCopy(
        copyRequest, 
        briefData, 
        motivations
      );
      return response.data.data.copyVariations;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to generate copy'
      );
    }
  }
);

const llmSlice = createSlice({
  name: 'llm',
  initialState,
  reducers: {
    /**
     * Toggle the selection state of a motivation
     */
    toggleMotivationSelection: (state, action: PayloadAction<string>) => {
      const motivationId = action.payload;
      const index = state.motivations.findIndex(m => m.id === motivationId);
      
      if (index !== -1) {
        // Toggle the selected state
        state.motivations[index].selected = !state.motivations[index].selected;
        
        // Update the selectedMotivations array
        if (state.motivations[index].selected) {
          state.selectedMotivations.push(state.motivations[index]);
        } else {
          state.selectedMotivations = state.selectedMotivations.filter(
            m => m.id !== motivationId
          );
        }
      }
    },
    
    /**
     * Select a specific copy variation
     */
    selectCopyVariation: (state, action: PayloadAction<string>) => {
      const variationId = action.payload;
      
      // Deselect all variations
      state.copyVariations.forEach(variation => {
        variation.selected = false;
      });
      
      // Select the specified variation
      const selectedVariation = state.copyVariations.find(v => v.id === variationId);
      if (selectedVariation) {
        selectedVariation.selected = true;
        state.selectedCopyVariation = selectedVariation;
      }
    },
    
    /**
     * Reset the entire LLM state
     */
    resetLLMState: () => initialState,
    
    /**
     * Reset only copy variations without affecting motivations or brief
     */
    resetCopyVariations: (state) => {
      state.copyVariations = [];
      state.selectedCopyVariation = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Process Brief
      .addCase(processBrief.pending, (state) => {
        state.loading.processingBrief = true;
        state.error.processBrief = null;
      })
      .addCase(processBrief.fulfilled, (state, { payload }) => {
        state.loading.processingBrief = false;
        state.brief = payload.brief;
        state.motivations = payload.motivations;
        state.selectedMotivations = payload.motivations.filter(m => m.selected);
      })
      .addCase(processBrief.rejected, (state, { payload }) => {
        state.loading.processingBrief = false;
        state.error.processBrief = payload || 'Unknown error';
      })
      
      // Regenerate Motivations
      .addCase(regenerateMotivations.pending, (state) => {
        state.loading.regeneratingMotivations = true;
        state.error.regenerateMotivations = null;
      })
      .addCase(regenerateMotivations.fulfilled, (state, { payload }) => {
        state.loading.regeneratingMotivations = false;
        state.motivations = payload;
        state.selectedMotivations = payload.filter(m => m.selected);
      })
      .addCase(regenerateMotivations.rejected, (state, { payload }) => {
        state.loading.regeneratingMotivations = false;
        state.error.regenerateMotivations = payload || 'Unknown error';
      })
      
      // Generate Copy
      .addCase(generateCopy.pending, (state) => {
        state.loading.generatingCopy = true;
        state.error.generateCopy = null;
      })
      .addCase(generateCopy.fulfilled, (state, { payload }) => {
        state.loading.generatingCopy = false;
        state.copyVariations = payload;
        
        // Select the first variation by default if any variations were returned
        if (payload.length > 0) {
          const firstVariation = payload[0];
          firstVariation.selected = true;
          state.selectedCopyVariation = firstVariation;
        }
      })
      .addCase(generateCopy.rejected, (state, { payload }) => {
        state.loading.generatingCopy = false;
        state.error.generateCopy = payload || 'Unknown error';
      });
  }
});

export const { 
  toggleMotivationSelection, 
  selectCopyVariation, 
  resetLLMState,
  resetCopyVariations
} = llmSlice.actions;

export default llmSlice.reducer;