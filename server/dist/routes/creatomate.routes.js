"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const creatomateService_1 = require("../services/creatomateService");
const auth_middleware_1 = require("../middleware/auth.middleware");
const supabaseClient_1 = require("../db/supabaseClient");
const ApiError_1 = require("../utils/ApiError");
const errorTypes_1 = require("../types/errorTypes");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Generate a video using Creatomate API
router.post('/generate', auth_middleware_1.checkAuth, async (req, res, next) => {
    try {
        const { templateId, executionId, modifications, outputFormat = 'mp4' } = req.body;
        if (!templateId || !modifications) {
            return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.VALIDATION_FAILED, 'Template ID and modifications are required for generation.'));
        }
        logger_1.logger.info(`Generating content with template: ${templateId}, format: ${outputFormat}`);
        logger_1.logger.debug('Modifications:', JSON.stringify(modifications));
        // Check if we're generating an image or a video based on the outputFormat
        let renderJob;
        if (outputFormat === 'jpg' || outputFormat === 'png') {
            logger_1.logger.info('Generating an image');
            // We're generating an image
            renderJob = await creatomateService_1.creatomateService.generateImage({
                templateId,
                outputFormat,
                modifications
            });
        }
        else {
            logger_1.logger.info('Generating a video');
            // We're generating a video
            renderJob = await creatomateService_1.creatomateService.generateVideo({
                templateId,
                outputFormat,
                modifications
            });
        }
        logger_1.logger.info(`Generated job with ID: ${renderJob.id}`);
        // If we have an execution ID, update the execution in the database
        if (executionId) {
            const { error } = await supabaseClient_1.supabase
                .from('executions')
                .update({
                status: 'rendering',
                render_job_id: renderJob.id,
                updated_at: new Date().toISOString()
            })
                .eq('id', executionId);
            if (error) {
                logger_1.logger.error('Error updating execution:', error);
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
    }
    catch (error) {
        logger_1.logger.error('Error in POST /generate:', error);
        next(error);
    }
});
// Generate a preview (faster, lower quality)
router.post('/preview', auth_middleware_1.checkAuth, async (req, res, next) => {
    try {
        const { templateId, modifications } = req.body;
        if (!templateId || !modifications) {
            return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.VALIDATION_FAILED, 'Template ID and modifications are required for preview.'));
        }
        // Generate the preview
        const previewJob = await creatomateService_1.creatomateService.generatePreview({
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
    }
    catch (error) {
        logger_1.logger.error('Preview generation error:', error);
        next(error);
    }
});
// Check the status of a render job
router.get('/render/:jobId', auth_middleware_1.checkAuth, async (req, res, next) => {
    try {
        const { jobId } = req.params;
        if (!jobId || jobId === 'undefined') {
            logger_1.logger.error('Invalid jobId provided to /render endpoint:', jobId);
            return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.VALIDATION_FAILED, 'A valid Creatomate job ID is required.'));
        }
        logger_1.logger.info(`Checking render status for job: ${jobId}`);
        const job = await creatomateService_1.creatomateService.checkRenderStatus(jobId);
        // Ensure we return a valid job object
        if (!job) {
            logger_1.logger.error(`Job ${jobId} not found`);
            return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.RESOURCE_NOT_FOUND, `Creatomate job with ID ${jobId} not found.`, { jobId, service: 'Creatomate' }));
        }
        logger_1.logger.info(`Job ${jobId} status: ${job.status}`);
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
            const { data: execution, error: findError } = await supabaseClient_1.supabase
                .from('executions')
                .select('id')
                .eq('render_job_id', jobId)
                .single();
            if (findError) {
                logger_1.logger.error('Error finding execution:', findError);
                return; // No execution found, or error
            }
            if (execution) {
                const { error: updateError } = await supabaseClient_1.supabase
                    .from('executions')
                    .update({
                    status: job.status === 'completed' ? 'completed' : 'failed',
                    url: job.url,
                    thumbnail_url: job.thumbnailUrl,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', execution.id);
                if (updateError) {
                    logger_1.logger.error('Error updating execution status:', updateError);
                }
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Check render status error:', error);
        next(error);
    }
});
// GET - Get all templates from Creatomate API
router.get('/templates', auth_middleware_1.checkAuth, async (req, res, next) => {
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
                source: { /* Template JSON structure */},
                thumbnail: 'https://example.com/thumbnails/product-showcase-16-9.jpg',
                aspectRatio: '16:9',
                duration: 30
            },
            {
                id: 'cm-template-2',
                name: 'Product Showcase - 9:16',
                source: { /* Template JSON structure */},
                thumbnail: 'https://example.com/thumbnails/product-showcase-9-16.jpg',
                aspectRatio: '9:16',
                duration: 30
            },
            {
                id: 'cm-template-3',
                name: 'Product Showcase - 1:1',
                source: { /* Template JSON structure */},
                thumbnail: 'https://example.com/thumbnails/product-showcase-1-1.jpg',
                aspectRatio: '1:1',
                duration: 30
            }
        ];
        res.json({
            success: true,
            data: templates
        });
    }
    catch (error) {
        logger_1.logger.error('Creatomate templates error:', error);
        next(error);
    }
});
// POST - Generate multiple ad variations at once (batch generation)
router.post('/batch', auth_middleware_1.checkAuth, async (req, res, next) => {
    try {
        const { campaignId, templates, assetSets, outputFormats = ['mp4'] } = req.body;
        // Validate required fields
        if (!templates || !assetSets || !campaignId) {
            return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.VALIDATION_FAILED, 'Missing required fields: templates, assetSets and campaignId are required for batch generation.'));
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
            const batchJobs = await Promise.all(batch.map(({ templateId, assetSet, format }) => creatomateService_1.creatomateService.generateVideo({
                templateId,
                modifications: assetSet,
                outputFormat: format
            })));
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
    }
    catch (error) {
        logger_1.logger.error('Creatomate batch error:', error);
        next(error);
    }
});
// POST - Generate platform-specific formats
router.post('/platform-formats', auth_middleware_1.checkAuth, async (req, res, next) => {
    try {
        const { templateId, modifications, platforms = ['facebook', 'instagram', 'tiktok'] // Default platforms
         } = req.body;
        // Map platforms to their required formats
        const platformFormats = {
            facebook: ['mp4', 'mov'],
            instagram: ['mp4', 'mov'],
            tiktok: ['mp4'],
            youtube: ['mp4'],
            twitter: ['mp4']
        };
        // Get unique formats needed for the requested platforms
        const outputFormats = Array.from(new Set(platforms.flatMap((platform) => platformFormats[platform] || ['mp4'] // Default to mp4 if platform not found
        )));
        // Start generation for each format in parallel
        const jobs = await Promise.all(outputFormats.map(format => creatomateService_1.creatomateService.generateVideo({
            templateId,
            modifications,
            outputFormat: format
        })));
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
    }
    catch (error) {
        logger_1.logger.error('Creatomate platform formats error:', error);
        next(error);
    }
});
// Webhook endpoint for Creatomate to send render status updates
router.post('/webhook', async (req, res, next) => {
    try {
        const { jobId, status, url, thumbnailUrl, error } = req.body;
        if (!jobId || !status) {
            logger_1.logger.warn('Received invalid webhook payload:', req.body);
            return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.VALIDATION_FAILED, 'Webhook requires Job ID and status.'));
        }
        logger_1.logger.info(`Webhook received for job ${jobId}, status: ${status}`);
        // Find execution with this render job ID
        const { data: execution, error: findError } = await supabaseClient_1.supabase
            .from('executions')
            .select('id')
            .eq('render_job_id', jobId)
            .single();
        if (!findError && execution) {
            const { error: updateError } = await supabaseClient_1.supabase
                .from('executions')
                .update({
                status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'rendering',
                url: url || null,
                thumbnail_url: thumbnailUrl || null,
                updated_at: new Date().toISOString()
            })
                .eq('id', execution.id);
            if (updateError) {
                logger_1.logger.error('Error updating execution status from webhook:', updateError);
            }
        }
        // Respond to Creatomate
        res.status(200).json({
            success: true,
            message: 'Webhook received'
        });
    }
    catch (error) {
        logger_1.logger.error('Webhook processing error:', error);
        next(error);
    }
});
// Status check endpoint for API health monitoring
router.get('/status', async (req, res, next) => {
    try {
        // Check Creatomate connection
        const isConnected = creatomateService_1.creatomateService.isConnected();
        return res.status(200).json({
            connected: isConnected,
            apiKey: process.env.CREATOMATE_API_KEY ? 'configured' : 'missing',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Error checking Creatomate status:', error);
        next(error);
    }
});
exports.default = router;
