"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.creatomateService = void 0;
const axios_1 = __importDefault(require("axios"));
// Initialize Creatomate API client
const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY || '';
const CREATOMATE_API_URL = 'https://api.creatomate.com/v1';
class CreatomateService {
    constructor(apiKey = CREATOMATE_API_KEY, baseUrl = CREATOMATE_API_URL) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.activeJobs = new Map();
    }
    // Set WebSocket service for real-time updates
    setWebSocketService(wsService) {
        this.wsService = wsService;
    }
    // Generate a video using Creatomate API
    async generateVideo(options) {
        try {
            if (process.env.PROTOTYPE_MODE === 'true') {
                console.log('Running in PROTOTYPE_MODE. Using mock Creatomate response.');
                return this.mockGenerateVideo(options);
            }
            const response = await axios_1.default.post(`${this.baseUrl}/renders`, {
                source: {
                    template_id: options.templateId,
                    modifications: options.modifications
                },
                output_format: options.outputFormat
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            const job = {
                id: response.data.id,
                status: 'queued'
            };
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
            if (process.env.PROTOTYPE_MODE === 'true') {
                const job = this.activeJobs.get(jobId);
                if (!job) {
                    throw new Error('Job not found');
                }
                return job;
            }
            const response = await axios_1.default.get(`${this.baseUrl}/renders/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            const data = response.data;
            const job = {
                id: data.id,
                status: data.status,
                url: data.url,
                thumbnailUrl: data.thumbnails?.[0],
                error: data.error
            };
            // Update job in storage
            this.activeJobs.set(jobId, job);
            // Notify clients if status has changed and WebSocket service is available
            if (this.wsService) {
                this.wsService.broadcastToAll('renderStatus', { jobId, status: job.status, url: job.url });
            }
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
    simulateStatusChanges(jobId) {
        const statuses = [
            'queued', 'rendering', 'completed'
        ];
        let index = 0;
        const job = this.activeJobs.get(jobId);
        if (!job)
            return;
        const updateStatus = () => {
            if (index >= statuses.length)
                return;
            const newStatus = statuses[index];
            const updatedJob = { ...job, status: newStatus };
            if (newStatus === 'completed') {
                updatedJob.url = `https://example.com/mock-video-${jobId}.mp4`;
                updatedJob.thumbnailUrl = `https://example.com/mock-thumbnail-${jobId}.jpg`;
            }
            this.activeJobs.set(jobId, updatedJob);
            // Notify clients if WebSocket service is available
            if (this.wsService) {
                this.wsService.broadcastToAll('renderStatus', {
                    jobId,
                    status: updatedJob.status,
                    url: updatedJob.url,
                    thumbnailUrl: updatedJob.thumbnailUrl
                });
            }
            index++;
            if (index < statuses.length) {
                // Schedule next update
                setTimeout(updateStatus, 3000); // Faster updates for prototype mode
            }
        };
        // Start the simulation
        updateStatus();
    }
    // Mock implementations for prototype mode
    mockGenerateVideo(options) {
        const jobId = `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const job = {
            id: jobId,
            status: 'queued'
        };
        this.activeJobs.set(jobId, job);
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
            this.wsService.broadcastToAll('renderStatus', {
                jobId,
                status: job.status,
                url: job.url,
                thumbnailUrl: job.thumbnailUrl
            });
        }
        return job;
    }
}
// Export singleton instance
exports.creatomateService = new CreatomateService();
