import { supabase } from '../../supabaseClient';
import { security } from '../../services/security';

describe('AIrWAVE Security Tests', () => {
  const testOrgs = {
    org1: { id: 'test-org-1', name: 'Test Organisation 1' },
    org2: { id: 'test-org-2', name: 'Test Organisation 2' }
  };

  beforeAll(async () => {
    // Set up test organisations
    for (const org of Object.values(testOrgs)) {
      await supabase.from('organisations').insert(org);
    }
  });

  afterAll(async () => {
    // Clean up test data
    const orgIds = Object.values(testOrgs).map(org => org.id);
    await supabase.from('organisations').delete().in('id', orgIds);
  });

  describe('Organisation Access Control', () => {
    it('should enforce organisation isolation', async () => {
      // Set up security context for org1
      security.setContext({
        organisationId: testOrgs.org1.id,
        userId: 'test-user',
        roles: ['user']
      });

      // Create asset for org1
      const { data: asset } = await supabase
        .from('assets')
        .insert({
          name: 'test-image.jpg',
          organisation_id: testOrgs.org1.id,
          type: 'image/jpeg',
          size: 1024
        })
        .select()
        .single();

      // Try to access as org2
      security.setContext({
        organisationId: testOrgs.org2.id,
        userId: 'test-user-2',
        roles: ['user']
      });

      const hasAccess = await security.validateAssetAccess(asset.id);
      expect(hasAccess).toBe(false);
    });

    it('should prevent cross-organisation operations', async () => {
      security.setContext({
        organisationId: testOrgs.org1.id,
        userId: 'test-user',
        roles: ['user']
      });

      // Try to create asset for different organisation
      const { error } = await supabase
        .from('assets')
        .insert({
          name: 'cross-org.jpg',
          organisation_id: testOrgs.org2.id,
          type: 'image/jpeg',
          size: 1024
        });

      expect(error).toBeTruthy();
    });
  });

  describe('Asset Validation', () => {
    beforeEach(() => {
      security.setContext({
        organisationId: testOrgs.org1.id,
        userId: 'test-user',
        roles: ['user']
      });
    });

    it('should enforce file size limits', async () => {
      const oversizedAsset = {
        size: 150 * 1024 * 1024, // 150MB
        type: 'image/jpeg',
        name: 'large.jpg'
      };

      await expect(security.validateAsset(oversizedAsset))
        .rejects
        .toThrow('File size exceeds maximum limit of 100MB');
    });

    it('should validate file types', async () => {
      const invalidTypes = [
        { name: 'script.exe', type: 'application/x-msdownload' },
        { name: 'config.sh', type: 'text/x-shellscript' },
        { name: 'code.js', type: 'application/javascript' }
      ];

      for (const invalid of invalidTypes) {
        await expect(security.validateAsset({
          ...invalid,
          size: 1024
        })).rejects.toThrow('Invalid file type');
      }
    });

    it('should allow valid file types', async () => {
      const validTypes = [
        { name: 'photo.jpg', type: 'image/jpeg' },
        { name: 'icon.png', type: 'image/png' },
        { name: 'animation.gif', type: 'image/gif' },
        { name: 'video.mp4', type: 'video/mp4' },
        { name: 'clip.mov', type: 'video/quicktime' }
      ];

      for (const valid of validTypes) {
        await expect(security.validateAsset({
          ...valid,
          size: 1024
        })).resolves.not.toThrow();
      }
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      security.setContext({
        organisationId: testOrgs.org1.id,
        userId: 'test-user',
        roles: ['user']
      });
    });

    it('should enforce upload rate limits', async () => {
      const action = 'asset_upload';
      const limit = 100;
      const timeWindow = 3600; // 1 hour

      // Simulate rapid uploads
      for (let i = 0; i < limit; i++) {
        await security.enforceRateLimit(action, limit, timeWindow);
      }

      // Next upload should be blocked
      const allowed = await security.enforceRateLimit(action, limit, timeWindow);
      expect(allowed).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    it('should log security-relevant operations', async () => {
      security.setContext({
        organisationId: testOrgs.org1.id,
        userId: 'test-user',
        roles: ['user']
      });

      // Create test asset
      const { data: asset } = await supabase
        .from('assets')
        .insert({
          name: 'audit-test.jpg',
          organisation_id: testOrgs.org1.id,
          type: 'image/jpeg',
          size: 1024
        })
        .select()
        .single();

      // Verify audit log
      const { data: logs } = await supabase
        .from('audit_logs')
        .select()
        .eq('record_id', asset.id)
        .eq('table_name', 'assets');

      expect(logs).not.toBeNull();
      // If logs is null, the test fails above. Assert array properties directly.
      expect(Array.isArray(logs)).toBe(true);
      expect(logs?.length).toBeGreaterThan(0);
      
      // Check logs[0] exists before accessing properties
      const firstLog = logs?.[0];
      expect(firstLog).toBeDefined();
      expect(firstLog?.action).toBe('INSERT');
      expect(firstLog?.organisation_id).toBe(testOrgs.org1.id);
    });
  });
});
