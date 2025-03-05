import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import { CreatomateService } from '../services/creatomateService';

const router = express.Router();
const creatomateService = new CreatomateService();

// Get all campaigns for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('created_by', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data.map(transformCampaignFromDb));
  } catch (error: any) {
    console.error('Error fetching campaigns:', error.message);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
});

// Get a single campaign by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Get campaign with executions
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        executions (*)
      `)
      .eq('id', req.params.id)
      .eq('created_by', req.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(transformCampaignFromDb(data));
  } catch (error: any) {
    console.error('Error fetching campaign:', error.message);
    res.status(500).json({ message: 'Failed to fetch campaign' });
  }
});

// Create a new campaign
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      name,
      description, 
      client, 
      startDate, 
      endDate, 
      platforms, 
      assets, 
      templates, 
      executions 
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Campaign name is required' });
    }

    // Insert campaign into database
    const { data, error } = await supabase
      .from('campaigns')
      .insert([
        {
          name,
          description,
          client,
          start_date: startDate,
          end_date: endDate,
          platforms,
          assets,
          templates,
          status: 'draft',
          created_by: req.user.id
        }
      ])
      .select()
      .single();

    if (error) throw error;

    const campaignId = data.id;

    // Insert executions if provided
    if (executions && executions.length > 0) {
      const executionsToInsert = executions.map(execution => ({
        campaign_id: campaignId,
        name: execution.name,
        template_id: execution.templateId,
        platform: execution.platform,
        asset_mappings: execution.assetMappings,
        settings: execution.settings,
        status: 'pending'
      }));

      const { data: executionData, error: executionsError } = await supabase
        .from('executions')
        .insert(executionsToInsert)
        .select();

      if (executionsError) throw executionsError;

      // Add executions to the campaign data
      data.executions = executionData;
    } else {
      data.executions = [];
    }

    res.status(201).json(transformCampaignFromDb(data));
  } catch (error: any) {
    console.error('Error creating campaign:', error.message);
    res.status(500).json({ message: 'Failed to create campaign' });
  }
});

// Update a campaign
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { 
      name,
      description, 
      client, 
      startDate, 
      endDate, 
      platforms, 
      assets, 
      templates 
    } = req.body;

    // Check ownership
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('created_by', req.user.id)
      .single();

    if (fetchError || !existingCampaign) {
      return res.status(404).json({ message: 'Campaign not found or permission denied' });
    }

    // Update the campaign
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        name,
        description,
        client,
        start_date: startDate,
        end_date: endDate,
        platforms,
        assets,
        templates,
        updated_at: new Date()
      })
      .eq('id', req.params.id)
      .select(`
        *,
        executions (*)
      `)
      .single();

    if (error) throw error;

    res.json(transformCampaignFromDb(data));
  } catch (error: any) {
    console.error('Error updating campaign:', error.message);
    res.status(500).json({ message: 'Failed to update campaign' });
  }
});

// Delete a campaign
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check ownership
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('created_by', req.user.id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ message: 'Campaign not found or permission denied' });
    }

    // Delete campaign's executions first (due to foreign key constraints)
    const { error: deleteExecutionsError } = await supabase
      .from('executions')
      .delete()
      .eq('campaign_id', req.params.id);

    if (deleteExecutionsError) throw deleteExecutionsError;

    // Delete the campaign
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting campaign:', error.message);
    res.status(500).json({ message: 'Failed to delete campaign' });
  }
});

// Add execution to campaign
router.post('/:id/executions', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const execution = req.body;

    // Check campaign ownership
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('created_by', req.user.id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ message: 'Campaign not found or permission denied' });
    }

    // Add execution
    const { data, error } = await supabase
      .from('executions')
      .insert([
        {
          campaign_id: campaignId,
          name: execution.name,
          template_id: execution.templateId,
          platform: execution.platform,
          asset_mappings: execution.assetMappings,
          settings: execution.settings,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(transformExecutionFromDb(data));
  } catch (error: any) {
    console.error('Error adding execution:', error.message);
    res.status(500).json({ message: 'Failed to add execution to campaign' });
  }
});

// Update execution
router.put('/:campaignId/executions/:executionId', authenticateToken, async (req, res) => {
  try {
    const { campaignId, executionId } = req.params;
    const executionUpdate = req.body;

    // Check campaign ownership
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('created_by', req.user.id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ message: 'Campaign not found or permission denied' });
    }

    // Update execution
    const { data, error } = await supabase
      .from('executions')
      .update({
        name: executionUpdate.name,
        template_id: executionUpdate.templateId,
        platform: executionUpdate.platform,
        asset_mappings: executionUpdate.assetMappings,
        settings: executionUpdate.settings,
        updated_at: new Date()
      })
      .eq('id', executionId)
      .eq('campaign_id', campaignId)
      .select()
      .single();

    if (error) throw error;

    res.json(transformExecutionFromDb(data));
  } catch (error: any) {
    console.error('Error updating execution:', error.message);
    res.status(500).json({ message: 'Failed to update execution' });
  }
});

// Delete execution
router.delete('/:campaignId/executions/:executionId', authenticateToken, async (req, res) => {
  try {
    const { campaignId, executionId } = req.params;

    // Check campaign ownership
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('created_by', req.user.id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ message: 'Campaign not found or permission denied' });
    }

    // Delete execution
    const { error } = await supabase
      .from('executions')
      .delete()
      .eq('id', executionId)
      .eq('campaign_id', campaignId);

    if (error) throw error;

    res.json({ message: 'Execution deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting execution:', error.message);
    res.status(500).json({ message: 'Failed to delete execution' });
  }
});

// Start rendering campaign executions
router.post('/:id/render', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;

    // Check campaign ownership
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select(`
        *,
        executions (*)
      `)
      .eq('id', campaignId)
      .eq('created_by', req.user.id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ message: 'Campaign not found or permission denied' });
    }

    // Update campaign status
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'rendering',
        updated_at: new Date()
      })
      .eq('id', campaignId);

    if (updateError) throw updateError;

    // Process each execution with Creatomate
    const renderResults = [];
    for (const execution of campaign.executions) {
      try {
        // Convert asset mappings to Creatomate modifications format
        const modifications = {};
        for (const mapping of execution.asset_mappings) {
          if (mapping.asset_id) {
            // If asset ID is provided, get the asset URL
            const { data: asset } = await supabase
              .from('assets')
              .select('url, content')
              .eq('id', mapping.asset_id)
              .single();

            if (asset) {
              if (asset.url) {
                modifications[mapping.parameter_name] = asset.url;
              } else if (asset.content) {
                modifications[mapping.parameter_name] = asset.content;
              }
            }
          } else if (mapping.value) {
            // Use the direct value
            modifications[mapping.parameter_name] = mapping.value;
          }
        }

        let renderResult;
        if (process.env.PROTOTYPE_MODE === 'true') {
          // Simulate render in prototype mode
          renderResult = {
            id: `mock-render-${Date.now()}`,
            status: 'queued'
          };
        } else {
          // Actual render with Creatomate
          renderResult = await creatomateService.renderVideo(
            execution.template_id,
            modifications
          );
        }

        // Update execution with render information
        await supabase
          .from('executions')
          .update({
            status: 'rendering',
            render_id: renderResult.id,
            updated_at: new Date()
          })
          .eq('id', execution.id);

        renderResults.push({
          executionId: execution.id,
          renderId: renderResult.id,
          status: renderResult.status
        });
      } catch (executionError) {
        console.error(`Error rendering execution ${execution.id}:`, executionError);
        
        // Update execution with error status
        await supabase
          .from('executions')
          .update({
            status: 'error',
            updated_at: new Date()
          })
          .eq('id', execution.id);
        
        renderResults.push({
          executionId: execution.id,
          status: 'error',
          error: executionError.message
        });
      }
    }

    res.json(renderResults);
  } catch (error: any) {
    console.error('Error rendering campaign:', error.message);
    res.status(500).json({ message: 'Failed to render campaign' });
    
    // Revert campaign status
    await supabase
      .from('campaigns')
      .update({
        status: 'draft'
      })
      .eq('id', req.params.id);
  }
});

// Helper function to transform campaign from database format to API format
function transformCampaignFromDb(campaign: any) {
  const transformed = {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description || '',
    client: campaign.client || '',
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    platforms: campaign.platforms || [],
    assets: campaign.assets || [],
    templates: campaign.templates || [],
    status: campaign.status,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
    createdBy: campaign.created_by,
    executions: campaign.executions ? campaign.executions.map(transformExecutionFromDb) : []
  };
  
  return transformed;
}

// Helper function to transform execution from database format to API format
function transformExecutionFromDb(execution: any) {
  return {
    id: execution.id,
    name: execution.name,
    templateId: execution.template_id,
    platform: execution.platform,
    assetMappings: execution.asset_mappings || [],
    settings: execution.settings || {},
    status: execution.status,
    renderId: execution.render_id,
    renderUrl: execution.render_url,
    thumbnailUrl: execution.thumbnail_url,
    createdAt: execution.created_at,
    updatedAt: execution.updated_at
  };
}

export default router;