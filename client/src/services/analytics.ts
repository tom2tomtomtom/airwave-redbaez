import { supabase } from '../supabaseClient';
import { monitoring } from './monitoring';
import { caching } from './caching';

interface AnalyticsFilter {
  startDate?: string;
  endDate?: string;
  platform?: string;
  campaignId?: string;
  variationId?: string;
}

interface MetricsData {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
}

interface TimeSeriesData extends MetricsData {
  date: string;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private organisationId: string | null = null;

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public setOrganisationContext(organisationId: string) {
    this.organisationId = organisationId;
  }

  private validateOrganisationContext() {
    if (!this.organisationId) {
      throw new Error('Organisation context not set');
    }
  }

  private async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    this.validateOrganisationContext();
    return caching.get(key, fetcher, {
      organisationId: this.organisationId!,
      ttl: 5 * 60 * 1000, // 5 minutes
    });
  }

  public async getCampaignMetrics(
    campaignId: string,
    filter: AnalyticsFilter = {}
  ): Promise<MetricsData> {
    this.validateOrganisationContext();

    const cacheKey = `metrics:campaign:${campaignId}:${JSON.stringify(filter)}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      const { data, error } = await supabase
        .from('analytics_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('organisation_id', this.organisationId!)
        .gte('date', filter.startDate || '')
        .lte('date', filter.endDate || '')
        .single();

      if (error) {
        monitoring.logError(error, {
          action: 'getCampaignMetrics',
          context: { campaignId, filter },
        });
        throw error;
      }

      return this.calculateMetrics(data);
    });
  }

  public async getTimeSeriesData(
    filter: AnalyticsFilter = {}
  ): Promise<TimeSeriesData[]> {
    this.validateOrganisationContext();

    const cacheKey = `timeseries:${JSON.stringify(filter)}`;

    return this.fetchWithCache(cacheKey, async () => {
      const query = supabase
        .from('analytics_timeseries')
        .select('*')
        .eq('organisation_id', this.organisationId!);

      if (filter.campaignId) {
        query.eq('campaign_id', filter.campaignId);
      }
      if (filter.variationId) {
        query.eq('variation_id', filter.variationId);
      }
      if (filter.platform) {
        query.eq('platform', filter.platform);
      }
      if (filter.startDate) {
        query.gte('date', filter.startDate);
      }
      if (filter.endDate) {
        query.lte('date', filter.endDate);
      }

      const { data, error } = await query.order('date', { ascending: true });

      if (error) {
        monitoring.logError(error, {
          action: 'getTimeSeriesData',
          context: { filter },
        });
        throw error;
      }

      return data.map(row => ({
        date: row.date,
        ...this.calculateMetrics(row),
      }));
    });
  }

  public async exportAnalytics(
    filter: AnalyticsFilter = {}
  ): Promise<Blob> {
    this.validateOrganisationContext();

    try {
      const data = await this.getTimeSeriesData(filter);
      const csvContent = this.convertToCSV(data);
      
      monitoring.logInfo('Analytics exported', {
        action: 'exportAnalytics',
        context: { filter },
      });

      return new Blob([csvContent], { type: 'text/csv' });
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'exportAnalytics',
        context: { filter },
      });
      throw error;
    }
  }

  private calculateMetrics(data: any): MetricsData {
    const impressions = Number(data.impressions) || 0;
    const clicks = Number(data.clicks) || 0;
    const conversions = Number(data.conversions) || 0;
    const spend = Number(data.spend) || 0;

    return {
      impressions,
      clicks,
      conversions,
      spend,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    };
  }

  private convertToCSV(data: TimeSeriesData[]): string {
    const headers = [
      'Date',
      'Impressions',
      'Clicks',
      'Conversions',
      'Spend',
      'CTR (%)',
      'CPC',
      'Conversion Rate (%)',
    ];

    const rows = data.map(row => [
      row.date,
      row.impressions,
      row.clicks,
      row.conversions,
      row.spend.toFixed(2),
      row.ctr.toFixed(2),
      row.cpc.toFixed(2),
      row.conversionRate.toFixed(2),
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  }

  public async optimiseCampaign(campaignId: string): Promise<void> {
    this.validateOrganisationContext();

    try {
      // Fetch campaign performance data
      const metrics = await this.getCampaignMetrics(campaignId);
      
      // Get variation performance
      const { data: variations, error } = await supabase
        .from('campaign_variations')
        .select('id, performance_metrics')
        .eq('campaign_id', campaignId)
        .eq('organisation_id', this.organisationId!);

      if (error) throw error;

      // Calculate optimisation recommendations
      const recommendations = this.generateOptimisationRecommendations(
        metrics,
        variations
      );

      // Store recommendations
      await supabase
        .from('campaign_optimisations')
        .insert({
          campaign_id: campaignId,
          organisation_id: this.organisationId,
          recommendations,
          created_at: new Date().toISOString(),
        });

      monitoring.logInfo('Campaign optimisation completed', {
        action: 'optimiseCampaign',
        context: { campaignId, recommendations },
      });
    } catch (error) {
      monitoring.logError(error as Error, {
        action: 'optimiseCampaign',
        context: { campaignId },
      });
      throw error;
    }
  }

  private generateOptimisationRecommendations(
    metrics: MetricsData,
    variations: any[]
  ): any[] {
    const recommendations = [];

    // Analyse overall campaign performance
    if (metrics.ctr < 1.0) {
      recommendations.push({
        type: 'targeting',
        priority: 'high',
        message: 'Consider refining audience targeting to improve CTR',
      });
    }

    if (metrics.conversionRate < 2.0) {
      recommendations.push({
        type: 'landing_page',
        priority: 'medium',
        message: 'Optimise landing page experience to improve conversion rate',
      });
    }

    // Analyse variation performance
    const variationMetrics = variations.map(v => ({
      id: v.id,
      ...this.calculateMetrics(v.performance_metrics),
    }));

    // Find best and worst performing variations
    const bestVariation = variationMetrics.reduce((a, b) => 
      (a.ctr > b.ctr ? a : b));
    const worstVariation = variationMetrics.reduce((a, b) => 
      (a.ctr < b.ctr ? a : b));

    if (bestVariation.ctr > worstVariation.ctr * 1.5) {
      recommendations.push({
        type: 'variation',
        priority: 'high',
        message: 'Consider pausing low-performing variation and reallocating budget',
        variationId: worstVariation.id,
      });
    }

    return recommendations;
  }
}

export const analytics = AnalyticsService.getInstance();
