import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import CopyGenerationMediator from '../../services/copyGeneration/CopyGenerationMediator';
import { 
  MarketingStrategy,
  CopyGenerationConfig,
  CopyVariation,
  CopyGenerationRequest,
  StrategyAnalysis,
  CopyRefinementRequest,
  CopyGenerationState,
  ToneOption,
  StyleOption
} from '../../services/copyGeneration/types';

// Initial state
const initialState: CopyGenerationState = {
  strategy: null,
  strategyAnalysis: null,
  generationConfig: null,
  variations: [],
  selectedVariationId: null,
  versionHistory: {},
  status: 'idle',
  error: null,
  activeStep: 0
};

// Async thunks
export const analyzeStrategy = createAsyncThunk(
  'copyGeneration/analyzeStrategy',
  async (strategy: MarketingStrategy, { rejectWithValue }) => {
    try {
      return await CopyGenerationMediator.analyzeStrategy(strategy);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const generateCopy = createAsyncThunk(
  'copyGeneration/generateCopy',
  async (request: CopyGenerationRequest, { rejectWithValue }) => {
    try {
      return await CopyGenerationMediator.generateCopy(request);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const refineCopy = createAsyncThunk(
  'copyGeneration/refineCopy',
  async (request: CopyRefinementRequest, { rejectWithValue }) => {
    try {
      return await CopyGenerationMediator.refineCopy(request);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Copy generation slice
const copyGenerationSlice = createSlice({
  name: 'copyGeneration',
  initialState,
  reducers: {
    setStrategy: (state, action: PayloadAction<MarketingStrategy>) => {
      state.strategy = action.payload;
      // Reset related state when strategy changes
      state.strategyAnalysis = null;
      state.status = 'idle';
    },
    
    setGenerationConfig: (state, action: PayloadAction<CopyGenerationConfig>) => {
      state.generationConfig = action.payload;
    },
    
    selectVariation: (state, action: PayloadAction<string>) => {
      state.selectedVariationId = action.payload;
    },
    
    updateVariation: (state, action: PayloadAction<CopyVariation>) => {
      const index = state.variations.findIndex(v => v.id === action.payload.id);
      
      if (index >= 0) {
        // Create new version in history
        const variation = state.variations[index];
        const variationId = variation.id;
        
        if (!state.versionHistory[variationId]) {
          state.versionHistory[variationId] = [];
        }
        
        // Add previous version to history
        state.versionHistory[variationId].push({...variation});
        
        // Update variation with new data
        state.variations[index] = {
          ...action.payload,
          version: variation.version + 1,
          modifiedAt: new Date()
        };
      }
    },
    
    createVariation: (state, action: PayloadAction<Omit<CopyVariation, 'id' | 'version' | 'createdAt' | 'modifiedAt' | 'status'>>) => {
      const now = new Date();
      const newVariation: CopyVariation = {
        ...action.payload,
        id: uuidv4(),
        version: 1,
        createdAt: now,
        modifiedAt: now,
        status: 'draft'
      };
      
      state.variations.push(newVariation);
    },
    
    deleteVariation: (state, action: PayloadAction<string>) => {
      const variationId = action.payload;
      state.variations = state.variations.filter(v => v.id !== variationId);
      
      // If the deleted variation was selected, deselect it
      if (state.selectedVariationId === variationId) {
        state.selectedVariationId = null;
      }
    },
    
    updateVariationStatus: (state, action: PayloadAction<{ id: string; status: CopyVariation['status'] }>) => {
      const { id, status } = action.payload;
      const index = state.variations.findIndex(v => v.id === id);
      
      if (index >= 0) {
        state.variations[index].status = status;
        state.variations[index].modifiedAt = new Date();
      }
    },
    
    resetState: () => initialState,
    
    setActiveStep: (state, action: PayloadAction<number>) => {
      state.activeStep = action.payload;
    },
    
    nextStep: (state) => {
      state.activeStep += 1;
    },
    
    prevStep: (state) => {
      if (state.activeStep > 0) {
        state.activeStep -= 1;
      }
    }
  },
  extraReducers: (builder) => {
    // Handle analyzeStrategy
    builder
      .addCase(analyzeStrategy.pending, (state) => {
        state.status = 'analyzing';
        state.error = null;
      })
      .addCase(analyzeStrategy.fulfilled, (state, action) => {
        state.strategyAnalysis = action.payload;
        state.status = 'idle';
      })
      .addCase(analyzeStrategy.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      });
    
    // Handle generateCopy
    builder
      .addCase(generateCopy.pending, (state) => {
        state.status = 'generating';
        state.error = null;
      })
      .addCase(generateCopy.fulfilled, (state, action) => {
        state.variations = action.payload.variations;
        state.status = 'idle';
        
        // Initialize version history
        action.payload.variations.forEach(variation => {
          if (!state.versionHistory[variation.id]) {
            state.versionHistory[variation.id] = [];
          }
        });
        
        // Select first variation if none is selected
        if (!state.selectedVariationId && action.payload.variations.length > 0) {
          state.selectedVariationId = action.payload.variations[0].id;
        }
      })
      .addCase(generateCopy.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      });
    
    // Handle refineCopy
    builder
      .addCase(refineCopy.pending, (state) => {
        state.status = 'refining';
        state.error = null;
      })
      .addCase(refineCopy.fulfilled, (state, action) => {
        const refinedVariation = action.payload;
        
        // Add previous version to history
        const originalId = refinedVariation.id.split('-v')[0]; // Extract base ID without version
        
        if (!state.versionHistory[originalId]) {
          state.versionHistory[originalId] = [];
        }
        
        // Find the original variation
        const originalIndex = state.variations.findIndex(v => v.id === originalId);
        
        if (originalIndex >= 0) {
          // Add original to history
          state.versionHistory[originalId].push({...state.variations[originalIndex]});
          
          // Replace with refined version
          state.variations[originalIndex] = refinedVariation;
          
          // Keep the selection on the refined variation
          state.selectedVariationId = refinedVariation.id;
        } else {
          // If original not found, add as new variation
          state.variations.push(refinedVariation);
          state.selectedVariationId = refinedVariation.id;
        }
        
        state.status = 'idle';
      })
      .addCase(refineCopy.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      });
  }
});

// Export actions and reducer
export const {
  setStrategy,
  setGenerationConfig,
  selectVariation,
  updateVariation,
  createVariation,
  deleteVariation,
  updateVariationStatus,
  resetState,
  setActiveStep,
  nextStep,
  prevStep
} = copyGenerationSlice.actions;

export default copyGenerationSlice.reducer;
