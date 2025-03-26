import { api } from '../../services/api';
import { supabase } from '../../supabaseClient';
import { security } from '../../services/security';
import { monitoring } from '../../services/monitoring';
import { caching } from '../../services/caching';

// Mock dependencies
jest.mock('../../supabaseClient');
jest.mock('../../services/security');
jest.mock('../../services/monitoring');
jest.mock('../../services/caching');

describe('ApiService', () => {
  const mockOrganisationId = 'test-org';
  const mockSession = {
    access_token: 'test-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (security.getOrganisationId as jest.Mock).mockReturnValue(mockOrganisationId);
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null
    });
  });

  describe('Campaign Operations', () => {
    const mockCampaignData = {
      name: 'Test Campaign',
      objective: 'Brand Awareness',
    };

    it('should fetch campaigns with proper organisation context', async () => {
      const mockResponse = {
        data: [mockCampaignData],
        error: null,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockResponse),
          }),
        }),
      });

      const result = await api.getCampaigns();

      expect(result.data).toEqual([mockCampaignData]);
      expect(supabase.from).toHaveBeenCalledWith('campaigns');
      expect(monitoring.logError).not.toHaveBeenCalled();
    });

    it('should create campaign with proper validation', async () => {
      // Mock security validations
      (security.enforceRateLimit as jest.Mock).mockResolvedValue(true);
      (security.sanitiseObject as jest.Mock).mockReturnValue(mockCampaignData);

      const mockResponse = {
        data: { ...mockCampaignData, id: 'test-id' },
        error: null,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(mockResponse),
          }),
        }),
      });

      const result = await api.createCampaign(mockCampaignData);

      expect(result.data).toEqual(mockResponse.data);
      expect(security.enforceRateLimit).toHaveBeenCalled();
      expect(security.sanitiseObject).toHaveBeenCalledWith(mockCampaignData);
      expect(caching.invalidateByPrefix).toHaveBeenCalledWith(
        'campaigns:',
        mockOrganisationId
      );
    });
  });

  describe('Asset Operations', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockMetadata = {
      name: 'Test Asset',
      description: 'Test Description',
    };

    it('should handle asset upload with proper validation', async () => {
      // Mock security validations
      (security.validateAsset as jest.Mock).mockResolvedValue(true);
      (security.sanitiseObject as jest.Mock).mockReturnValue(mockMetadata);

      const mockAssetResponse = {
        data: { id: 'test-asset', ...mockMetadata },
        error: null,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(mockAssetResponse),
          }),
        }),
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await api.uploadAsset(mockFile, mockMetadata);

      expect(result.data).toBeDefined();
      expect(security.validateAsset).toHaveBeenCalled();
      expect(supabase.storage.from).toHaveBeenCalledWith('assets');
    });

    it('should reject invalid assets', async () => {
      (security.validateAsset as jest.Mock).mockRejectedValue(
        new Error('Invalid file type')
      );

      await expect(api.uploadAsset(mockFile, mockMetadata)).rejects.toThrow(
        'Invalid file type'
      );
      expect(monitoring.logError).toHaveBeenCalled();
    });
  });

  describe('Approval Operations', () => {
    const mockCampaignId = 'test-campaign';
    const mockApprovalData = {
      title: 'Request for approval',
      message: 'Please review',
      variations: ['var-1', 'var-2'],
    };

    it('should submit approval requests with proper validation', async () => {
      // Mock security validations
      (security.validateCampaignAccess as jest.Mock).mockResolvedValue(true);
      (security.enforceRateLimit as jest.Mock).mockResolvedValue(true);
      (security.sanitiseObject as jest.Mock).mockReturnValue(mockApprovalData);

      const mockResponse = {
        data: { id: 'test-approval', ...mockApprovalData },
        error: null,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(mockResponse),
          }),
        }),
      });

      const result = await api.submitForApproval(mockCampaignId, mockApprovalData);

      expect(result.data).toEqual(mockResponse.data);
      expect(security.validateCampaignAccess).toHaveBeenCalledWith(mockCampaignId);
      expect(monitoring.logInfo).toHaveBeenCalled();
    });

    it('should reject unauthorised approval submissions', async () => {
      (security.validateCampaignAccess as jest.Mock).mockResolvedValue(false);

      await expect(
        api.submitForApproval(mockCampaignId, mockApprovalData)
      ).rejects.toThrow('Unauthorised access to campaign');
      expect(monitoring.logError).toHaveBeenCalled();
    });
  });

  describe('Export Operations', () => {
    const mockCampaignId = 'test-campaign';
    const mockPlatform = 'facebook';
    const mockOptions = {
      dimensions: {
        width: 1080,
        height: 1080
      },
      format: 'mp4',
      quality: 80,
    };

    it('should handle exports with proper permissions', async () => {
      // Mock security validations
      (security.validateExportPermissions as jest.Mock).mockResolvedValue(true);
      (security.enforceRateLimit as jest.Mock).mockResolvedValue(true);
      (security.sanitiseObject as jest.Mock).mockReturnValue(mockOptions);

      const mockResponse = {
        data: {
          id: 'test-export',
          status: 'queued',
        },
        error: null,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(mockResponse),
          }),
        }),
      });

      const result = await api.exportCampaign(
        mockCampaignId,
        mockPlatform,
        mockOptions
      );

      expect(result.data).toEqual(mockResponse.data);
      expect(security.validateExportPermissions).toHaveBeenCalledWith(
        mockCampaignId,
        mockPlatform
      );
      expect(monitoring.logInfo).toHaveBeenCalled();
    });

    it('should reject unauthorised exports', async () => {
      (security.validateExportPermissions as jest.Mock).mockResolvedValue(false);

      await expect(
        api.exportCampaign(mockCampaignId, mockPlatform, mockOptions)
      ).rejects.toThrow('Unauthorised export attempt');
      expect(monitoring.logError).toHaveBeenCalled();
    });

    it('should enforce rate limits on exports', async () => {
      (security.validateExportPermissions as jest.Mock).mockResolvedValue(true);
      (security.enforceRateLimit as jest.Mock).mockResolvedValue(false);

      await expect(
        api.exportCampaign(mockCampaignId, mockPlatform, mockOptions)
      ).rejects.toThrow('Rate limit exceeded for campaign exports');
      expect(monitoring.logError).toHaveBeenCalled();
    });
  });
});
