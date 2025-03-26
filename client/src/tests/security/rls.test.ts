import { supabase } from '../../supabaseClient';

describe('Asset RLS Policy Tests', () => {
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

  describe('Asset Access Control', () => {
    it('should enforce organisation-based access for asset creation', async () => {
      // Attempt to create asset
      const { error: createError } = await supabase.from('assets').insert({
        name: 'test-image.jpg',
        organisation_id: testOrgs.org1.id,
        type: 'image/jpeg',
        size: 1024
      });

      expect(createError).toBeNull();
    });

    it('should prevent cross-organisation asset access', async () => {
      // Create asset for org1
      const { data: asset } = await supabase
        .from('assets')
        .insert({
          name: 'protected-image.jpg',
          organisation_id: testOrgs.org1.id,
          type: 'image/jpeg',
          size: 1024
        })
        .select()
        .single();

      // Try to access from org2
      const { error: accessError } = await supabase
        .auth.updateUser({ 
          data: { organisation_id: testOrgs.org2.id }
        });

      const { error: fetchError } = await supabase
        .from('assets')
        .select()
        .eq('id', asset.id);

      expect(fetchError).toBeTruthy();
    });

    it('should enforce file type restrictions', async () => {
      const invalidTypes = [
        { name: 'malicious.exe', type: 'application/x-msdownload' },
        { name: 'script.sh', type: 'text/x-shellscript' },
        { name: 'unsafe.js', type: 'application/javascript' }
      ];

      for (const invalid of invalidTypes) {
        const { error } = await supabase
          .from('assets')
          .insert({
            name: invalid.name,
            organisation_id: testOrgs.org1.id,
            type: invalid.type,
            size: 1024
          });

        expect(error).toBeTruthy();
        if (error) {
          expect(error.message).toContain('Invalid file type');
        }
      }
    });

    it('should enforce file size limits', async () => {
      const { error } = await supabase
        .from('assets')
        .insert({
          name: 'oversized.jpg',
          organisation_id: testOrgs.org1.id,
          type: 'image/jpeg',
          size: 150 * 1024 * 1024 // 150MB (exceeds 100MB limit)
        });

      expect(error).toBeTruthy();
      if (error) {
        expect(error.message).toContain('exceeds maximum limit');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce upload rate limits', async () => {
      // Create 101 upload requests (exceeding 100/hour limit)
      const uploads = Array(101).fill(null).map((_, i) => ({
        name: `bulk-${i}.jpg`,
        organisation_id: testOrgs.org1.id,
        type: 'image/jpeg',
        size: 1024
      }));

      const { error } = await supabase
        .from('assets')
        .insert(uploads);

      expect(error).toBeTruthy();
      if (error) {
        expect(error.message).toContain('Rate limit exceeded');
      }
    });
  });

  describe('Audit Logging', () => {
    it('should log asset operations', async () => {
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

      // Verify audit log entry
      const { data: auditLog } = await supabase
        .from('audit_logs')
        .select()
        .eq('record_id', asset.id)
        .eq('table_name', 'assets')
        .single();

      expect(auditLog).toBeTruthy();
      expect(auditLog.action).toBe('INSERT');
      expect(auditLog.organisation_id).toBe(testOrgs.org1.id);
    });
  });
});
