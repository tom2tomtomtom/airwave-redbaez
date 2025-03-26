import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface PreviewAsset {
  id: string;
  type: 'video' | 'image' | 'audio';
  url: string;
  name: string;
  duration?: number;
}

interface CopyAsset {
  id: string;
  content: string[];
}

interface PreviewVariation {
  id: string;
  name: string;
  mainAsset: PreviewAsset;
  overlayAssets?: PreviewAsset[];
  copy: CopyAsset;
  audio?: PreviewAsset;
}

interface Platform {
  id: string;
  name: string;
  dimensions: {
    width: number;
    height: number;
  };
  previewBackground?: string;
}

interface UseCampaignPreviewProps {
  campaignId: string;
  onError?: (error: string) => void;
}

export const useCampaignPreview = ({ campaignId, onError }: UseCampaignPreviewProps) => {
  const [variations, setVariations] = useState<PreviewVariation[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedVariation, setSelectedVariation] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  const loadPlatforms = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('platforms')
        .select('*')
        .order('name');

      if (fetchError) {
        throw new Error(`Failed to load platforms: ${fetchError.message}`);
      }

      setPlatforms(data || []);
      if (data && data.length > 0 && !selectedPlatform) {
        setSelectedPlatform(data[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load platforms';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedPlatform, handleError]);

  const loadVariations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('campaign_variations')
        .select(`
          id,
          name,
          main_asset:assets!main_asset_id(*),
          overlay_assets:variation_overlay_assets(assets(*)),
          copy:variation_copy(*),
          audio:assets!audio_asset_id(*)
        `)
        .eq('campaign_id', campaignId);

      if (fetchError) {
        throw new Error(`Failed to load variations: ${fetchError.message}`);
      }

      const formattedVariations: PreviewVariation[] = data?.map(variation => {
        // Ensure all necessary objects exist before accessing their properties
        // Ensure mainAsset is treated as an object, not an array
        const mainAsset = variation.main_asset || {} as Record<string, any>;
        const copyData = variation.copy || {} as Record<string, any>;
        const audioData = variation.audio || {} as Record<string, any>;
        
        return {
          id: variation.id || '',
          name: variation.name || '',
          mainAsset: {
            id: (mainAsset as Record<string, any>).id || '',
            type: ((mainAsset as Record<string, any>).type as 'video' | 'image' | 'audio') || 'image',
            url: (mainAsset as Record<string, any>).url || '',
            name: (mainAsset as Record<string, any>).name || '',
            duration: (mainAsset as Record<string, any>).duration || 0,
          },
          overlayAssets: (variation.overlay_assets || []).map((overlay: any) => {
            const asset = overlay?.assets || {};
            return {
              id: asset.id || '',
              type: (asset.type as 'video' | 'image') || 'image',
              url: asset.url || '',
              name: asset.name || '',
              duration: asset.duration || 0,
            };
          }),
          copy: {
            id: (copyData as Record<string, any>).id || '',
            content: Array.isArray((copyData as Record<string, any>).content) ? (copyData as Record<string, any>).content : [],
          },
          audio: variation.audio ? {
            id: (audioData as Record<string, any>).id || '',
            type: 'audio' as const,
            url: (audioData as Record<string, any>).url || '',
            name: (audioData as Record<string, any>).name || '',
            duration: (audioData as Record<string, any>).duration || 0,
          } : undefined,
        };
      }) || [];

      setVariations(formattedVariations);
      if (formattedVariations.length > 0 && !selectedVariation) {
        setSelectedVariation(formattedVariations[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load variations';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedVariation, handleError]);

  const getCurrentPlatform = useCallback(() => {
    return platforms.find(p => p.id === selectedPlatform);
  }, [platforms, selectedPlatform]);

  const getCurrentVariation = useCallback(() => {
    return variations.find(v => v.id === selectedVariation);
  }, [variations, selectedVariation]);

  const handlePlatformChange = useCallback((platformId: string) => {
    setSelectedPlatform(platformId);
    setIsPlaying(false);
  }, []);

  const handleVariationChange = useCallback((variationId: string) => {
    setSelectedVariation(variationId);
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const generatePreviewUrl = useCallback(async (variationId: string, platformId: string) => {
    try {
      setLoading(true);
      const { data, error: generateError } = await supabase
        .rpc('generate_preview_url', {
          variation_id: variationId,
          platform_id: platformId,
        });

      if (generateError) {
        throw new Error(`Failed to generate preview URL: ${generateError.message}`);
      }

      return data.preview_url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview URL';
      handleError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    loadPlatforms();
  }, [loadPlatforms]);

  useEffect(() => {
    if (campaignId) {
      loadVariations();
    }
  }, [campaignId, loadVariations]);

  return {
    // State
    variations,
    platforms,
    selectedPlatform,
    selectedVariation,
    isPlaying,
    isMuted,
    loading,
    error,

    // Getters
    getCurrentPlatform,
    getCurrentVariation,

    // Actions
    handlePlatformChange,
    handleVariationChange,
    togglePlay,
    toggleMute,
    generatePreviewUrl,

    // Loading functions
    loadPlatforms,
    loadVariations,
  };
};

export type CampaignPreviewHook = ReturnType<typeof useCampaignPreview>;
