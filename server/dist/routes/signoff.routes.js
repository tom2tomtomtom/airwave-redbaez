"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const supabaseClient_1 = require("../db/supabaseClient");
const uuid_1 = require("uuid");
const router = express_1.default.Router();
// Create a new sign-off request
router.post('/', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { campaignId, title, type, content } = req.body;
        if (!campaignId || !title || !type || !content) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        const signOffItem = {
            id: (0, uuid_1.v4)(),
            campaignId,
            title,
            type,
            content,
            status: 'pending',
            version: 1,
            createdBy: req.user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        // Save to database
        const { data, error } = await supabaseClient_1.supabase
            .from('sign_off_items')
            .insert([signOffItem])
            .select();
        if (error) {
            console.error('Error creating sign-off item:', error);
            throw new Error('Failed to create sign-off item');
        }
        // Generate a unique client access link
        const clientAccessToken = (0, uuid_1.v4)();
        // Save the client access token
        const { error: tokenError } = await supabaseClient_1.supabase
            .from('client_access_tokens')
            .insert([{
                token: clientAccessToken,
                sign_off_item_id: signOffItem.id,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                created_at: new Date().toISOString()
            }]);
        if (tokenError) {
            console.error('Error creating client access token:', tokenError);
            // Continue anyway, as the sign-off item was created
        }
        // In a real implementation, send an email to the client with the access link
        // sendClientEmail(signOffItem, clientAccessToken);
        res.status(201).json({
            success: true,
            message: 'Sign-off request created successfully',
            data: {
                signOffItem: data[0],
                clientAccessLink: `${process.env.CLIENT_PORTAL_URL || 'http://localhost:3002'}/client/signoff/${clientAccessToken}`
            }
        });
    }
    catch (error) {
        console.error('Error creating sign-off request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create sign-off request',
            error: error.message
        });
    }
});
// Get sign-off items for a campaign
router.get('/campaign/:campaignId', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { data, error } = await supabaseClient_1.supabase
            .from('sign_off_items')
            .select('*')
            .eq('campaignId', campaignId)
            .order('createdAt', { ascending: false });
        if (error) {
            console.error('Error fetching sign-off items:', error);
            throw new Error('Failed to fetch sign-off items');
        }
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error('Error fetching sign-off items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sign-off items',
            error: error.message
        });
    }
});
// Get a specific sign-off item
router.get('/:id', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseClient_1.supabase
            .from('sign_off_items')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            console.error('Error fetching sign-off item:', error);
            throw new Error('Failed to fetch sign-off item');
        }
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error('Error fetching sign-off item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sign-off item',
            error: error.message
        });
    }
});
// Update a sign-off item status
router.put('/:id/status', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comments } = req.body;
        if (!status || !['pending', 'approved', 'rejected', 'revision'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }
        // Update the sign-off item
        const { data, error } = await supabaseClient_1.supabase
            .from('sign_off_items')
            .update({
            status,
            comments: comments || null,
            updatedAt: new Date().toISOString()
        })
            .eq('id', id)
            .select();
        if (error) {
            console.error('Error updating sign-off item:', error);
            throw new Error('Failed to update sign-off item');
        }
        // In a real implementation, send a notification email about the status change
        // sendStatusUpdateEmail(data![0]);
        res.json({
            success: true,
            message: 'Sign-off status updated successfully',
            data: data[0]
        });
    }
    catch (error) {
        console.error('Error updating sign-off status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update sign-off status',
            error: error.message
        });
    }
});
// Create a new version of a sign-off item
router.post('/:id/versions', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, title } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Content is required for new version'
            });
        }
        // Get the current sign-off item
        const { data: currentItem, error: fetchError } = await supabaseClient_1.supabase
            .from('sign_off_items')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError) {
            console.error('Error fetching sign-off item:', fetchError);
            throw new Error('Failed to fetch sign-off item');
        }
        // Create a new version
        const { data, error } = await supabaseClient_1.supabase
            .from('sign_off_items')
            .update({
            content,
            title: title || currentItem.title,
            version: currentItem.version + 1,
            status: 'pending', // Reset status for new version
            comments: null, // Clear previous comments
            updatedAt: new Date().toISOString()
        })
            .eq('id', id)
            .select();
        if (error) {
            console.error('Error creating new version:', error);
            throw new Error('Failed to create new version');
        }
        // In a real implementation, notify the client about the new version
        // sendNewVersionEmail(data![0]);
        res.json({
            success: true,
            message: 'New version created successfully',
            data: data[0]
        });
    }
    catch (error) {
        console.error('Error creating new version:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create new version',
            error: error.message
        });
    }
});
// Client portal access (no authentication required)
router.get('/client/:token', async (req, res) => {
    try {
        const { token } = req.params;
        // Validate the token
        const { data: tokenData, error: tokenError } = await supabaseClient_1.supabase
            .from('client_access_tokens')
            .select('*')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();
        if (tokenError || !tokenData) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired access token'
            });
        }
        // Get the sign-off item
        const { data: itemData, error: itemError } = await supabaseClient_1.supabase
            .from('sign_off_items')
            .select('*')
            .eq('id', tokenData.sign_off_item_id)
            .single();
        if (itemError) {
            console.error('Error fetching sign-off item:', itemError);
            throw new Error('Failed to fetch sign-off item');
        }
        res.json({
            success: true,
            data: itemData
        });
    }
    catch (error) {
        console.error('Error accessing client portal:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to access client portal',
            error: error.message
        });
    }
});
// Client approval/rejection (no authentication required, token-based)
router.put('/client/:token/respond', async (req, res) => {
    try {
        const { token } = req.params;
        const { status, comments } = req.body;
        if (!status || !['approved', 'rejected', 'revision'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }
        // Validate the token
        const { data: tokenData, error: tokenError } = await supabaseClient_1.supabase
            .from('client_access_tokens')
            .select('*')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();
        if (tokenError || !tokenData) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired access token'
            });
        }
        // Update the sign-off item
        const { data, error } = await supabaseClient_1.supabase
            .from('sign_off_items')
            .update({
            status,
            comments: comments || null,
            updatedAt: new Date().toISOString()
        })
            .eq('id', tokenData.sign_off_item_id)
            .select();
        if (error) {
            console.error('Error updating sign-off item:', error);
            throw new Error('Failed to update sign-off item');
        }
        // In a real implementation, send a notification email about the client response
        // sendClientResponseEmail(data![0]);
        res.json({
            success: true,
            message: 'Response submitted successfully',
            data: data[0]
        });
    }
    catch (error) {
        console.error('Error submitting client response:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit response',
            error: error.message
        });
    }
});
exports.default = router;
