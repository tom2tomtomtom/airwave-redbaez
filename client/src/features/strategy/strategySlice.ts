import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { strategyApi } from '../../api/strategyApi';
import type {
  BriefAnalysisRequest,
  BriefAnalysisResponse,
  CopyGenerationRequest,
  CopyGenerationResponse,
  Motivation,
  CopyVariation,
} from '../../types/api';

interface StrategyState {
  motivations: Motivation[];
  selectedMotivationIds: string[];
  copyVariations: CopyVariation[];
  selectedVariationIds: string[];
  analysis: {
    targetAudienceAlignment: number;
    objectiveAlignment: number;
    brandVoiceConsistency: number;
  } | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: StrategyState = {
  motivations: [],
  selectedMotivationIds: [],
  copyVariations: [],
  selectedVariationIds: [],
  analysis: null,
  status: 'idle',
  error: null,
};

export const analyseBrief = createAsyncThunk<
  BriefAnalysisResponse,
  BriefAnalysisRequest,
  { rejectValue: string }
>('strategy/analyseBrief', async (request, { rejectWithValue }) => {
  try {
    return await strategyApi.analyseBrief(request);
  } catch (error) {
    return rejectWithValue((error as Error).message);
  }
});

export const regenerateMotivations = createAsyncThunk<
  BriefAnalysisResponse,
  { briefId: string; feedback?: string },
  { rejectValue: string }
>('strategy/regenerateMotivations', async ({ briefId, feedback }, { rejectWithValue }) => {
  try {
    return await strategyApi.regenerateMotivations(briefId, feedback);
  } catch (error) {
    return rejectWithValue((error as Error).message);
  }
});

export const generateCopyVariations = createAsyncThunk<
  CopyGenerationResponse,
  CopyGenerationRequest,
  { rejectValue: string }
>('strategy/generateCopyVariations', async (request, { rejectWithValue }) => {
  try {
    return await strategyApi.generateCopyVariations(request);
  } catch (error) {
    return rejectWithValue((error as Error).message);
  }
});

export const saveCopyVariations = createAsyncThunk<
  void,
  { briefId: string; selectedVariationIds: string[] },
  { rejectValue: string }
>('strategy/saveCopyVariations', async ({ briefId, selectedVariationIds }, { rejectWithValue }) => {
  try {
    await strategyApi.saveCopyVariations(briefId, selectedVariationIds);
  } catch (error) {
    return rejectWithValue((error as Error).message);
  }
});

const strategySlice = createSlice({
  name: 'strategy',
  initialState,
  reducers: {
    toggleMotivationSelection: (state, action: PayloadAction<string>) => {
      const motivationId = action.payload;
      const index = state.selectedMotivationIds.indexOf(motivationId);
      
      if (index === -1) {
        state.selectedMotivationIds.push(motivationId);
      } else {
        state.selectedMotivationIds.splice(index, 1);
      }
    },
    toggleVariationSelection: (state, action: PayloadAction<string>) => {
      const variationId = action.payload;
      const index = state.selectedVariationIds.indexOf(variationId);
      
      if (index === -1) {
        state.selectedVariationIds.push(variationId);
      } else {
        state.selectedVariationIds.splice(index, 1);
      }
    },
    clearStrategy: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyseBrief.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(analyseBrief.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.motivations = action.payload.motivations;
        state.error = null;
      })
      .addCase(analyseBrief.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to analyse brief';
      })
      .addCase(regenerateMotivations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(regenerateMotivations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.motivations = action.payload.motivations;
        state.error = null;
      })
      .addCase(regenerateMotivations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to regenerate motivations';
      })
      .addCase(generateCopyVariations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(generateCopyVariations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.copyVariations = action.payload.variations;
        state.analysis = action.payload.analysis;
        state.error = null;
      })
      .addCase(generateCopyVariations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to generate copy variations';
      })
      .addCase(saveCopyVariations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(saveCopyVariations.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(saveCopyVariations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to save copy variations';
      });
  },
});

export const {
  toggleMotivationSelection,
  toggleVariationSelection,
  clearStrategy,
} = strategySlice.actions;

export default strategySlice.reducer;
