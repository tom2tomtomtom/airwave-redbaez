import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface EngagementMetrics {
  views: number;
  completions: number;
  clicks: number;
  conversions: number;
  shareRate: number;
  averageWatchTime: number;
}

interface PlatformMetrics extends EngagementMetrics {
  platformId: string;
  platformName: string;
  costPerView: number;
  costPerClick: number;
  costPerConversion: number;
  totalSpend: number;
}

interface VariationMetrics extends EngagementMetrics {
  variationId: string;
  variationName: string;
  performance: number;
  confidenceScore: number;
}

interface AudienceSegment {
  id: string;
  name: string;
  size: number;
  engagement: EngagementMetrics;
}

interface TimeSeriesData {
  timestamp: string;
  metrics: EngagementMetrics;
}

interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  platforms?: string[];
  variations?: string[];
  segments?: string[];
}

interface UseCampaignAnalyticsProps {
  campaignId: string;
  onError?: (error: string) => void;
}

export const useCampaignAnalytics = ({
  campaignId,
  onError,
}: UseCampaignAnalyticsProps) => {
  const [overallMetrics, setOverallMetrics] = useState<EngagementMetrics | null>(null);
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics[]>([]);
  const [variationMetrics, setVariationMetrics] = useState<VariationMetrics[]>([]);
  const [audienceSegments, setAudienceSegments] = useState<AudienceSegment[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  const fetchOverallMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .rpc('get_campaign_metrics', {
          p_campaign_id: campaignId,
          p_start_date: filters.startDate,
          p_end_date: filters.endDate,
          p_platforms: filters.platforms,
          p_variations: filters.variations,
          p_segments: filters.segments,
        });

      if (fetchError) {
        throw new Error(`Failed to fetch overall metrics: ${fetchError.message}`);
      }

      setOverallMetrics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch overall metrics';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId, filters, handleError]);

  const fetchPlatformMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .rpc('get_platform_metrics', {
          p_campaign_id: campaignId,
          p_start_date: filters.startDate,
          p_end_date: filters.endDate,
          p_platforms: filters.platforms,
          p_variations: filters.variations,
          p_segments: filters.segments,
        });

      if (fetchError) {
        throw new Error(`Failed to fetch platform metrics: ${fetchError.message}`);
      }

      setPlatformMetrics(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch platform metrics';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId, filters, handleError]);

  const fetchVariationMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .rpc('get_variation_metrics', {
          p_campaign_id: campaignId,
          p_start_date: filters.startDate,
          p_end_date: filters.endDate,
          p_platforms: filters.platforms,
          p_variations: filters.variations,
          p_segments: filters.segments,
        });

      if (fetchError) {
        throw new Error(`Failed to fetch variation metrics: ${fetchError.message}`);
      }

      setVariationMetrics(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch variation metrics';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId, filters, handleError]);

  const fetchAudienceSegments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .rpc('get_audience_segments', {
          p_campaign_id: campaignId,
          p_start_date: filters.startDate,
          p_end_date: filters.endDate,
          p_platforms: filters.platforms,
          p_variations: filters.variations,
          p_segments: filters.segments,
        });

      if (fetchError) {
        throw new Error(`Failed to fetch audience segments: ${fetchError.message}`);
      }

      setAudienceSegments(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch audience segments';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId, filters, handleError]);

  const fetchTimeSeriesData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .rpc('get_timeseries_data', {
          p_campaign_id: campaignId,
          p_start_date: filters.startDate,
          p_end_date: filters.endDate,
          p_platforms: filters.platforms,
          p_variations: filters.variations,
          p_segments: filters.segments,
        });

      if (fetchError) {
        throw new Error(`Failed to fetch time series data: ${fetchError.message}`);
      }

      setTimeSeriesData(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch time series data';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId, filters, handleError]);

  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const refreshAllMetrics = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchOverallMetrics(),
        fetchPlatformMetrics(),
        fetchVariationMetrics(),
        fetchAudienceSegments(),
        fetchTimeSeriesData(),
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh metrics';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    fetchOverallMetrics,
    fetchPlatformMetrics,
    fetchVariationMetrics,
    fetchAudienceSegments,
    fetchTimeSeriesData,
    handleError,
  ]);

  const calculateROI = useCallback((metrics: PlatformMetrics) => {
    const revenue = metrics.conversions * 100; // Assuming £100 per conversion
    const roi = ((revenue - metrics.totalSpend) / metrics.totalSpend) * 100;
    return roi;
  }, []);

  const getTopPerformingVariations = useCallback((count: number = 3): VariationMetrics[] => {
    return [...variationMetrics]
      .sort((a, b) => b.performance - a.performance)
      .slice(0, count);
  }, [variationMetrics]);

  const getTopPerformingSegments = useCallback((count: number = 3): AudienceSegment[] => {
    return [...audienceSegments]
      .sort((a, b) => b.engagement.completions / b.engagement.views - a.engagement.completions / a.engagement.views)
      .slice(0, count);
  }, [audienceSegments]);

  useEffect(() => {
    refreshAllMetrics();
  }, [refreshAllMetrics]);

  return {
    // State
    overallMetrics,
    platformMetrics,
    variationMetrics,
    audienceSegments,
    timeSeriesData,
    filters,
    loading,
    error,

    // Actions
    updateFilters,
    refreshAllMetrics,

    // Analysis helpers
    calculateROI,
    getTopPerformingVariations,
    getTopPerformingSegments,

    // Individual fetch functions
    fetchOverallMetrics,
    fetchPlatformMetrics,
    fetchVariationMetrics,
    fetchAudienceSegments,
    fetchTimeSeriesData,
  };
};

export type CampaignAnalyticsHook = ReturnType<typeof useCampaignAnalytics>;
