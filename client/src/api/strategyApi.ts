import {
  BriefAnalysisRequest,
  BriefAnalysisResponse,
  CopyGenerationRequest,
  CopyGenerationResponse,
} from '../types/api';
import { supabase } from '../lib/supabase';

export const strategyApi = {
  analyseBrief: async (request: BriefAnalysisRequest): Promise<BriefAnalysisResponse> => {
    const { data, error } = await supabase
      .rpc('analyse_brief', {
        brief_content: request.content,
        file_type: request.fileType,
        target_audience: request.targetAudience,
        campaign_objectives: request.campaignObjectives,
      });

    if (error) throw new Error(error.message);
    return data;
  },

  regenerateMotivations: async (
    briefId: string,
    feedback?: string
  ): Promise<BriefAnalysisResponse> => {
    const { data, error } = await supabase
      .rpc('regenerate_motivations', {
        brief_id: briefId,
        user_feedback: feedback,
      });

    if (error) throw new Error(error.message);
    return data;
  },

  generateCopyVariations: async (
    request: CopyGenerationRequest
  ): Promise<CopyGenerationResponse> => {
    const { data, error } = await supabase
      .rpc('generate_copy_variations', {
        motivation_ids: request.motivationIds,
        tone: request.tone,
        style: request.style,
        frame_count: request.frameCount,
        include_cta: request.includeCta,
        cta_text: request.ctaText,
      });

    if (error) throw new Error(error.message);
    return data;
  },

  saveCopyVariations: async (
    briefId: string,
    selectedVariationIds: string[]
  ): Promise<void> => {
    const { error } = await supabase
      .from('brief_copy_variations')
      .insert(
        selectedVariationIds.map(variationId => ({
          brief_id: briefId,
          variation_id: variationId,
        }))
      );

    if (error) throw new Error(error.message);
  },
};
