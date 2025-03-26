import { supabase } from '../../supabaseClient';
import { security } from '../../services/security';

export interface TestOrganisation {
  id: string;
  name: string;
  settings: {
    maxFileSize: number;
    allowedFileTypes: string[];
    rateLimit: {
      uploads: number;
      interval: number;
    };
  };
}

export const testOrganisations: Record<string, TestOrganisation> = {
  org1: {
    id: 'test-org-1',
    name: 'Test Organisation 1',
    settings: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'],
      rateLimit: {
        uploads: 100,
        interval: 3600 // 1 hour
      }
    }
  },
  org2: {
    id: 'test-org-2',
    name: 'Test Organisation 2',
    settings: {
      maxFileSize: 100 * 1024 * 1024,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'],
      rateLimit: {
        uploads: 100,
        interval: 3600
      }
    }
  }
};

export const setupTestOrganisations = async () => {
  for (const org of Object.values(testOrganisations)) {
    await supabase.from('organisations').insert(org);
  }
};

export const cleanupTestOrganisations = async () => {
  const orgIds = Object.values(testOrganisations).map(org => org.id);
  await supabase.from('organisations').delete().in('id', orgIds);
};

export const setOrganisationContext = (orgId: string) => {
  security.setContext({
    organisationId: orgId,
    userId: 'test-user',
    roles: ['user']
  });
};

export const createTestAsset = async (orgId: string, overrides = {}) => {
  const defaultAsset = {
    name: 'test-image.jpg',
    organisation_id: orgId,
    type: 'image/jpeg',
    size: 1024,
    ...overrides
  };

  const { data, error } = await supabase
    .from('assets')
    .insert(defaultAsset)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const verifyAuditLog = async (params: {
  recordId: string;
  tableName: string;
  action: string;
  organisationId: string;
}) => {
  const { data: logs } = await supabase
    .from('audit_logs')
    .select()
    .match({
      record_id: params.recordId,
      table_name: params.tableName,
      action: params.action,
      organisation_id: params.organisationId
    });

  return logs && logs.length > 0;
};
