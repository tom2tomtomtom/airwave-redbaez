"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const signoffService_1 = require("../services/signoffService");
const router = express_1.default.Router();
// Create a new signoff session
router.post('/create', auth_middleware_1.checkAuth, async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new Error('User not authenticated'));
        }
        const { campaignId, title, description, clientEmail, clientName, expiresAt, matrixId, assetIds } = req.body;
        if (!campaignId || !clientEmail || !clientName || !assetIds || !assetIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: campaignId, clientEmail, clientName, assetIds'
            });
        }
        // Create a new signoff session
        const session = await signoffService_1.signoffService.createSignoffSession({
            campaignId,
            title,
            description,
            clientEmail,
            clientName,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
            matrixId
        }, req.user.userId);
        // Add assets to the session
        await signoffService_1.signoffService.addAssetsToSession(session.id, assetIds);
        res.json({
            success: true,
            message: 'Signoff session created successfully',
            data: { sessionId: session.id }
        });
    }
    catch (error) {
        console.error('Error creating signoff session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create signoff session',
            error: error.message
        });
    }
});
// Send a signoff session to client
router.post('/:id/send', auth_middleware_1.checkAuth, async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new Error('User not authenticated'));
        }
        const { id } = req.params;
        // Send the signoff session
        const session = await signoffService_1.signoffService.sendSignoffSession(id);
        res.json({
            success: true,
            message: 'Signoff session sent to client successfully',
            data: {
                sessionId: session.id,
                reviewUrl: session.reviewUrl
            }
        });
    }
    catch (error) {
        console.error('Error sending signoff session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send signoff session',
            error: error.message
        });
    }
});
// Get all signoff sessions for a campaign
router.get('/campaign/:campaignId', auth_middleware_1.checkAuth, async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new Error('User not authenticated'));
        }
        const { campaignId } = req.params;
        const sessions = await signoffService_1.signoffService.listCampaignSignoffSessions(campaignId);
        res.json({
            success: true,
            data: sessions
        });
    }
    catch (error) {
        console.error('Error fetching signoff sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch signoff sessions',
            error: error.message
        });
    }
});
// Get a specific signoff session
router.get('/:id', auth_middleware_1.checkAuth, async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new Error('User not authenticated'));
        }
        const { id } = req.params;
        const session = await signoffService_1.signoffService.getSignoffSessionById(id);
        res.json({
            success: true,
            data: session
        });
    }
    catch (error) {
        console.error('Error fetching signoff session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch signoff session',
            error: error.message
        });
    }
});
// Client view of signoff session (no auth required, uses access token)
router.get('/client/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }
        // Get client view of session
        const sessionView = await signoffService_1.signoffService.getClientView(id, token);
        if (!sessionView) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired access token'
            });
        }
        res.json({
            success: true,
            data: sessionView
        });
    }
    catch (error) {
        console.error('Error fetching client view:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch client view',
            error: error.message
        });
    }
});
// Process client feedback
router.post('/client/:id/feedback', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { token, feedback, assetStatuses } = req.body;
        if (!token || !assetStatuses || !Array.isArray(assetStatuses)) {
            return res.status(400).json({
                success: false,
                message: 'Token and asset statuses are required'
            });
        }
        // Process client feedback
        const response = await signoffService_1.signoffService.processClientFeedback(id, token, feedback || '', assetStatuses);
        if (!response) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired access token'
            });
        }
        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            data: response
        });
    }
    catch (error) {
        console.error('Error processing client feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process feedback',
            error: error.message
        });
    }
});
exports.default = router;
