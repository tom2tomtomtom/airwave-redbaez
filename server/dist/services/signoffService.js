"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signoffService = exports.SignoffService = void 0;
const uuid_1 = require("uuid");
const supabaseClient_1 = require("../db/supabaseClient");
const crypto_1 = __importDefault(require("crypto"));
class SignoffService {
    /**
     * Create a new sign-off session for client review
     */
    async createSignoffSession(sessionData, userId) {
        try {
            const accessToken = crypto_1.default.randomBytes(32).toString('hex');
            const newSession = {
                id: (0, uuid_1.v4)(),
                campaignId: sessionData.campaignId,
                title: sessionData.title || 'Campaign Review',
                description: sessionData.description,
                status: 'draft',
                clientEmail: sessionData.clientEmail,
                clientName: sessionData.clientName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                expiresAt: sessionData.expiresAt,
                accessToken,
                createdBy: userId,
                matrixId: sessionData.matrixId,
                feedback: '',
            };
            // Create signoff session in Supabase
            const { data, error } = await supabaseClient_1.supabase
                .from('signoff_sessions')
                .insert([newSession])
                .select()
                .single();
            if (error) {
                console.error('Error creating signoff session:', error);
                throw new Error(`Failed to create signoff session: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error('Error in createSignoffSession:', error);
            throw new Error(`Failed to create signoff session: ${error.message}`);
        }
    }
    /**
     * Add assets to a sign-off session
     */
    async addAssetsToSession(sessionId, assetIds) {
        try {
            const assets = assetIds.map(assetId => ({
                id: (0, uuid_1.v4)(),
                sessionId,
                assetId,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                versionNumber: 1,
            }));
            const { data, error } = await supabaseClient_1.supabase
                .from('signoff_assets')
                .insert(assets)
                .select();
            if (error) {
                console.error('Error adding assets to session:', error);
                throw new Error(`Failed to add assets to session: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error('Error in addAssetsToSession:', error);
            throw new Error(`Failed to add assets to session: ${error.message}`);
        }
    }
    /**
     * Send a sign-off session to the client
     */
    async sendSignoffSession(sessionId) {
        try {
            // Generate review URL with access token
            const session = await this.getSignoffSessionById(sessionId);
            const baseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000';
            const reviewUrl = `${baseUrl}/review/${sessionId}?token=${session.accessToken}`;
            const { data, error } = await supabaseClient_1.supabase
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
                console.error('Error sending signoff session:', error);
                throw new Error(`Failed to send signoff session: ${error.message}`);
            }
            // Here you would typically send an email to the client with the review URL
            // For now, we'll just return the updated session
            return data;
        }
        catch (error) {
            console.error('Error in sendSignoffSession:', error);
            throw new Error(`Failed to send signoff session: ${error.message}`);
        }
    }
    /**
     * Get a sign-off session by ID
     */
    async getSignoffSessionById(sessionId) {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('signoff_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();
            if (error) {
                console.error('Error fetching signoff session:', error);
                throw new Error(`Failed to fetch signoff session: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error('Error in getSignoffSessionById:', error);
            throw new Error(`Failed to fetch signoff session: ${error.message}`);
        }
    }
    /**
     * Validate a client's access token for a sign-off session
     */
    async validateAccessToken(sessionId, token) {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('signoff_sessions')
                .select('accessToken, status, expiresAt')
                .eq('id', sessionId)
                .single();
            if (error || !data) {
                return false;
            }
            const session = data;
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
        }
        catch (error) {
            console.error('Error validating access token:', error);
            return false;
        }
    }
    /**
     * Get client view of a sign-off session
     */
    async getClientView(sessionId, token) {
        try {
            // Validate access token
            const isValid = await this.validateAccessToken(sessionId, token);
            if (!isValid) {
                return null;
            }
            // Mark as in review if previously just sent
            await supabaseClient_1.supabase
                .from('signoff_sessions')
                .update({
                status: 'in_review',
                updatedAt: new Date().toISOString(),
            })
                .eq('id', sessionId)
                .eq('status', 'sent');
            // Get session data
            const { data: sessionData, error: sessionError } = await supabaseClient_1.supabase
                .from('signoff_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();
            if (sessionError || !sessionData) {
                throw new Error('Failed to fetch session data');
            }
            // Get assets in this session
            const { data: signoffAssets, error: assetsError } = await supabaseClient_1.supabase
                .from('signoff_assets')
                .select('*, assets(*)')
                .eq('sessionId', sessionId);
            if (assetsError) {
                throw new Error('Failed to fetch session assets');
            }
            // Format client view
            const clientView = {
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
                assets: signoffAssets.map((item) => ({
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
        }
        catch (error) {
            console.error('Error in getClientView:', error);
            return null;
        }
    }
    /**
     * Process client feedback and update asset statuses
     */
    async processClientFeedback(sessionId, token, feedback, assetStatuses) {
        try {
            // Validate access token
            const isValid = await this.validateAccessToken(sessionId, token);
            if (!isValid) {
                return null;
            }
            // Update session status based on feedback
            const approvedAssets = assetStatuses.filter(a => a.status === 'approved').map(a => a.assetId);
            const rejectedAssets = assetStatuses.filter(a => a.status === 'rejected').map(a => a.assetId);
            let sessionStatus;
            if (rejectedAssets.length === 0) {
                sessionStatus = 'approved';
            }
            else if (approvedAssets.length === 0) {
                sessionStatus = 'rejected';
            }
            else {
                sessionStatus = 'partial';
            }
            // Update session with feedback
            const { data: sessionData, error: sessionError } = await supabaseClient_1.supabase
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
                await supabaseClient_1.supabase
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
            const signoffResponse = {
                sessionId,
                clientName: sessionData.clientName,
                clientEmail: sessionData.clientEmail,
                feedback,
                status: sessionStatus,
                approvedAssets,
                rejectedAssets,
            };
            const { data: responseData, error: responseError } = await supabaseClient_1.supabase
                .from('signoff_responses')
                .insert([{
                    ...signoffResponse,
                    id: (0, uuid_1.v4)(),
                    createdAt: new Date().toISOString(),
                }])
                .select()
                .single();
            if (responseError) {
                throw new Error(`Failed to create response record: ${responseError.message}`);
            }
            return responseData;
        }
        catch (error) {
            console.error('Error in processClientFeedback:', error);
            return null;
        }
    }
    /**
     * List all sign-off sessions for a campaign
     */
    async listCampaignSignoffSessions(campaignId) {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('signoff_sessions')
                .select('*')
                .eq('campaignId', campaignId)
                .order('createdAt', { ascending: false });
            if (error) {
                throw new Error(`Failed to list signoff sessions: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error('Error in listCampaignSignoffSessions:', error);
            throw new Error(`Failed to list signoff sessions: ${error.message}`);
        }
    }
}
exports.SignoffService = SignoffService;
exports.signoffService = new SignoffService();
