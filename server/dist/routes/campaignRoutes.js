"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const supabaseClient_1 = require("../db/supabaseClient");
const creatomateService_1 = require("../services/creatomateService");
const router = express_1.default.Router();
// Get all campaigns for the current user
router.get('/', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { data, error } = await supabaseClient_1.supabase
            .from('campaigns')
            .select('*')
            .eq('owner_id', req.user.id)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json(data.map(transformCampaignFromDb));
    }
    catch (error) {
        console.error('Error fetching campaigns:', error.message);
        res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
});
// Get a single campaign by ID
router.get('/:id', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        // Get campaign with executions
        const { data, error } = await supabaseClient_1.supabase
            .from('campaigns')
            .select(`
        *,
        executions (*)
      `)
            .eq('id', req.params.id)
            .eq('owner_id', req.user.id)
            .single();
        if (error)
            throw error;
        if (!data) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json(transformCampaignFromDb(data));
    }
    catch (error) {
        console.error('Error fetching campaign:', error.message);
        res.status(500).json({ message: 'Failed to fetch campaign' });
    }
});
// Create a new campaign
router.post('/', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { name, description, client, startDate, endDate, platforms, tags } = req.body;
        // Validate required fields
        if (!name) {
            return res.status(400).json({ message: 'Campaign name is required' });
        }
        // Insert campaign into database
        const { data, error } = await supabaseClient_1.supabase
            .from('campaigns')
            .insert([
            {
                name,
                description,
                client,
                start_date: startDate,
                end_date: endDate,
                platforms,
                tags,
                status: 'draft',
                owner_id: req.user.id
            }
        ])
            .select()
            .single();
        if (error)
            throw error;
        // Add empty executions array for consistency
        data.executions = [];
        res.status(201).json(transformCampaignFromDb(data));
    }
    catch (error) {
        console.error('Error creating campaign:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create campaign',
            error: error.message
        });
    }
});
// Update a campaign
router.put('/:id', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { name, description, client, startDate, endDate, platforms, tags, status } = req.body;
        // Check ownership
        const { data: existingCampaign, error: fetchError } = await supabaseClient_1.supabase
            .from('campaigns')
            .select('*')
            .eq('id', req.params.id)
            .eq('owner_id', req.user.id)
            .single();
        if (fetchError || !existingCampaign) {
            return res.status(404).json({ message: 'Campaign not found or permission denied' });
        }
        // Update the campaign
        const { data, error } = await supabaseClient_1.supabase
            .from('campaigns')
            .update({
            name,
            description,
            client,
            start_date: startDate,
            end_date: endDate,
            platforms,
            tags,
            status: status || existingCampaign.status,
            updated_at: new Date().toISOString()
        })
            .eq('id', req.params.id)
            .select(`
        *,
        executions (*)
      `)
            .single();
        if (error)
            throw error;
        res.json(transformCampaignFromDb(data));
    }
    catch (error) {
        console.error('Error updating campaign:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update campaign',
            error: error.message
        });
    }
});
// Delete a campaign
router.delete('/:id', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        // Check ownership
        const { data: campaign, error: fetchError } = await supabaseClient_1.supabase
            .from('campaigns')
            .select('*')
            .eq('id', req.params.id)
            .eq('owner_id', req.user.id)
            .single();
        if (fetchError || !campaign) {
            return res.status(404).json({ message: 'Campaign not found or permission denied' });
        }
        // Delete campaign's executions first (due to foreign key constraints)
        const { error: deleteExecutionsError } = await supabaseClient_1.supabase
            .from('executions')
            .delete()
            .eq('campaign_id', req.params.id);
        if (deleteExecutionsError)
            throw deleteExecutionsError;
        // Delete the campaign
        const { error } = await supabaseClient_1.supabase
            .from('campaigns')
            .delete()
            .eq('id', req.params.id);
        if (error)
            throw error;
        res.json({
            success: true,
            message: 'Campaign deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting campaign:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete campaign',
            error: error.message
        });
    }
});
// Add execution to campaign
router.post('/:id/executions', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const campaignId = req.params.id;
        const { name, templateId, platform, format, assets } = req.body;
        // Check campaign ownership
        const { data: campaign, error: fetchError } = await supabaseClient_1.supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .eq('owner_id', req.user.id)
            .single();
        if (fetchError || !campaign) {
            return res.status(404).json({ message: 'Campaign not found or permission denied' });
        }
        // Add execution
        const { data, error } = await supabaseClient_1.supabase
            .from('executions')
            .insert([
            {
                campaign_id: campaignId,
                name,
                template_id: templateId,
                platform,
                format,
                assets,
                status: 'draft',
                owner_id: req.user.id
            }
        ])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({
            success: true,
            data: transformExecutionFromDb(data)
        });
    }
    catch (error) {
        console.error('Error adding execution:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to add execution to campaign',
            error: error.message
        });
    }
});
// Start rendering campaign executions
router.post('/:id/render', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const campaignId = req.params.id;
        // Check campaign ownership
        const { data: campaign, error: fetchError } = await supabaseClient_1.supabase
            .from('campaigns')
            .select(`
        *,
        executions (*)
      `)
            .eq('id', campaignId)
            .eq('owner_id', req.user.id)
            .single();
        if (fetchError || !campaign) {
            return res.status(404).json({ message: 'Campaign not found or permission denied' });
        }
        // Update campaign status
        const { error: updateError } = await supabaseClient_1.supabase
            .from('campaigns')
            .update({
            status: 'active',
            updated_at: new Date().toISOString()
        })
            .eq('id', campaignId);
        if (updateError)
            throw updateError;
        // Process each execution with Creatomate
        const renderResults = [];
        for (const execution of campaign.executions) {
            try {
                // Convert assets to Creatomate modifications format
                const modifications = {};
                if (execution.assets && Array.isArray(execution.assets)) {
                    for (const asset of execution.assets) {
                        if (asset.slotId && asset.assetId) {
                            // Get the asset from the database
                            const { data: assetData } = await supabaseClient_1.supabase
                                .from('assets')
                                .select('url, content, type')
                                .eq('id', asset.assetId)
                                .single();
                            if (assetData) {
                                if (assetData.type === 'text' && assetData.content) {
                                    modifications[asset.slotId] = assetData.content;
                                }
                                else if (assetData.url) {
                                    modifications[asset.slotId] = assetData.url;
                                }
                            }
                        }
                    }
                }
                // Start the render
                const renderJob = await creatomateService_1.creatomateService.generateVideo({
                    templateId: execution.template_id,
                    modifications,
                    outputFormat: execution.format || 'mp4'
                });
                // Update execution with render information
                await supabaseClient_1.supabase
                    .from('executions')
                    .update({
                    status: 'rendering',
                    render_job_id: renderJob.id,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', execution.id);
                renderResults.push({
                    executionId: execution.id,
                    jobId: renderJob.id,
                    status: renderJob.status
                });
            }
            catch (executionError) {
                console.error(`Error rendering execution ${execution.id}:`, executionError);
                // Update execution with error status
                await supabaseClient_1.supabase
                    .from('executions')
                    .update({
                    status: 'failed',
                    updated_at: new Date().toISOString()
                })
                    .eq('id', execution.id);
                renderResults.push({
                    executionId: execution.id,
                    status: 'failed',
                    error: executionError.message
                });
            }
        }
        res.json({
            success: true,
            message: `Started rendering ${renderResults.length} executions`,
            data: renderResults
        });
    }
    catch (error) {
        console.error('Error rendering campaign:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to render campaign',
            error: error.message
        });
        // Revert campaign status
        await supabaseClient_1.supabase
            .from('campaigns')
            .update({
            status: 'draft',
            updated_at: new Date().toISOString()
        })
            .eq('id', req.params.id);
    }
});
// Helper function to transform campaign from database format to API format
function transformCampaignFromDb(campaign) {
    return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description || '',
        client: campaign.client || '',
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        platforms: campaign.platforms || [],
        tags: campaign.tags || [],
        status: campaign.status,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
        ownerId: campaign.owner_id,
        executions: campaign.executions ? campaign.executions.map(transformExecutionFromDb) : []
    };
}
// Helper function to transform execution from database format to API format
function transformExecutionFromDb(execution) {
    return {
        id: execution.id,
        name: execution.name,
        campaignId: execution.campaign_id,
        templateId: execution.template_id,
        platform: execution.platform,
        format: execution.format,
        assets: execution.assets || [],
        status: execution.status,
        renderJobId: execution.render_job_id,
        url: execution.url,
        thumbnailUrl: execution.thumbnail_url,
        createdAt: execution.created_at,
        updatedAt: execution.updated_at,
        ownerId: execution.owner_id
    };
}
exports.default = router;
