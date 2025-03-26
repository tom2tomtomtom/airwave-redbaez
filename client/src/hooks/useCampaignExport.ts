import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

interface Platform {
  id: string;
  name: string;
  requiresAuth: boolean;
  supportedFormats: string[];
  maxDuration: number;
  maxFileSize: number;
}

interface AdVariation {
  id: string;
  name: string;
  duration: number;
  fileSize: number;
  format: string;
}

interface VariationResponse {
  id: string;
  name: string;
  main_asset?: {
    duration?: number;
    file_size?: number;
    format?: string;
  };
}

export interface ExportSettings {
  format: string;
  quality: 'high' | 'medium' | 'low';
  optimiseForPlatform: boolean;
  scheduleExport: boolean;
  scheduledTime?: string;
}

interface ExportJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  outputUrl?: string;
  createdAt: string;
  completedAt?: string;
}

interface UseCampaignExportProps {
  campaignId: string;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

const defaultExportSettings: ExportSettings = {
  format: 'mp4',
  quality: 'high',
  optimiseForPlatform: true,
  scheduleExport: false,
};

export const useCampaignExport = ({
  campaignId,
  onError,
  onProgress,
}: UseCampaignExportProps) => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [settings, setSettings] = useState<ExportSettings>(defaultExportSettings);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load platforms';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Define the type for the Supabase response data
  interface VariationResponseItem {
    id: string;
    name: string;
    main_asset?: {
      duration?: number;
      file_size?: number;
      format?: string;
    };
  }

  const loadVariations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('campaign_variations')
        .select(`
          id,
          name,
          main_asset:assets!main_asset_id(
            duration,
            file_size,
            format
          )
        `)
        .eq('campaign_id', campaignId);

      if (fetchError) {
        throw new Error(`Failed to load variations: ${fetchError.message}`);
      }

      const formattedVariations: AdVariation[] = (data as VariationResponseItem[] | null)?.map(variation => ({
        id: variation.id,
        name: variation.name,
        duration: variation.main_asset?.duration || 0,
        fileSize: variation.main_asset?.file_size || 0,
        format: variation.main_asset?.format || 'unknown',
      })) || [];

      setVariations(formattedVariations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load variations';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId, handleError]);

  const loadExportJobs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(`Failed to load export jobs: ${fetchError.message}`);
      }

      setExportJobs(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load export jobs';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId, handleError]);

  const startExport = useCallback(async () => {
    if (!selectedPlatform || selectedVariations.length === 0) {
      handleError('Please select a platform and at least one variation');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create export job
      const { data: job, error: jobError } = await supabase
        .from('export_jobs')
        .insert([
          {
            campaign_id: campaignId,
            platform_id: selectedPlatform,
            variation_ids: selectedVariations,
            settings,
            status: 'queued',
            progress: 0,
          },
        ])
        .select()
        .single();

      if (jobError) {
        throw new Error(`Failed to create export job: ${jobError.message}`);
      }

      // Start export process
      const { error: exportError } = await supabase.rpc('start_export', {
        job_id: job.id,
      });

      if (exportError) {
        throw new Error(`Failed to start export: ${exportError.message}`);
      }

      // Subscribe to job updates
      const subscription = supabase
        .channel(`export_job:${job.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'export_jobs',
            filter: `id=eq.${job.id}`,
          },
          (payload) => {
            const updatedJob = payload.new as ExportJob;
            setExportJobs((prev) =>
              prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))
            );
            onProgress?.(updatedJob.progress);

            if (
              updatedJob.status === 'completed' ||
              updatedJob.status === 'failed'
            ) {
              subscription.unsubscribe();
            }
          }
        )
        .subscribe();

      return job;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start export';
      handleError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    campaignId,
    selectedPlatform,
    selectedVariations,
    settings,
    handleError,
    onProgress,
  ]);

  const cancelExport = useCallback(async (jobId: string) => {
    try {
      setLoading(true);
      const { error: cancelError } = await supabase.rpc('cancel_export', {
        job_id: jobId,
      });

      if (cancelError) {
        throw new Error(`Failed to cancel export: ${cancelError.message}`);
      }

      await loadExportJobs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel export';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadExportJobs, handleError]);

  const validateExport = useCallback(() => {
    if (!selectedPlatform) {
      return 'Please select a target platform';
    }

    if (selectedVariations.length === 0) {
      return 'Please select at least one variation to export';
    }

    const platform = platforms.find((p) => p.id === selectedPlatform);
    if (!platform) {
      return 'Invalid platform selected';
    }

    const invalidVariations = variations
      .filter((v) => selectedVariations.includes(v.id))
      .filter((v) => {
        const exceedsMaxDuration = platform.maxDuration && v.duration > platform.maxDuration;
        const exceedsMaxFileSize = platform.maxFileSize && v.fileSize > platform.maxFileSize;
        return exceedsMaxDuration || exceedsMaxFileSize;
      });

    if (invalidVariations.length > 0) {
      return `Some variations exceed platform limits: ${invalidVariations
        .map((v) => v.name)
        .join(', ')}`;
    }

    if (!platform.supportedFormats.includes(settings.format)) {
      return `Format ${settings.format} is not supported by ${platform.name}`;
    }

    return null;
  }, [selectedPlatform, selectedVariations, platforms, variations, settings.format]);

  return {
    // State
    platforms,
    variations,
    selectedPlatform,
    selectedVariations,
    settings,
    exportJobs,
    loading,
    error,

    // Setters
    setSelectedPlatform,
    setSelectedVariations,
    setSettings,

    // Actions
    loadPlatforms,
    loadVariations,
    loadExportJobs,
    startExport,
    cancelExport,
    validateExport,
  };
};

export type CampaignExportHook = ReturnType<typeof useCampaignExport>;
