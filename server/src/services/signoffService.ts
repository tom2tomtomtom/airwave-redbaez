import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabaseClient';
import { SignoffSession, SignoffAsset, SignoffResponse, ClientViewSession } from '../models/signoff.model';
import * as crypto from 'crypto';

export class SignoffService {
  /**
   * Create a new sign-off session for client review
   */
  async createSignoffSession(sessionData: Partial<SignoffSession>, userId: string): Promise<SignoffSession> {
    try {
      const accessToken = crypto.randomBytes(32).toString('hex');
      const newSession: SignoffSession = {
        id: uuidv4(),
        campaignId: sessionData.campaignId!,
        title: sessionData.title || 'Campaign Review',
        description: sessionData.description,
        status: 'draft',
        clientEmail: sessionData.clientEmail!,
        clientName: sessionData.clientName!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: sessionData.expiresAt,
        accessToken,
        createdBy: userId,
        matrixId: sessionData.matrixId,
        feedback: '',
      };

      // Create signoff session in Supabase
      const { data, error } = await supabase
        .from('signoff_sessions')
        .insert([newSession])
        .select()
        .single();

      if (error) {
        logger.error('Error creating signoff session:', error);
        throw new Error(`Failed to create signoff session: ${error.message}`);
      }

      return data as SignoffSession;
    } catch ($1: unknown) {
      logger.error('Error in createSignoffSession:', error);
      throw new Error(`Failed to create signoff session: ${error.message}`);
    }
  }

  /**
   * Add assets to a sign-off session
   */
  async addAssetsToSession(sessionId: string, assetIds: string[]): Promise<SignoffAsset[]> {
    try {
      const assets = assetIds.map(assetId => ({
        id: uuidv4(),
        sessionId,
        assetId,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versionNumber: 1,
      }));

      const { data, error } = await supabase
        .from('signoff_assets')
        .insert(assets)
        .select();

      if (error) {
        logger.error('Error adding assets to session:', error);
        throw new Error(`Failed to add assets to session: ${error.message}`);
      }

      return data as SignoffAsset[];
    } catch ($1: unknown) {
      logger.error('Error in addAssetsToSession:', error);
      throw new Error(`Failed to add assets to session: ${error.message}`);
    }
  }

  /**
   * Send a sign-off session to the client
   */
  async sendSignoffSession(sessionId: string): Promise<SignoffSession> {
    try {
      // Generate review URL with access token
      const session = await this.getSignoffSessionById(sessionId);
      const baseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000';
      const reviewUrl = `${baseUrl}/review/${sessionId}?token=${session.accessToken}`;

      const { data, error } = await supabase
        .from('signoff_sessions')
        .update({
          status: 'sent',
          updatedAt: new Date().toISOString(),
          reviewUrl,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        logger.error('Error sending signoff session:', error);
        throw new Error(`Failed to send signoff session: ${error.message}`);
      }

      // Here you would typically send an email to the client with the review URL
      // For now, we'll just return the updated session
      return data as SignoffSession;
    } catch ($1: unknown) {
      logger.error('Error in sendSignoffSession:', error);
      throw new Error(`Failed to send signoff session: ${error.message}`);
    }
  }

  /**
   * Get a sign-off session by ID
   */
  async getSignoffSessionById(sessionId: string): Promise<SignoffSession> {
    try {
      const { data, error } = await supabase
        .from('signoff_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        logger.error('Error fetching signoff session:', error);
        throw new Error(`Failed to fetch signoff session: ${error.message}`);
      }

      return data as SignoffSession;
    } catch ($1: unknown) {
      logger.error('Error in getSignoffSessionById:', error);
      throw new Error(`Failed to fetch signoff session: ${error.message}`);
    }
  }

  /**
   * Validate a client's access token for a sign-off session
   */
  async validateAccessToken(sessionId: string, token: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('signoff_sessions')
        .select('accessToken, status, expiresAt')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return false;
      }

      const session = data as SignoffSession;

      // Check if token matches
      if (session.accessToken !== token) {
        return false;
      }

      // Check if session is expired
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        return false;
      }

