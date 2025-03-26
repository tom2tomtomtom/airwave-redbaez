import { security } from '../../services/security';
import { supabase } from '../../supabaseClient';
import { monitoring } from '../../services/monitoring';

// Mock dependencies
jest.mock('../../supabaseClient');
jest.mock('../../services/monitoring');

describe('SecurityService', () => {
  const mockContext = {
    organisationId: 'test-org',
    userId: 'test-user',
    roles: ['admin'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    security.setContext(mockContext);
  });

  describe('Asset Validation', () => {
    it('should validate acceptable assets', async () => {
      const validAsset = {
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg',
        name: 'test-image.jpg',
      };

      await expect(security.validateAsset(validAsset)).resolves.not.toThrow();
    });

    it('should reject oversised assets', async () => {
      const largeAsset = {
        size: 200 * 1024 * 1024, // 200MB
        type: 'image/jpeg',
        name: 'large-image.jpg',
      };

      await expect(security.validateAsset(largeAsset)).rejects.toThrow(
        'File size exceeds maximum limit'
      );
    });

    it('should reject unsupported file types', async () => {
      const invalidAsset = {
        size: 1024,
        type: 'application/exe',
        name: 'malicious.exe',
      };

      await expect(security.validateAsset(invalidAsset)).rejects.toThrow(
        'Invalid file type'
      );
    });

    it('should reject files with dangerous extensions', async () => {
      const dangerousAsset = {
        size: 1024,
        type: 'text/javascript',
        name: 'script.js',
      };

      await expect(security.validateAsset(dangerousAsset)).rejects.toThrow(
        'File type not permitted'
      );
    });
  });

  describe('Organisation Access Validation', () => {
    it('should validate access for resources owned by the organisation', async () => {
      const mockSupabaseResponse = {
        data: { organisation_id: 'test-org' },
        error: null,
      };
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      });

      const result = await security.validateOrganisationAccess(
        'test-resource',
        'campaigns'
      );
      expect(result).toBe(true);
    });

    it('should reject access for resources owned by other organisations', async () => {
      const mockSupabaseResponse = {
        data: { organisation_id: 'other-org' },
        error: null,
      };
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(mockSupabaseResponse),
          }),
        }),
      });

      const result = await security.validateOrganisationAccess(
        'test-resource',
        'campaigns'
      );
      expect(result).toBe(false);
      expect(monitoring.logWarning).toHaveBeenCalledWith(
        'Unauthorised organisation access attempt',
        expect.any(Object)
      );
    });
  });

  describe('Role Validation', () => {
    it('should validate users with required role', async () => {
      const result = await security.validateRole('admin');
      expect(result).toBe(true);
    });

    it('should reject users without required role', async () => {
      const result = await security.validateRole('superadmin');
      expect(result).toBe(false);
      expect(monitoring.logWarning).toHaveBeenCalledWith(
        'Unauthorised role access attempt',
        expect.any(Object)
      );
    });
  });

  describe('Input Sanitisation', () => {
    it('should sanitise potentially dangerous input', () => {
      const dangerousInput = '<script>alert("xss")</script>';
      const sanitised = security.sanitiseInput(dangerousInput);
      expect(sanitised).not.toContain('<');
      expect(sanitised).not.toContain('>');
    });

    it('should sanitise nested objects', () => {
      const dangerousObject = {
        name: '<img src="x" onerror="alert(1)">',
        nested: {
          description: '<script>evil()</script>',
        },
      };

      const sanitised = security.sanitiseObject(dangerousObject);
      expect(sanitised.name).not.toContain('<');
      expect(sanitised.nested.description).not.toContain('<');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Mock successful first attempt
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { count: 0 } }),
          }),
        }),
      });

      const firstAttempt = await security.enforceRateLimit('test-action', 5, 3600);
      expect(firstAttempt).toBe(true);

      // Mock rate limit exceeded
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { count: 5 } }),
          }),
        }),
      });

      const secondAttempt = await security.enforceRateLimit('test-action', 5, 3600);
      expect(secondAttempt).toBe(false);
      expect(monitoring.logWarning).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.any(Object)
      );
    });
  });

  describe('Export Permissions', () => {
    it('should validate export permissions for authorised platforms', async () => {
      // Mock campaign access
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { organisation_id: 'test-org' },
                error: null,
              }),
            }),
          }),
        })
        // Mock platform permissions
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { permissions: ['export'] },
                  error: null,
                }),
              }),
            }),
          }),
        });

      const result = await security.validateExportPermissions(
        'test-campaign',
        'facebook'
      );
      expect(result).toBe(true);
    });

    it('should reject export for unauthorised platforms', async () => {
      // Mock campaign access
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { organisation_id: 'test-org' },
                error: null,
              }),
            }),
          }),
        })
        // Mock platform permissions
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { permissions: ['view'] },
                  error: null,
                }),
              }),
            }),
          }),
        });

      const result = await security.validateExportPermissions(
        'test-campaign',
        'facebook'
      );
      expect(result).toBe(false);
    });
  });
});
