import { supabase } from '../supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';

interface ApprovalContent {
  motivations: Array<{
    id: string;
    title: string;
    description: string;
    reasoning: string;
  }>;
  copyVariations: Array<{
    id: string;
    content: string[];
    tone: string;
    style: string;
  }>;
}

interface CreateApprovalRequestParams {
  campaignId: string;
  clientEmail: string;
  content: ApprovalContent;
}

interface UpdateApprovalRequestParams {
  requestId: string;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected';
  feedback?: string;
}

interface CreateApprovalVersionParams {
  requestId: string;
  content: ApprovalContent;
}

interface UpdateApprovalVersionParams {
  versionId: string;
  status: 'approved' | 'rejected';
  feedback?: string;
}

class ApprovalApi {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabase;
  }

  /**
   * Create a new approval request
   */
  async createRequest({
    campaignId,
    clientEmail,
    content,
  }: CreateApprovalRequestParams) {
    const { data, error } = await this.supabase
      .from('approval_requests')
      .insert([
        {
          campaign_id: campaignId,
          client_email: clientEmail,
          content,
          status: 'draft',
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create approval request: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing approval request
   */
  async updateRequest({
    requestId,
    status,
    feedback,
  }: UpdateApprovalRequestParams) {
    const { data, error } = await this.supabase
      .from('approval_requests')
      .update({
        status,
        feedback,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update approval request: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all approval requests for a campaign
   */
  async getRequestsByCampaign(campaignId: string) {
    const { data, error } = await this.supabase
      .from('approval_requests')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch approval requests: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a single approval request by ID
   */
  async getRequestById(requestId: string) {
    const { data, error } = await this.supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch approval request: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new version for an approval request
   */
  async createVersion({
    requestId,
    content,
  }: CreateApprovalVersionParams) {
    // First, get the current version number
    const { data: versions, error: fetchError } = await this.supabase
      .from('approval_versions')
      .select('version')
      .eq('request_id', requestId)
      .order('version', { ascending: false })
      .limit(1);

    if (fetchError) {
      throw new Error(`Failed to fetch version number: ${fetchError.message}`);
    }

    const nextVersion = versions && versions.length > 0 ? versions[0].version + 1 : 1;

    const { data, error } = await this.supabase
      .from('approval_versions')
      .insert([
        {
          request_id: requestId,
          version: nextVersion,
          content,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create approval version: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing version
   */
  async updateVersion({
    versionId,
    status,
    feedback,
  }: UpdateApprovalVersionParams) {
    const { data, error } = await this.supabase
      .from('approval_versions')
      .update({
        status,
        feedback,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', versionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update approval version: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all versions for an approval request
   */
  async getVersionsByRequest(requestId: string) {
    const { data, error } = await this.supabase
      .from('approval_versions')
      .select('*')
      .eq('request_id', requestId)
      .order('version', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch approval versions: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a single version by ID
   */
  async getVersionById(versionId: string) {
    const { data, error } = await this.supabase
      .from('approval_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch approval version: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete an approval request and all its versions
   */
  async deleteRequest(requestId: string) {
    // First delete all versions
    const { error: versionsError } = await this.supabase
      .from('approval_versions')
      .delete()
      .eq('request_id', requestId);

    if (versionsError) {
      throw new Error(`Failed to delete approval versions: ${versionsError.message}`);
    }

    // Then delete the request
    const { error: requestError } = await this.supabase
      .from('approval_requests')
      .delete()
      .eq('id', requestId);

    if (requestError) {
      throw new Error(`Failed to delete approval request: ${requestError.message}`);
    }
  }

  /**
   * Copy an existing approval request to create a new draft
   */
  async copyRequest(requestId: string) {
    // First get the original request
    const original = await this.getRequestById(requestId);

    if (!original) {
      throw new Error('Original request not found');
    }

    // Create a new request with the same content
    const { data, error } = await this.supabase
      .from('approval_requests')
      .insert([
        {
          campaign_id: original.campaign_id,
          client_email: original.client_email,
          content: original.content,
          status: 'draft',
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to copy approval request: ${error.message}`);
    }

    return data;
  }
}

export const approvalApi = new ApprovalApi();