      // Check if session status is valid for review
      if (session.status !== 'sent' && session.status !== 'in_review') {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error validating access token:', error);
      return false;
    }
  }

  /**
   * Get client view of a sign-off session
   */
  async getClientView(sessionId: string, token: string): Promise<ClientViewSession | null> {
    try {
      // Validate access token
      const isValid = await this.validateAccessToken(sessionId, token);
      if (!isValid) {
        return null;
      }

      // Mark as in review if previously just sent
      await supabase
        .from('signoff_sessions')
        .update({
          status: 'in_review',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('status', 'sent');

      // Get session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('signoff_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        throw new Error('Failed to fetch session data');
      }

      // Get assets in this session
      const { data: signoffAssets, error: assetsError } = await supabase
        .from('signoff_assets')
        .select('*, assets(*)')
        .eq('sessionId', sessionId);

      if (assetsError) {
        throw new Error('Failed to fetch session assets');
      }

      // Format client view
      const clientView: ClientViewSession = {
        id: sessionData.id,
        campaignId: sessionData.campaignId,
        title: sessionData.title,
        description: sessionData.description,
        status: sessionData.status,
        clientEmail: sessionData.clientEmail,
        clientName: sessionData.clientName,
        createdAt: sessionData.createdAt,
        updatedAt: sessionData.updatedAt,
        expiresAt: sessionData.expiresAt,
        feedback: sessionData.feedback,
        matrixId: sessionData.matrixId,
        reviewUrl: sessionData.reviewUrl,
        assets: signoffAssets.map(($1: unknown) => ({
          id: item.assetId,
          name: item.assets?.name || 'Untitled Asset',
          description: item.assets?.description,
          type: item.assets?.type || 'unknown',
          previewUrl: item.assets?.previewUrl || item.assets?.url,
          status: item.status,
          feedback: item.feedback,
        })),
      };

      return clientView;
    } catch ($1: unknown) {
      logger.error('Error in getClientView:', error);
      return null;
    }
  }

  /**
   * Process client feedback and update asset statuses
   */
  async processClientFeedback(
    sessionId: string, 
    token: string, 
    feedback: string,
    assetStatuses: Array<{ assetId: string; status: 'approved' | 'rejected'; feedback?: string }>
  ): Promise<SignoffResponse | null> {
    try {
      // Validate access token
      const isValid = await this.validateAccessToken(sessionId, token);
      if (!isValid) {
        return null;
      }

      // Update session status based on feedback
      const approvedAssets = assetStatuses.filter(a => a.status === 'approved').map(a => a.assetId);
      const rejectedAssets = assetStatuses.filter(a => a.status === 'rejected').map(a => a.assetId);
      
      let sessionStatus: 'approved' | 'rejected' | 'partial';
      
      if (rejectedAssets.length === 0) {
        sessionStatus = 'approved';
      } else if (approvedAssets.length === 0) {
        sessionStatus = 'rejected';
      } else {
        sessionStatus = 'partial';
      }

      // Update session with feedback
      const { data: sessionData, error: sessionError } = await supabase
        .from('signoff_sessions')
        .update({
          status: sessionStatus === 'approved' ? 'approved' : 
                 sessionStatus === 'rejected' ? 'rejected' : 'in_review',
          feedback,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Failed to update session: ${sessionError.message}`);
      }

      // Update individual asset statuses
      for (const assetStatus of assetStatuses) {
        await supabase
          .from('signoff_assets')
          .update({
            status: assetStatus.status,
            feedback: assetStatus.feedback || '',
            updatedAt: new Date().toISOString(),
          })
          .eq('sessionId', sessionId)
          .eq('assetId', assetStatus.assetId);
      }

      // Create signoff response record
      const signoffResponse: Omit<SignoffResponse, 'id' | 'createdAt'> = {
        sessionId,
        clientName: sessionData.clientName,
        clientEmail: sessionData.clientEmail,
        feedback,
        status: sessionStatus,
        approvedAssets,
        rejectedAssets,
      };

      const { data: responseData, error: responseError } = await supabase
        .from('signoff_responses')
        .insert([{
          ...signoffResponse,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        }])
        .select()
        .single();

      if (responseError) {
        throw new Error(`Failed to create response record: ${responseError.message}`);
      }

      return responseData as SignoffResponse;
    } catch ($1: unknown) {
      logger.error('Error in processClientFeedback:', error);
      return null;
    }
  }

  /**
   * List all sign-off sessions for a campaign
   */
  async listCampaignSignoffSessions(campaignId: string): Promise<SignoffSession[]> {
    try {
      const { data, error } = await supabase
        .from('signoff_sessions')
        .select('*')
        .eq('campaignId', campaignId)
        .order('createdAt', { ascending: false });

      if (error) {
        throw new Error(`Failed to list signoff sessions: ${error.message}`);
      }

      return data as SignoffSession[];
    } catch ($1: unknown) {
      logger.error('Error in listCampaignSignoffSessions:', error);
      throw new Error(`Failed to list signoff sessions: ${error.message}`);
    }
  }
}

export const signoffService = new SignoffService();
