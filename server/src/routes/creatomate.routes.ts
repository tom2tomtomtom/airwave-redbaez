import express from 'express';
import { creatomateService, RenderJob } from '../services/creatomateService';
import { checkAuth } from '../middleware/auth.middleware';
import { supabase } from '../db/supabaseClient';

const router = express.Router();

// Generate a video using Creatomate API
router.post('/generate', checkAuth, async (req, res) => {
  try {
    const { templateId, executionId, modifications, outputFormat = 'mp4' } = req.body;

    if (!templateId || !modifications) {
      return res.status(400).json({
        success: false,
        message: 'Template ID and modifications are required'
      });
    }

    console.log(`Generating content with template: ${templateId}, format: ${outputFormat}`);
    console.log('Modifications:', JSON.stringify(modifications));

    // Check if we're generating an image or a video based on the outputFormat
    let renderJob;
    
    if (outputFormat === 'jpg' || outputFormat === 'png') {
      console.log('Generating an image');
      // We're generating an image
      renderJob = await creatomateService.generateImage({
        templateId,
        outputFormat,
        modifications
      });
    } else {
      console.log('Generating a video');
      // We're generating a video
      renderJob = await creatomateService.generateVideo({
        templateId,
        outputFormat,
        modifications
      });
    }

    console.log(`Generated job with ID: ${renderJob.id}`);

    // If we have an execution ID, update the execution in the database
    if (executionId) {
      const { error } = await supabase
        .from('executions')
        .update({
          status: 'rendering',
          render_job_id: renderJob.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', executionId);

      if (error) {
        console.error('Error updating execution:', error);
        // Continue anyway, as the rendering has already started
      }
    }

    res.json({
      success: true,
      message: 'Video generation started',
      data: {
        jobId: renderJob.id,
        status: renderJob.status
      }
    });
  } catch (error: any) {
    console.error('Generate video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate video',
      error: error.message
    });
  }
});

// Generate a preview (faster, lower quality)
router.post('/preview', checkAuth, async (req, res) => {
  try {
    const { templateId, modifications } = req.body;

    if (!templateId || !modifications) {
      return res.status(400).json({
        success: false,
        message: 'Template ID and modifications are required'
      });
    }

    // Generate the preview
    const previewJob = await creatomateService.generatePreview({
      templateId,
      outputFormat: 'mp4',
      modifications
    });

    res.json({
      success: true,
      message: 'Preview generation started',
      data: {
        jobId: previewJob.id,
        status: previewJob.status,
        url: previewJob.url,
        thumbnailUrl: previewJob.thumbnailUrl
      }
    });
  } catch (error: any) {
    console.error('Preview generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate preview',
      error: error.message
    });
  }
});

// Check the status of a render job
router.get('/render/:jobId', checkAuth, async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId || jobId === 'undefined') {
      console.error('Invalid jobId provided to /render endpoint:', jobId);
      return res.status(400).json({
        success: false,
        message: 'Valid job ID is required'
      });
    }

    console.log(`Checking render status for job: ${jobId}`);
    const job = await creatomateService.checkRenderStatus(jobId);

    // Ensure we return a valid job object
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return res.status(404).json({
        success: false,
        message: `Job with ID ${jobId} not found`
      });
    }

    console.log(`Job ${jobId} status: ${job.status}`);
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        url: job.url,
        thumbnailUrl: job.thumbnailUrl,
        error: job.error
      }
    });

    // If the job is completed, update the execution in the database if it exists
    if (job.status === 'completed' || job.status === 'failed') {
      // Find execution with this render job ID
      const { data: execution, error: findError } = await supabase
        .from('executions')
        .select('id')
        .eq('render_job_id', jobId)
        .single();

      if (findError) {
        console.error('Error finding execution:', findError);
        return; // No execution found, or error
      }

      if (execution) {
        const { error: updateError } = await supabase
          .from('executions')
          .update({
            status: job.status === 'completed' ? 'completed' : 'failed',
            url: job.url,
            thumbnail_url: job.thumbnailUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        if (updateError) {
          console.error('Error updating execution status:', updateError);
        }
      }
    }
  } catch (error: any) {
    console.error('Check render status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check render status',
      error: error.message
    });
  }
});

