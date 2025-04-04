import express from 'express';
import { creatomateService, RenderJob } from '../services/creatomateService';
import { checkAuth } from '../middleware/auth.middleware';
import { supabase } from '../db/supabaseClient';
import { ApiError } from '../utils/ApiError'; 
import { ErrorCode } from '../types/errorTypes'; 
import { logger } from '../utils/logger';

const router = express.Router();

// Generate a video using Creatomate API
router.post('/generate', checkAuth, async (req, res, next) => {
  try {
    const { templateId, executionId, modifications, outputFormat = 'mp4' } = req.body;

    if (!templateId || !modifications) {
      return next(new ApiError(ErrorCode.VALIDATION_FAILED, 'Template ID and modifications are required for generation.'));
    }

    logger.info(`Generating content with template: ${templateId}, format: ${outputFormat}`);
    logger.debug('Modifications:', JSON.stringify(modifications));

    // Check if we're generating an image or a video based on the outputFormat
    let renderJob;
    
    if (outputFormat === 'jpg' || outputFormat === 'png') {
      logger.info('Generating an image');
      // We're generating an image
      renderJob = await creatomateService.generateImage({
        templateId,
        outputFormat,
        modifications
      });
    } else {
      logger.info('Generating a video');
      // We're generating a video
      renderJob = await creatomateService.generateVideo({
        templateId,
        outputFormat,
        modifications
      });
    }

    logger.info(`Generated job with ID: ${renderJob.id}`);

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
        logger.error('Error updating execution:', error);
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
    logger.error('Error in POST /generate:', error);
    next(error);
  }
});

// Generate a preview (faster, lower quality)
router.post('/preview', checkAuth, async (req, res, next) => {
  try {
    const { templateId, modifications } = req.body;

    if (!templateId || !modifications) {
      return next(new ApiError(ErrorCode.VALIDATION_FAILED, 'Template ID and modifications are required for preview.'));
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
    logger.error('Preview generation error:', error);
    next(error);
  }
});

// Check the status of a render job
router.get('/render/:jobId', checkAuth, async (req, res, next) => {
  try {
    const { jobId } = req.params;

    if (!jobId || jobId === 'undefined') {
      logger.error('Invalid jobId provided to /render endpoint:', jobId);
      return next(new ApiError(ErrorCode.VALIDATION_FAILED, 'A valid Creatomate job ID is required.'));
    }

    logger.info(`Checking render status for job: ${jobId}`);
    const job = await creatomateService.checkRenderStatus(jobId);

    // Ensure we return a valid job object
    if (!job) {
      logger.error(`Job ${jobId} not found`);
      return next(new ApiError(
        ErrorCode.RESOURCE_NOT_FOUND,
        `Creatomate job with ID ${jobId} not found.`,
        { jobId, service: 'Creatomate' }
      ));
    }

    logger.info(`Job ${jobId} status: ${job.status}`);
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
        logger.error('Error finding execution:', findError);
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
          logger.error('Error updating execution status:', updateError);
        }
      }
    }
  } catch (error: any) {
    logger.error('Check render status error:', error);
    next(error);
  }
});

// GET - Get all templates from Creatomate API
router.get('/templates', checkAuth, async (req, res, next) => {
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
    logger.error('Creatomate templates error:', error);
    next(error);
  }
});

// POST - Generate multiple ad variations at once (batch generation)
router.post('/batch', checkAuth, async (req, res, next) => {
  try {
    const {
      campaignId,
      templates,
      assetSets,
      outputFormats = ['mp4']
    } = req.body;
    
    // Validate required fields
    if (!templates || !assetSets || !campaignId) {
      return next(new ApiError(ErrorCode.VALIDATION_FAILED, 'Missing required fields: templates, assetSets and campaignId are required for batch generation.'));
    }
    
    // Create jobs in batches instead of nested loops to improve performance
    const jobs = [];
    
    // Pre-calculate all combinations to avoid nested loops during API calls
    const combinations = [];
    templates.forEach(template => {
      assetSets.forEach(assetSet => {
        outputFormats.forEach(format => {
          combinations.push({
            templateId: template.id,
            assetSet,
            format
          });
        });
      });
    });
    
    // Process combinations in batches to avoid overwhelming the API
    const BATCH_SIZE = 5;
    for (let i = 0; i < combinations.length; i += BATCH_SIZE) {
      const batch = combinations.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      const batchJobs = await Promise.all(
        batch.map(({ templateId, assetSet, format }) => 
          creatomateService.generateVideo({
            templateId,
            modifications: assetSet,
            outputFormat: format
          })
        )
      );
      
      // Add batch results to jobs array
      batchJobs.forEach((renderJob, index) => {
        jobs.push({
          jobId: renderJob.id,
          status: renderJob.status,
          templateId: batch[index].templateId,
          outputFormat: batch[index].format
        });
      });
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
    logger.error('Creatomate batch error:', error);
    next(error);
  }
});

// POST - Generate platform-specific formats
router.post('/platform-formats', checkAuth, async (req, res, next) => {
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
    
    // Start generation for each format in parallel
    const jobs = await Promise.all(
      outputFormats.map(format => 
        creatomateService.generateVideo({
          templateId,
          modifications,
          outputFormat: format as string
        })
      )
    );
    
    // Map results to response format
    const jobResults = jobs.map((renderJob, index) => ({
      jobId: renderJob.id,
      status: renderJob.status,
      format: outputFormats[index]
    }));
    
    res.json({
      success: true,
      message: `Generated formats for ${platforms.length} platforms`,
      data: {
        platforms,
        jobs: jobResults
      }
    });
  } catch (error: any) {
    logger.error('Creatomate platform formats error:', error);
    next(error);
  }
});

// Webhook endpoint for Creatomate to send render status updates
router.post('/webhook', async (req, res, next) => {
  try {
    const { jobId, status, url, thumbnailUrl, error } = req.body;

    if (!jobId || !status) {
      logger.warn('Received invalid webhook payload:', req.body);
      return next(new ApiError(ErrorCode.VALIDATION_FAILED, 'Webhook requires Job ID and status.'));
    }

    logger.info(`Webhook received for job ${jobId}, status: ${status}`);

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
        logger.error('Error updating execution status from webhook:', updateError);
      }
    }

    // Respond to Creatomate
    res.status(200).json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error: any) {
    logger.error('Webhook processing error:', error);
    next(error);
  }
});

// Status check endpoint for API health monitoring
router.get('/status', async (req, res, next) => {
  try {
    // Check Creatomate connection
    const isConnected = creatomateService.isConnected();
    
    return res.status(200).json({
      connected: isConnected,
      apiKey: process.env.CREATOMATE_API_KEY ? 'configured' : 'missing',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error checking Creatomate status:', error);
    next(error);
  }
});

export default router;
