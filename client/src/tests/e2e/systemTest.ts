import { test, expect } from '@playwright/test';
import { supabase } from '../../supabaseClient';

test.describe('AIrWAVE System Tests', () => {
  let testOrg1Id: string;
  let testOrg2Id: string;

  test.beforeAll(async () => {
    // Create test organisations
    const { data: org1, error: error1 } = await supabase
      .from('organisations')
      .insert({ name: 'Test Org 1' })
      .select('id')
      .single();
    
    const { data: org2, error: error2 } = await supabase
      .from('organisations')
      .insert({ name: 'Test Org 2' })
      .select('id')
      .single();
    
    if (error1 || !org1) {
      throw new Error(`Failed to create test org 1: ${error1?.message || 'Data was null'}`);
    }
    
    if (error2 || !org2) {
      throw new Error(`Failed to create test org 2: ${error2?.message || 'Data was null'}`);
    }

    testOrg1Id = org1.id;
    testOrg2Id = org2.id;
  });

  test.afterAll(async () => {
    // Clean up test data
    await supabase.from('organisations').delete().in('id', [testOrg1Id, testOrg2Id]);
  });

  test('Asset Security Tests', async ({ page }) => {
    // Test RLS policies
    const { data: asset } = await supabase
      .from('assets')
      .insert({
        name: 'test-image.jpg',
        organisation_id: testOrg1Id,
        type: 'image/jpeg',
        size: 1024
      })
      .select()
      .single();

    // Try accessing from wrong organisation
    const { error: accessError } = await supabase
      .from('assets')
      .select()
      .eq('id', asset.id)
      .eq('organisation_id', testOrg2Id);

    expect(accessError).toBeTruthy();
  });

  test('Rate Limiting Tests', async ({ page }) => {
    const uploads = Array(101).fill(null).map(() => ({
      name: `test-${Date.now()}.jpg`,
      organisation_id: testOrg1Id,
      type: 'image/jpeg',
      size: 1024
    }));

    // Should fail after 100 uploads
    const { error: rateLimitError } = await supabase
      .from('assets')
      .insert(uploads);

    expect(rateLimitError).toBeTruthy();
    expect(rateLimitError?.message).toContain('rate limit');
  });

  test('Asset Management Tests', async ({ page }) => {
    // Test file type validation
    const invalidTypes = [
      { name: 'test.exe', type: 'application/x-msdownload' },
      { name: 'test.sh', type: 'text/x-shellscript' },
      { name: 'test.js', type: 'application/javascript' }
    ];

    for (const invalid of invalidTypes) {
      const { error } = await supabase
        .from('assets')
        .insert({
          name: invalid.name,
          organisation_id: testOrg1Id,
          type: invalid.type,
          size: 1024
        });

      expect(error).toBeTruthy();
      expect(error?.message).toContain('Invalid file type');
    }

    // Test size limit
    const { error: sizeError } = await supabase
      .from('assets')
      .insert({
        name: 'large.jpg',
        organisation_id: testOrg1Id,
        type: 'image/jpeg',
        size: 200 * 1024 * 1024 // 200MB
      });

    expect(sizeError).toBeTruthy();
    expect(sizeError?.message).toContain('size exceeds');
  });

  test('Campaign Creation Flow', async ({ page }) => {
    await page.goto('/');
    
    // Create campaign
    await page.click('[data-testid="new-campaign-button"]');
    await page.fill('[data-testid="campaign-name"]', 'Test Campaign');
    await page.click('[data-testid="next-step"]');

    // Select assets
    await page.click('[data-testid="asset-card"]:first-child');
    await page.click('[data-testid="next-step"]');

    // Configure matrix
    await page.click('[data-testid="add-variation"]');
    await page.fill('[data-testid="variation-text"]', 'Test Copy');
    await page.click('[data-testid="save-variation"]');

    // Generate preview
    await page.click('[data-testid="generate-preview"]');
    const preview = await page.waitForSelector('[data-testid="preview-iframe"]');
    expect(preview).toBeTruthy();

    // Export
    await page.click('[data-testid="export-button"]');
    const exportDialog = await page.waitForSelector('[data-testid="export-dialog"]');
    expect(exportDialog).toBeTruthy();
  });

  test('Client Approval Flow', async ({ page }) => {
    // Create approval request
    const { data: approval } = await supabase
      .from('approval_requests')
      .insert({
        campaign_id: 'test-campaign',
        organisation_id: testOrg1Id,
        status: 'pending'
      })
      .select()
      .single();

    // Access client portal
    await page.goto(`/client-portal/${approval.id}`);
    expect(page.url()).toContain('client-portal');

    // Approve assets
    await page.click('[data-testid="approve-all"]');
    await page.click('[data-testid="submit-approval"]');

    const { data: updated } = await supabase
      .from('approval_requests')
      .select()
      .eq('id', approval.id)
      .single();

    expect(updated.status).toBe('approved');
  });
});
