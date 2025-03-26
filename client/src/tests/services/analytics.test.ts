import { analytics } from '../../services/analytics';
import { supabase } from '../../supabaseClient';
import { monitoring } from '../../services/monitoring';
import { caching } from '../../services/caching';

// Mock dependencies
jest.mock('../../supabaseClient');
jest.mock('../../services/monitoring');
jest.mock('../../services/caching');

describe('AnalyticsService', () => {
  const mockOrganisationId = 'test-org';
  const mockCampaignId = 'test-campaign';

  beforeEach(() => {
    jest.clearAllMocks();
    analytics.setOrganisationContext(mockOrganisationId);
  });

  describe('Campaign Metrics', () => {
    const mockMetricsData = {
      impressions: 1000,
      clicks: 50,
      conversions: 10,
      spend: 100.0,
    };

    it('should fetch and calculate campaign metrics correctly', async () => {
      // Mock Supabase response
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockMetricsData,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await analytics.getCampaignMetrics(mockCampaignId);

      expect(result).toEqual({
        ...mockMetricsData,
        ctr: 5, // (50 / 1000) * 100
        cpc: 2, // 100 / 50
        conversionRate: 20, // (10 / 50) * 100
      });
    });

    it('should handle missing metrics data gracefully', async () => {
      // Mock Supabase response with null data
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await analytics.getCampaignMetrics(mockCampaignId);

      expect(result).toEqual({
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        ctr: 0,
        cpc: 0,
        conversionRate: 0,
      });
    });

    it('should log errors when metrics fetch fails', async () => {
      const mockError = new Error('Database error');
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  single: jest.fn().mockRejectedValue(mockError),
                }),
              }),
            }),
          }),
        }),
      });

      await expect(analytics.getCampaignMetrics(mockCampaignId)).rejects.toThrow();
      expect(monitoring.logError).toHaveBeenCalledWith(mockError, expect.any(Object));
    });
  });

  describe('Time Series Data', () => {
    const mockTimeSeriesData = [
      {
        date: '2025-03-17',
        impressions: 500,
        clicks: 25,
        conversions: 5,
        spend: 50.0,
      },
      {
        date: '2025-03-18',
        impressions: 600,
        clicks: 30,
        conversions: 6,
        spend: 60.0,
      },
    ];

    it('should fetch and format time series data correctly', async () => {
      // Mock Supabase response
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                      data: mockTimeSeriesData,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await analytics.getTimeSeriesData({
        campaignId: mockCampaignId,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('ctr');
      expect(result[0]).toHaveProperty('cpc');
      expect(result[0]).toHaveProperty('conversionRate');
    });

    it('should apply filters correctly', async () => {
      const filters = {
        startDate: '2025-03-17',
        endDate: '2025-03-18',
        platform: 'facebook',
        campaignId: mockCampaignId,
      };

      await analytics.getTimeSeriesData(filters);

      // Verify that all filters were applied
      expect(supabase.from).toHaveBeenCalledWith('analytics_timeseries');
      const mockSelect = (supabase.from as jest.Mock).mock.results[0].value.select;
      expect(mockSelect).toHaveBeenCalled();
    });
  });

  describe('Analytics Export', () => {
    const mockData = [
      {
        date: '2025-03-17',
        impressions: 500,
        clicks: 25,
        conversions: 5,
        spend: 50.0,
        ctr: 5,
        cpc: 2,
        conversionRate: 20,
      },
    ];

    it('should generate CSV export correctly', async () => {
      // Mock time series data fetch
      jest.spyOn(analytics, 'getTimeSeriesData').mockResolvedValue(mockData);

      const result = await analytics.exportAnalytics({
        campaignId: mockCampaignId,
      });

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('text/csv');

      // Verify logging
      expect(monitoring.logInfo).toHaveBeenCalledWith(
        'Analytics exported',
        expect.any(Object)
      );
    });

    it('should handle export errors gracefully', async () => {
      const mockError = new Error('Export failed');
      jest.spyOn(analytics, 'getTimeSeriesData').mockRejectedValue(mockError);

      await expect(
        analytics.exportAnalytics({ campaignId: mockCampaignId })
      ).rejects.toThrow();

      expect(monitoring.logError).toHaveBeenCalledWith(mockError, expect.any(Object));
    });
  });

  describe('Campaign Optimisation', () => {
    const mockMetrics = {
      impressions: 1000,
      clicks: 30,
      conversions: 5,
      spend: 100,
      ctr: 3,
      cpc: 3.33,
      conversionRate: 16.67,
    };

    const mockVariations = [
      {
        id: 'var-1',
        performance_metrics: {
          impressions: 600,
          clicks: 25,
          conversions: 4,
          spend: 50,
        },
      },
      {
        id: 'var-2',
        performance_metrics: {
          impressions: 400,
          clicks: 5,
          conversions: 1,
          spend: 50,
        },
      },
    ];

    it('should generate optimisation recommendations correctly', async () => {
      // Mock dependencies
      jest.spyOn(analytics, 'getCampaignMetrics').mockResolvedValue(mockMetrics);
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockVariations,
              error: null,
            }),
          }),
        }),
      });

      await analytics.optimiseCampaign(mockCampaignId);

      // Verify recommendations were stored
      expect(supabase.from).toHaveBeenCalledWith('campaign_optimisations');
      const insertCall = (supabase.from as jest.Mock).mock.results[1].value.insert;
      expect(insertCall).toHaveBeenCalled();

      // Verify logging
      expect(monitoring.logInfo).toHaveBeenCalledWith(
        'Campaign optimisation completed',
        expect.any(Object)
      );
    });

    it('should handle optimisation errors gracefully', async () => {
      const mockError = new Error('Optimisation failed');
      jest.spyOn(analytics, 'getCampaignMetrics').mockRejectedValue(mockError);

      await expect(analytics.optimiseCampaign(mockCampaignId)).rejects.toThrow();

      expect(monitoring.logError).toHaveBeenCalledWith(mockError, expect.any(Object));
    });
  });
});