// GET - Get all templates from Creatomate API
router.get('/templates', checkAuth, async (req, res) => {
  try {
    // In production, you'd fetch templates from Creatomate API
    // For the prototype, we'll return mock data
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock Creatomate templates
    const templates = [
      {
        id: 'cm-template-1',
        name: 'Product Showcase - 16:9',
        source: {/* Template JSON structure */},
        thumbnail: 'https://example.com/thumbnails/product-showcase-16-9.jpg',
        aspectRatio: '16:9',
        duration: 30
      },
      {
        id: 'cm-template-2',
        name: 'Product Showcase - 9:16',
        source: {/* Template JSON structure */},
        thumbnail: 'https://example.com/thumbnails/product-showcase-9-16.jpg',
        aspectRatio: '9:16',
        duration: 30
      },
      {
        id: 'cm-template-3',
        name: 'Product Showcase - 1:1',
        source: {/* Template JSON structure */},
        thumbnail: 'https://example.com/thumbnails/product-showcase-1-1.jpg',
        aspectRatio: '1:1',
        duration: 30
      }
    ];
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error: any) {
    console.error('Creatomate templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

// POST - Generate multiple ad variations at once (batch generation)
router.post('/batch', checkAuth, async (req, res) => {
  try {
    const {
      campaignId,
      templates,
      assetSets,
      outputFormats = ['mp4']
    } = req.body;
    
    // Validate required fields
    if (!templates || !assetSets || !campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: templates, assetSets and campaignId are required'
      });
    }
    
    // Create a job for each combination of template, asset set, and format
    const jobs = [];
    
    for (const template of templates) {
      for (const assetSet of assetSets) {
        for (const format of outputFormats) {
          // Start the render job
          const renderJob = await creatomateService.generateVideo({
            templateId: template.id,
            modifications: assetSet,
            outputFormat: format
          });
          
          jobs.push({
            jobId: renderJob.id,
            status: renderJob.status,
            templateId: template.id,
            outputFormat: format
          });
        }
      }
    }
    
    res.json({
      success: true,
      message: `Batch generation started with ${jobs.length} jobs`,
      data: {
        campaignId,
        jobCount: jobs.length,
        jobs
      }
    });
  } catch (error: any) {
    console.error('Creatomate batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start batch generation',
      error: error.message
    });
  }
});

// POST - Generate platform-specific formats
router.post('/platform-formats', checkAuth, async (req, res) => {
  try {
    const {
      templateId,
      modifications,
      platforms = ['facebook', 'instagram', 'tiktok'] // Default platforms
    } = req.body;
    
    // Map platforms to their required formats
    const platformFormats: Record<string, string[]> = {
      facebook: ['mp4', 'mov'],
      instagram: ['mp4', 'mov'],
      tiktok: ['mp4'],
      youtube: ['mp4'],
      twitter: ['mp4']
    };
    
    // Get unique formats needed for the requested platforms
    const outputFormats = Array.from(
      new Set(
        platforms.flatMap((platform: string) => 
          platformFormats[platform] || ['mp4'] // Default to mp4 if platform not found
        )
      )
    );
    
    // Start generation for each format
    const jobs = [];
    
    for (const format of outputFormats) {
      const renderJob = await creatomateService.generateVideo({
        templateId,
        modifications,
        outputFormat: format as string
      });
      
      jobs.push({
        jobId: renderJob.id,
        status: renderJob.status,
        format
      });
    }
    
    res.json({
      success: true,
      message: `Generated formats for ${platforms.length} platforms`,
      data: {
        platforms,
        jobs
      }
    });
  } catch (error: any) {
    console.error('Creatomate platform formats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate platform-specific formats',
      error: error.message
    });
  }
});

// Webhook endpoint for Creatomate to send render status updates
router.post('/webhook', async (req, res) => {
  try {
    const { jobId, status, url, thumbnailUrl, error } = req.body;

    if (!jobId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Job ID and status are required'
      });
    }

    console.log(`Webhook received for job ${jobId}, status: ${status}`);

    // Find execution with this render job ID
    const { data: execution, error: findError } = await supabase
      .from('executions')
      .select('id')
      .eq('render_job_id', jobId)
      .single();

    if (!findError && execution) {
      const { error: updateError } = await supabase
        .from('executions')
        .update({
          status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'rendering',
          url: url || null,
          thumbnail_url: thumbnailUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', execution.id);

      if (updateError) {
        console.error('Error updating execution status from webhook:', updateError);
      }
    }

    // Respond to Creatomate
    res.status(200).json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
});

// Status check endpoint for API health monitoring
router.get('/status', async (req, res) => {
  try {
    // Check Creatomate connection
    const isConnected = creatomateService.isConnected();
    
    return res.status(200).json({
      connected: isConnected,
      apiKey: process.env.CREATOMATE_API_KEY ? 'configured' : 'missing',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;