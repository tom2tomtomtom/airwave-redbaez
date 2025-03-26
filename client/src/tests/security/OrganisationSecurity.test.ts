import { supabase } from '../../supabaseClient';
import {
  testOrganisations,
  setupTestOrganisations,
  cleanupTestOrganisations,
  setOrganisationContext,
  createTestAsset,
  verifyAuditLog
} from '../utils/testSetup';

describe('Organisation Security Tests', () => {
  beforeAll(async () => {
    await setupTestOrganisations();
  });

  afterAll(async () => {
    await cleanupTestOrganisations();
  });

  describe('Organisation Access Control', () => {
    it('should enforce organisation isolation', async () => {
      // Set context for first organisation
      setOrganisationContext(testOrganisations.org1.id);

      // Create asset for first organisation
      const asset = await createTestAsset(testOrganisations.org1.id);

      // Switch to second organisation
      setOrganisationContext(testOrganisations.org2.id);

      // Attempt to access asset from second organisation
      const { data, error } = await supabase
        .from('assets')
        .select()
        .eq('id', asset.id);

      // Should not be able to access asset
      expect(error).toBeTruthy();
      expect(data).toBeNull();

      // Verify audit log
      const hasAuditLog = await verifyAuditLog({
        recordId: asset.id,
        tableName: 'assets',
        action: 'ACCESS_DENIED',
        organisationId: testOrganisations.org2.id
      });
      expect(hasAuditLog).toBe(true);
    });

    it('should prevent cross-organisation asset creation', async () => {
      // Set context for first organisation
      setOrganisationContext(testOrganisations.org1.id);

      // Attempt to create asset for second organisation
      const { error } = await supabase
        .from('assets')
        .insert({
          name: 'cross-org.jpg',
          organisation_id: testOrganisations.org2.id,
          type: 'image/jpeg',
          size: 1024
        });

      expect(error).toBeTruthy();
      expect(error?.message).toContain('organisation mismatch');
    });
  });

  describe('Asset Validation', () => {
    beforeEach(() => {
      setOrganisationContext(testOrganisations.org1.id);
    });

    it('should enforce file size limits', async () => {
      const oversizedAsset = {
        size: 150 * 1024 * 1024, // 150MB
        type: 'image/jpeg',
        name: 'oversized.jpg'
      };

      const { error } = await supabase
        .from('assets')
        .insert({
          ...oversizedAsset,
          organisation_id: testOrganisations.org1.id
        });

      expect(error).toBeTruthy();
      expect(error?.message).toContain('exceeds maximum limit of 100MB');
    });

    it('should validate allowed file types', async () => {
      const validTypes = [
        { name: 'photo.jpg', type: 'image/jpeg' },
        { name: 'icon.png', type: 'image/png' },
        { name: 'animation.gif', type: 'image/gif' },
        { name: 'video.mp4', type: 'video/mp4' },
        { name: 'clip.mov', type: 'video/quicktime' }
      ];

      for (const file of validTypes) {
        const { error } = await supabase
          .from('assets')
          .insert({
            ...file,
            organisation_id: testOrganisations.org1.id,
            size: 1024
          });

        expect(error).toBeNull();
      }
    });

    it('should reject disallowed file types', async () => {
      const invalidTypes = [
        { name: 'script.exe', type: 'application/x-msdownload' },
        { name: 'config.sh', type: 'text/x-shellscript' },
        { name: 'code.js', type: 'application/javascript' }
      ];

      for (const file of invalidTypes) {
        const { error } = await supabase
          .from('assets')
          .insert({
            ...file,
            organisation_id: testOrganisations.org1.id,
            size: 1024
          });

        expect(error).toBeTruthy();
        expect(error?.message).toContain('Invalid file type');
      }
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      setOrganisationContext(testOrganisations.org1.id);
    });

    it('should enforce upload rate limits', async () => {
      const uploads = Array(101).fill(null).map((_, i) => ({
        name: `bulk-${i}.jpg`,
        organisation_id: testOrganisations.org1.id,
        type: 'image/jpeg',
        size: 1024
      }));

      // First 100 should succeed
      const { error: batchError } = await supabase
        .from('assets')
        .insert(uploads.slice(0, 100));

      expect(batchError).toBeNull();

      // 101st should fail
      const { error: limitError } = await supabase
        .from('assets')
        .insert(uploads[100]);

      expect(limitError).toBeTruthy();
      expect(limitError?.message).toContain('Rate limit exceeded');
    });

    it('should track rate limits per organisation', async () => {
      // Create 50 assets for org1
      const org1Uploads = Array(50).fill(null).map((_, i) => ({
        name: `org1-${i}.jpg`,
        organisation_id: testOrganisations.org1.id,
        type: 'image/jpeg',
        size: 1024
      }));

      const { error: org1Error } = await supabase
        .from('assets')
        .insert(org1Uploads);

      expect(org1Error).toBeNull();

      // Switch to org2 and create 50 assets
      setOrganisationContext(testOrganisations.org2.id);

      const org2Uploads = Array(50).fill(null).map((_, i) => ({
        name: `org2-${i}.jpg`,
        organisation_id: testOrganisations.org2.id,
        type: 'image/jpeg',
        size: 1024
      }));

      const { error: org2Error } = await supabase
        .from('assets')
        .insert(org2Uploads);

      expect(org2Error).toBeNull();
    });
  });

  describe('Audit Logging', () => {
    it('should log all security-relevant operations', async () => {
      setOrganisationContext(testOrganisations.org1.id);

      // Create asset
      const asset = await createTestAsset(testOrganisations.org1.id);

      // Verify create log
      const createLog = await verifyAuditLog({
        recordId: asset.id,
        tableName: 'assets',
        action: 'INSERT',
        organisationId: testOrganisations.org1.id
      });
      expect(createLog).toBe(true);

      // Update asset
      await supabase
        .from('assets')
        .update({ name: 'renamed.jpg' })
        .eq('id', asset.id);

      // Verify update log
      const updateLog = await verifyAuditLog({
        recordId: asset.id,
        tableName: 'assets',
        action: 'UPDATE',
        organisationId: testOrganisations.org1.id
      });
      expect(updateLog).toBe(true);

      // Delete asset
      await supabase
        .from('assets')
        .delete()
        .eq('id', asset.id);

      // Verify delete log
      const deleteLog = await verifyAuditLog({
        recordId: asset.id,
        tableName: 'assets',
        action: 'DELETE',
        organisationId: testOrganisations.org1.id
      });
      expect(deleteLog).toBe(true);
    });
  });
});
