"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const runwayService_1 = require("../services/runwayService");
const auth_middleware_1 = require("../middleware/auth.middleware");
const supabaseClient_1 = require("../db/supabaseClient");
const router = express_1.default.Router();
// Generate an image using Runway API
router.post('/generate', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { prompt, executionId, negativePrompt, width, height, style, clientId, withLogo, numberOfImages = 1 } = req.body;
        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Prompt is required for image generation'
            });
        }
        console.log(`Generating image with prompt: ${prompt.substring(0, 30)}...`);
        console.log(`Dimensions: ${width}x${height}, Style: ${style || 'default'}`);
        // Call the Runway service
        const renderJob = await runwayService_1.runwayService.generateImage({
            prompt,
            negativePrompt,
            width: width || 1024,
            height: height || 1024,
            numberOfImages,
            style,
            clientId,
            withLogo
        });
        console.log(`Generated job with ID: ${renderJob.id}`);
        // If we have an execution ID, update the execution in the database
        if (executionId) {
            const { error } = await supabaseClient_1.supabase
                .from('executions')
                .update({
                status: renderJob.status,
                render_job_id: renderJob.id
            })
                .eq('id', executionId);
            if (error) {
                console.error('Error updating execution:', error);
            }
        }
        // Return the job information
        return res.json({
            success: true,
            message: 'Image generation started',
            data: {
                jobId: renderJob.id,
                status: renderJob.status,
                url: renderJob.imageUrl || null
            }
        });
    }
    catch (error) {
        console.error('Error in runway/generate endpoint:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate image'
        });
    }
});
// Get status of a render job
router.get('/status/:jobId', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!jobId) {
            return res.status(400).json({
                success: false,
                message: 'Job ID is required'
            });
        }
        const job = runwayService_1.runwayService.getJobStatus(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        return res.json({
            success: true,
            data: {
                jobId: job.id,
                status: job.status,
                url: job.imageUrl || null,
                error: job.error || null
            }
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get job status'
        });
    }
});
/**
 * Generate a video from an image using Runway API
 */
router.post('/generate-video/from-image', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { imageUrl, imageData, prompt, executionId, model, motionStrength, duration, clientId } = req.body;
        // Support both imageUrl and imageData parameters
        const actualImageSource = imageData || imageUrl;
        if (!actualImageSource) {
            return res.status(400).json({
                success: false,
                message: 'Image data or URL is required for video generation'
            });
        }
        console.log(`Generating video from image data`);
        console.log(`Prompt: ${prompt || 'None'}, Model: ${model || 'gen3a_turbo'}`);
        // Call the Runway service
        // Note: Runway API only accepts specific duration values (typically 3, 4, or 5 seconds)
        // If the client requests 10 seconds, we need to handle this specially
        let apiDuration = 5; // Default to 5 seconds which is valid for Runway
        if (duration && duration > 5) {
            console.log(`Client requested ${duration} second video (extended length)`);
            // For future: We could implement extended videos by generating multiple clips
            // and concatenating them, or making multiple API calls and stitching results
        }
        const renderJob = await runwayService_1.runwayService.generateVideo({
            promptImage: actualImageSource,
            promptText: prompt || '',
            model: model || 'gen3a_turbo',
            motionStrength: motionStrength || 0.5,
            duration: apiDuration, // Always use a valid Runway API duration
            clientId
        });
        console.log(`Generated video job with ID: ${renderJob.id}`);
        // If we have an execution ID, update the execution in the database
        if (executionId) {
            const { error } = await supabaseClient_1.supabase
                .from('executions')
                .update({
                status: 'processing',
                render_job_id: renderJob.id
            })
                .eq('id', executionId);
            if (error) {
                console.error('Error updating execution:', error);
            }
        }
        res.json({
            success: true,
            jobId: renderJob.id,
            status: renderJob.status
        });
    }
    catch (error) {
        console.error('Error generating video:', error.message);
        res.status(500).json({
            success: false,
            message: `Failed to generate video: ${error.message}`
        });
    }
});
/**
 * Redirect any text-to-video requests to image-to-video for backward compatibility
 */
router.post('/generate-video/from-text', auth_middleware_1.checkAuth, async (req, res) => {
    return res.status(400).json({
        success: false,
        message: 'Text-to-video generation is no longer supported. Please use image-to-video generation instead.'
    });
});
/**
 * Get the status of a video generation job
 */
router.get('/video-status/:jobId', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!jobId) {
            return res.status(400).json({
                success: false,
                message: 'Job ID is required'
            });
        }
        // Get the job status
        const job = runwayService_1.runwayService.getJobStatus(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        res.json({
            success: true,
            jobId: job.id,
            status: job.status,
            videoUrl: job.videoUrl,
            error: job.error
        });
    }
    catch (error) {
        console.error('Error getting video status:', error.message);
        res.status(500).json({
            success: false,
            message: `Failed to get video status: ${error.message}`
        });
    }
});
/**
 * Get task status for compatibility with the example
 */
router.get('/task/:taskId', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { taskId } = req.params;
        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: 'Task ID is required'
            });
        }
        // Reuse the existing getJobStatus method
        const job = runwayService_1.runwayService.getJobStatus(taskId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        // Format the response to match the expected format in the example
        res.json({
            status: job.status.toUpperCase(), // Example expects uppercase status
            output: job.videoUrl || null, // Output is the video URL
            error: job.error || null,
            progress: job.progress || 0
        });
    }
    catch (error) {
        console.error('Error getting task status:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get task status'
        });
    }
});
exports.default = router;
