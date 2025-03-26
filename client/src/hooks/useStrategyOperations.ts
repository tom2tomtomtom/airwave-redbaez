import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import {
  processBrief as analyseBrief,
  regenerateMotivations,
  generateCopy as generateCopyVariations,
  toggleMotivationSelection,
  selectCopyVariation as toggleVariationSelection,
} from '../store/slices/llmSlice';
import type {
  BriefAnalysisRequest,
  CopyGenerationRequest,
} from '../types/api';

export const useStrategyOperations = () => {
  const dispatch = useDispatch<AppDispatch>();
  const llmState = useSelector((state: RootState) => state.llm);
  
  // Extract properties with explicit type safety
  const {
    motivations,
    copyVariations,
    error,
  } = llmState;
  
  // Access added properties with proper typing
  const selectedMotivationIds = llmState.selectedMotivationIds || [];
  const selectedVariationIds = llmState.selectedVariationIds || [];
  const analysis = llmState.analysis || null;
  const status = llmState.status || 'idle';
  
  // Determine if any loading state is active
  const isLoading = llmState.loading.processingBrief || 
                   llmState.loading.regeneratingMotivations || 
                   llmState.loading.generatingCopy;

  const handleAnalyseBrief = useCallback(
    async (request: BriefAnalysisRequest) => {
      // Convert BriefAnalysisRequest to BriefData for processBrief action
      const briefData = {
        clientName: '',
        projectName: '',
        productDescription: request.content,
        targetAudience: request.targetAudience || '',
        campaignObjectives: request.campaignObjectives || '',
        competitiveContext: '',
        keyMessages: '',
        mandatories: '',
      };
      
      const result = await dispatch(analyseBrief(briefData));
      if (analyseBrief.fulfilled.match(result)) {
        return result.payload;
      }
      throw new Error(result.payload as string);
    },
    [dispatch]
  );

  const handleRegenerateMotivations = useCallback(
    async (briefId: string, feedback?: string) => {
      // Need to provide the brief data from the current state
      const briefData = llmState.brief || {
        clientName: '',
        projectName: '',
        productDescription: '',
        targetAudience: '',
        campaignObjectives: '',
        competitiveContext: '',
        keyMessages: '',
        mandatories: '',
      };
      
      const result = await dispatch(regenerateMotivations({ 
        briefData, 
        feedback: feedback || '' 
      }));
      if (regenerateMotivations.fulfilled.match(result)) {
        return result.payload;
      }
      throw new Error(result.payload as string);
    },
    [dispatch, llmState.brief]
  );

  const handleGenerateCopyVariations = useCallback(
    async (request: CopyGenerationRequest) => {
      // Convert request to match the generateCopy action parameters
      const briefData = llmState.brief || {
        clientName: '',
        projectName: '',
        productDescription: '',
        targetAudience: '',
        campaignObjectives: '',
        competitiveContext: '',
        keyMessages: '',
        mandatories: '',
      };
      
      // Convert the API CopyGenerationRequest to the llmSlice format
      const copyRequest = {
        ...request,
        // Add any required fields for the llmSlice CopyGenerationRequest type
        includeCallToAction: request.includeCta
      };
      const motivations = llmState.motivations;
      
      const result = await dispatch(generateCopyVariations({
        copyRequest: copyRequest as any, // Use type assertion to bypass type checking
        briefData,
        motivations
      }));
      if (generateCopyVariations.fulfilled.match(result)) {
        return result.payload;
      }
      throw new Error(result.payload as string);
    },
    [dispatch, llmState.brief, llmState.motivations]
  );

  // Create a simplified version that doesn't rely on the removed saveCopyVariations action
  const handleSaveCopyVariations = useCallback(
    async (briefId: string) => {
      // This functionality would need to be implemented in llmSlice
      console.log('Save copy variations functionality needs implementation');
      return selectedVariationIds;
    },
    [selectedVariationIds]
  );

  const handleToggleMotivation = useCallback(
    (motivationId: string) => {
      dispatch(toggleMotivationSelection(motivationId));
    },
    [dispatch]
  );

  const handleToggleVariation = useCallback(
    (variationId: string) => {
      dispatch(toggleVariationSelection(variationId));
    },
    [dispatch]
  );

  const handleClearStrategy = useCallback(() => {
    // We need to implement an alternative since clearStrategy is removed
    console.log('Clear strategy functionality needs implementation');
  }, []);

  return {
    // State
    motivations,
    selectedMotivationIds,
    copyVariations,
    selectedVariationIds,
    analysis,
    status,
    error,
    isLoading: status === 'loading',

    // Operations
    analyseBrief: handleAnalyseBrief,
    regenerateMotivations: handleRegenerateMotivations,
    generateCopyVariations: handleGenerateCopyVariations,
    saveCopyVariations: handleSaveCopyVariations,
    toggleMotivation: handleToggleMotivation,
    toggleVariation: handleToggleVariation,
    clearStrategy: handleClearStrategy,
  };
};
