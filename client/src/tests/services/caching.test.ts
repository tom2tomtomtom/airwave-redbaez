import { caching } from '../../services/caching';
import { supabase } from '../../supabaseClient';

// Mock dependencies
jest.mock('../../supabaseClient');

describe('CachingService', () => {
  const mockOrganisationId = 'test-org';
  const mockCampaignId = 'test-campaign';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Cache Operations', () => {
    it('should cache and retrieve data with organisation context', async () => {
      const mockData = { id: 1, name: 'Test' };
      const fetcher = jest.fn().mockResolvedValue(mockData);

      // First call should fetch
      const result1 = await caching.get('test-key', fetcher, {
        organisationId: mockOrganisationId,
      });
      expect(result1).toEqual(mockData);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await caching.get('test-key', fetcher, {
        organisationId: mockOrganisationId,
      });
      expect(result2).toEqual(mockData);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should respect TTL for cached data', async () => {
      const mockData = { id: 1, name: 'Test' };
      const fetcher = jest.fn().mockResolvedValue(mockData);

      // First call should fetch
      await caching.get('test-key', fetcher, {
        organisationId: mockOrganisationId,
        ttl: 1000, // 1 second
      });

      // Advance time past TTL
      jest.advanceTimersByTime(1500);

      // Second call should fetch again
      await caching.get('test-key', fetcher, {
        organisationId: mockOrganisationId,
        ttl: 1000,
      });

      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should isolate cache by organisation', async () => {
      const mockData1 = { id: 1, name: 'Org 1 Data' };
      const mockData2 = { id: 2, name: 'Org 2 Data' };
      const fetcher1 = jest.fn().mockResolvedValue(mockData1);
      const fetcher2 = jest.fn().mockResolvedValue(mockData2);

      // Cache data for org 1
      await caching.get('test-key', fetcher1, {
        organisationId: 'org-1',
      });

      // Cache data for org 2
      await caching.get('test-key', fetcher2, {
        organisationId: 'org-2',
      });

      // Both fetchers should have been called
      expect(fetcher1).toHaveBeenCalledTimes(1);
      expect(fetcher2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific cache entries', async () => {
      const mockData = { id: 1, name: 'Test' };
      const fetcher = jest.fn().mockResolvedValue(mockData);

      // Cache data
      await caching.get('test-key', fetcher, {
        organisationId: mockOrganisationId,
      });

      // Invalidate cache
      caching.invalidate('test-key', mockOrganisationId);

      // Should fetch again
      await caching.get('test-key', fetcher, {
        organisationId: mockOrganisationId,
      });

      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should invalidate by prefix', async () => {
      const mockData = { id: 1, name: 'Test' };
      const fetcher = jest.fn().mockResolvedValue(mockData);

      // Cache multiple entries
      await caching.get('prefix:key1', fetcher, {
        organisationId: mockOrganisationId,
      });
      await caching.get('prefix:key2', fetcher, {
        organisationId: mockOrganisationId,
      });

      // Invalidate by prefix
      caching.invalidateByPrefix('prefix:', mockOrganisationId);

      // Should fetch both again
      await caching.get('prefix:key1', fetcher, {
        organisationId: mockOrganisationId,
      });
      await caching.get('prefix:key2', fetcher, {
        organisationId: mockOrganisationId,
      });

      expect(fetcher).toHaveBeenCalledTimes(4);
    });
  });

  describe('Campaign Data Caching', () => {
    const mockCampaignData = {
      id: mockCampaignId,
      name: 'Test Campaign',
      variations: [],
    };

    beforeEach(() => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockCampaignData,
                error: null,
              }),
            }),
          }),
        }),
      });
    });

    it('should cache campaign data with proper organisation context', async () => {
      // First call should fetch from Supabase
      const result1 = await caching.getCampaignData(
        mockCampaignId,
        mockOrganisationId
      );
      expect(result1).toEqual(mockCampaignData);
      expect(supabase.from).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await caching.getCampaignData(
        mockCampaignId,
        mockOrganisationId
      );
      expect(result2).toEqual(mockCampaignData);
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('should handle campaign data fetch errors', async () => {
      const mockError = new Error('Database error');
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(mockError),
            }),
          }),
        }),
      });

      await expect(
        caching.getCampaignData(mockCampaignId, mockOrganisationId)
      ).rejects.toThrow(mockError);
    });
  });

  describe('Assets List Caching', () => {
    const mockAssets = [
      { id: 1, name: 'Asset 1' },
      { id: 2, name: 'Asset 2' },
    ];

    beforeEach(() => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            range: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockAssets,
                error: null,
              }),
            }),
          }),
        }),
      });
    });

    it('should cache assets list with pagination', async () => {
      const options = { page: 1, limit: 20 };

      // First call should fetch from Supabase
      const result1 = await caching.getAssetsList(mockOrganisationId, options);
      expect(result1).toEqual(mockAssets);
      expect(supabase.from).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await caching.getAssetsList(mockOrganisationId, options);
      expect(result2).toEqual(mockAssets);
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('should handle assets list fetch errors', async () => {
      const mockError = new Error('Database error');
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            range: jest.fn().mockReturnValue({
              order: jest.fn().mockRejectedValue(mockError),
            }),
          }),
        }),
      });

      await expect(
        caching.getAssetsList(mockOrganisationId)
      ).rejects.toThrow(mockError);
    });
  });

  describe('Campaign Assets Prefetching', () => {
    const mockAssets = [
      { id: 1, name: 'Asset 1' },
      { id: 2, name: 'Asset 2' },
    ];

    beforeEach(() => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockAssets,
              error: null,
            }),
          }),
        }),
      });
    });

    it('should prefetch campaign assets', async () => {
      await caching.prefetchCampaignAssets(mockCampaignId, mockOrganisationId);

      // Verify assets were cached
      const cachedAssets = await caching.get(
        `campaign:${mockCampaignId}:assets`,
        jest.fn(),
        { organisationId: mockOrganisationId }
      );
      expect(cachedAssets).toEqual(mockAssets);
    });

    it('should handle prefetch errors gracefully', async () => {
      const mockError = new Error('Database error');
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(mockError),
          }),
        }),
      });

      await expect(
        caching.prefetchCampaignAssets(mockCampaignId, mockOrganisationId)
      ).rejects.toThrow(mockError);
    });
  });
});
