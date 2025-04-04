"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.creatomateService = exports.CreatomateService = void 0;
const axios_1 = __importDefault(require("axios"));
const websocket_types_1 = require("../types/websocket.types");
const logger_1 = require("../utils/logger");
// Initialize Creatomate API client
const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY || '';
const CREATOMATE_API_URL = 'https://api.creatomate.com/v1';
class CreatomateService {
    constructor(apiKey = CREATOMATE_API_KEY, baseUrl = CREATOMATE_API_URL) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.activeJobs = new Map();
        this.jobStatusCallbacks = new Map();
    }
    // Set WebSocket service for real-time updates
    setWebSocketService(wsService) {
        this.wsService = wsService;
    }
    // Check if Creatomate service is properly configured
    isConnected() {
        // In production, we would do a real API check
        // For now, just check if API key is available
        return this.apiKey !== '' && this.apiKey.length > 10;
    }
    // Check if the service is properly configured with valid credentials
    isConfigured() {
        const isValid = this.apiKey !== '' && this.apiKey.length > 10;
        if (!isValid) {
            console.error('Creatomate service is not properly configured. Missing or invalid API key.');
        }
        return isValid;
    }
    // Generate an image using Creatomate API
    async generateImage(options) {
        try {
            if (process.env.PROTOTYPE_MODE === 'true') {
                console.log('Running in PROTOTYPE_MODE. Using mock Creatomate image response.');
                return this.mockGenerateImage(options);
            }
            console.log('Making real API call to Creatomate for image generation');
            // console.log('Using API key:', this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'Missing'); // Security: Removed API key logging
            console.log('Template ID:', options.templateId);
            console.log('Using modifications:', JSON.stringify(options.modifications));
            // Verify that we have a valid API key
            if (!this.isConfigured()) {
                throw new Error('Creatomate API key is not configured');
            }
            const payload = {
                source: {
                    template_id: options.templateId,
                    modifications: options.modifications
                },
                output_format: options.outputFormat || 'jpg'
            };
            console.log('API request payload:', JSON.stringify(payload));
            const response = await axios_1.default.post(`${this.baseUrl}/renders`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Creatomate API response:', JSON.stringify(response.data));
            if (!response.data || !response.data.id) {
                throw new Error('Creatomate API returned an invalid response (no job ID)');
            }
            const job = {
                id: response.data.id,
                status: response.data.status || 'queued'
            };
            console.log(`Created render job with ID: ${job.id}`);
            // Store job for status tracking
            this.activeJobs.set(job.id, job);
            // Start polling for status updates
            this.pollJobStatus(job.id);
            return job;
        }
        catch (error) {
            console.error('Creatomate API error:', error.response?.data || error.message);
            throw new Error(`Failed to generate image: ${error.message}`);
        }
    }
    // Generate a video using Creatomate API
    async generateVideo(options) {
        try {
            if (process.env.PROTOTYPE_MODE === 'true') {
                console.log('Running in PROTOTYPE_MODE. Using mock Creatomate video response.');
                return this.mockGenerateVideo(options);
            }
            console.log('Making real API call to Creatomate for video generation');
            // console.log('Using API key:', this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'Missing'); // Security: Removed API key logging
            console.log('Template ID:', options.templateId);
            console.log('Using modifications:', JSON.stringify(options.modifications));
            // Verify that we have a valid API key
            if (!this.isConfigured()) {
                throw new Error('Creatomate API key is not configured');
            }
            const payload = {
                source: {
                    template_id: options.templateId,
                    modifications: options.modifications
                },
                output_format: options.outputFormat || 'mp4'
            };
            console.log('API request payload:', JSON.stringify(payload));
            const response = await axios_1.default.post(`${this.baseUrl}/renders`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Creatomate API response:', JSON.stringify(response.data));
            if (!response.data || !response.data.id) {
                throw new Error('Creatomate API returned an invalid response (no job ID)');
            }
            const job = {
                id: response.data.id,
                status: response.data.status || 'queued'
            };
            console.log(`Created render job with ID: ${job.id}`);
            // Store job for status tracking
            this.activeJobs.set(job.id, job);
            // Start polling for status updates
            this.pollJobStatus(job.id);
            return job;
        }
        catch (error) {
            console.error('Creatomate API error:', error.response?.data || error.message);
            throw new Error(`Failed to generate video: ${error.message}`);
        }
    }
    // Generate a preview (faster, lower quality)
    async generatePreview(options) {
        if (process.env.PROTOTYPE_MODE === 'true') {
            console.log('Running in PROTOTYPE_MODE. Using mock Creatomate preview.');
            return this.mockGeneratePreview(options);
        }
        // Use the same method as generateVideo but with preview settings
        const previewOptions = {
            ...options,
            outputFormat: 'mp4',
            // Add preview-specific modifications (lower quality, watermark, etc.)
            modifications: {
                ...options.modifications,
                _preview: true,
                _resolution: '480p'
            }
        };
        return this.generateVideo(previewOptions);
    }
    // Check the status of a render job
    async checkRenderStatus(jobId) {
        try {
            if (!jobId) {
                throw new Error('No job ID provided to checkRenderStatus');
            }
            console.log(`Checking render status for job: ${jobId}`);
            if (process.env.PROTOTYPE_MODE === 'true') {
                console.log('Using mock job status in prototype mode');
                const job = this.activeJobs.get(jobId);
                if (!job) {
                    throw new Error(`Job not found: ${jobId}`);
                }
                return job;
            }
            // Verify that we have a valid API key
            if (!this.isConfigured()) {
                throw new Error('Creatomate API key is not configured');
            }
            console.log(`Making real API call to check status for job: ${jobId}`);
            const response = await axios_1.default.get(`${this.baseUrl}/renders/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            console.log(`Received status response for job ${jobId}:`, JSON.stringify(response.data));
            const data = response.data;
            const job = {
                id: data.id,
                status: data.status,
                url: data.url,
                thumbnailUrl: data.thumbnails?.[0],
                error: data.error
            };
            console.log(`Job ${jobId} status: ${job.status}, url: ${job.url || 'not available yet'}`);
            // Update job in storage
            this.activeJobs.set(jobId, job);
            // Notify clients if status has changed and WebSocket service is available
            if (this.wsService) {
                const payload = {
                    jobId: job.id,
                    service: 'creatomate',
                    status: job.status === 'completed' ? 'succeeded' : job.status,
                    progress: job.status === 'completed' ? 100 : (job.status === 'failed' ? undefined : 0),
                    clientId: job.clientId ?? '', // Add fallback for potentially undefined ID
                    userId: job.userId ?? '', // Add fallback for potentially undefined ID
                    resultUrl: job.url,
                    error: job.status === 'failed' ? 'Render failed' : undefined, // Add error if failed
                };
                this.wsService.broadcast(websocket_types_1.WebSocketEvent.JOB_PROGRESS, payload);
            }
            // Invoke any registered callbacks for this job
            this.notifyJobStatusCallbacks(job.id, job.status, {
                url: job.url,
                thumbnailUrl: job.thumbnailUrl,
                error: job.error
            });
            return job;
        }
        catch (error) {
            console.error('Error checking render status:', error.response?.data || error.message);
            throw new Error(`Failed to check render status: ${error.message}`);
        }
    }
    // Poll for job status updates
    async pollJobStatus(jobId, interval = 5000, maxAttempts = 60) {
        if (process.env.PROTOTYPE_MODE === 'true') {
            // In prototype mode, simulate status changes
            this.simulateStatusChanges(jobId);
            return;
        }
        let attempts = 0;
        const poll = async () => {
            try {
                const job = await this.checkRenderStatus(jobId);
                attempts++;
                if (job.status === 'completed' || job.status === 'failed' || attempts >= maxAttempts) {
                    // Job has finished or maximum polling attempts reached
                    return;
                }
                // Continue polling
                setTimeout(poll, interval);
            }
            catch (error) {
                console.error(`Error polling job ${jobId}:`, error);
            }
        };
        // Start polling
        poll();
    }
    // For prototype mode: Simulate status changes
    simulateStatusChanges(jobId, isImage = false) {
        const statuses = [
            'queued', 'rendering', 'completed'
        ];
        let index = 0;
        const job = this.activeJobs.get(jobId);
        if (!job) {
            console.error(`Cannot simulate status changes for job ${jobId}: Job not found`);
            return;
        }
        console.log(`Starting status simulation for job ${jobId}`);
        const updateStatus = () => {
            if (index >= statuses.length)
                return;
            const newStatus = statuses[index];
            console.log(`Updating job ${jobId} status to ${newStatus}`);
            const updatedJob = { ...job, status: newStatus };
            if (newStatus === 'completed') {
                // Use placeholder media URLs that would typically work in a browser
                if (isImage) {
                    // For images
                    const aspectRatio = updatedJob.id.includes('square') ? '1:1' :
                        updatedJob.id.includes('portrait') ? '9:16' :
                            updatedJob.id.includes('instagram') ? '4:5' : '16:9';
                    // Choose dimensions based on aspect ratio
                    const dimensions = aspectRatio === '1:1' ? '600/600' :
                        aspectRatio === '9:16' ? '600/1067' :
                            aspectRatio === '4:5' ? '600/750' : '1067/600';
                    updatedJob.url = `https://picsum.photos/${dimensions}?random=${Math.floor(Math.random() * 1000)}`;
                    updatedJob.thumbnailUrl = updatedJob.url;
                }
                else {
                    // For videos
                    updatedJob.url = 'https://picsum.photos/640/360.mp4';
                    updatedJob.thumbnailUrl = 'https://picsum.photos/640/360';
                }
            }
            this.activeJobs.set(jobId, updatedJob);
            // Notify clients if WebSocket service is available
            if (this.wsService) {
                const payload = {
                    jobId: updatedJob.id,
                    service: 'creatomate',
                    status: updatedJob.status === 'completed' ? 'succeeded' : updatedJob.status,
                    progress: updatedJob.status === 'completed' ? 100 : (updatedJob.status === 'failed' ? undefined : 0),
                    clientId: updatedJob.clientId ?? '', // Add fallback
                    userId: updatedJob.userId ?? '', // Add fallback
                    resultUrl: updatedJob.url,
                    error: updatedJob.error,
                };
                this.wsService.broadcast(websocket_types_1.WebSocketEvent.JOB_PROGRESS, payload);
            }
            // Invoke any registered callbacks for this job
            this.notifyJobStatusCallbacks(updatedJob.id, updatedJob.status, {
                url: updatedJob.url,
                thumbnailUrl: updatedJob.thumbnailUrl,
                error: updatedJob.error
            });
            index++;
            if (index < statuses.length) {
                // Schedule next update
                setTimeout(updateStatus, 3000); // Faster updates for prototype mode
            }
            else {
                console.log(`Finished simulation for job ${jobId}. Final status: ${newStatus}`);
            }
        };
        // Start the simulation
        updateStatus();
    }
    // Mock implementations for prototype mode
    mockGenerateImage(options) {
        const jobId = `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const job = {
            id: jobId,
            status: 'queued'
        };
        // Log the mock job creation for debugging
        console.log(`Creating mock image job ${jobId} with template: ${options.templateId}`);
        console.log('Modifications:', JSON.stringify(options.modifications));
        // Start the simulation
        this.activeJobs.set(jobId, job);
        this.simulateStatusChanges(jobId, true);
        return job;
    }
    // Mock implementations for prototype mode
    mockGenerateVideo(options) {
        const jobId = `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const job = {
            id: jobId,
            status: 'queued'
        };
        this.activeJobs.set(jobId, job);
        // Log the mock job creation for debugging
        console.log(`Creating mock video job ${jobId} with template: ${options.templateId}`);
        console.log('Modifications:', JSON.stringify(options.modifications));
        // Start the simulation
        this.simulateStatusChanges(jobId);
        return job;
    }
    mockGeneratePreview(options) {
        const jobId = `preview-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        // For previews, immediately return a "completed" status with mock URLs
        const job = {
            id: jobId,
            status: 'completed',
            url: 'https://example.com/mock-preview.mp4',
            thumbnailUrl: 'https://example.com/mock-preview-thumbnail.jpg'
        };
        this.activeJobs.set(jobId, job);
        // Notify clients
        if (this.wsService) {
            const payload = {
                jobId: job.id,
                service: 'creatomate',
                status: job.status === 'completed' ? 'succeeded' : job.status,
                progress: job.status === 'completed' ? 100 : (job.status === 'failed' ? undefined : 0),
                clientId: job.clientId ?? '', // Add fallback
                userId: job.userId ?? '', // Add fallback
                resultUrl: job.url,
                error: job.error,
            };
            this.wsService.broadcast(websocket_types_1.WebSocketEvent.JOB_PROGRESS, payload);
        }
        return job;
    }
    /**
     * Register a callback for job status updates
     * @param jobId The job ID to monitor
     * @param callback Function to call when job status changes
     */
    onJobStatusUpdate(jobId, callback) {
        // Initialize the array if it doesn't exist
        if (!this.jobStatusCallbacks.has(jobId)) {
            this.jobStatusCallbacks.set(jobId, []);
        }
        // Add the callback
        const callbacks = this.jobStatusCallbacks.get(jobId);
        if (callbacks) {
            callbacks.push(callback);
        }
        logger_1.logger.debug(`Registered job status callback for job ${jobId}`);
        // If the job already exists, immediately invoke the callback with current status
        const job = this.activeJobs.get(jobId);
        if (job) {
            callback(job.status, {
                url: job.url,
                thumbnailUrl: job.thumbnailUrl,
                error: job.error
            });
        }
    }
    /**
     * Remove all callbacks for a job
     * @param jobId The job ID
     */
    removeJobStatusCallbacks(jobId) {
        this.jobStatusCallbacks.delete(jobId);
        logger_1.logger.debug(`Removed all job status callbacks for job ${jobId}`);
    }
    /**
     * Notify all registered callbacks for a job
     * @param jobId The job ID
     * @param status The new job status
     * @param result The job result data
     */
    notifyJobStatusCallbacks(jobId, status, result) {
        const callbacks = this.jobStatusCallbacks.get(jobId) || [];
        if (callbacks.length > 0) {
            logger_1.logger.debug(`Notifying ${callbacks.length} callbacks for job ${jobId} status: ${status}`);
            for (const callback of callbacks) {
                try {
                    callback(status, result);
                }
                catch (error) {
                    logger_1.logger.error(`Error in job status callback for job ${jobId}:`, error);
                }
            }
            // If job is in a terminal state, remove callbacks to prevent memory leaks
            if (status === 'completed' || status === 'failed') {
                this.removeJobStatusCallbacks(jobId);
            }
        }
    }
}
exports.CreatomateService = CreatomateService;
// Export singleton instance
exports.creatomateService = new CreatomateService();
