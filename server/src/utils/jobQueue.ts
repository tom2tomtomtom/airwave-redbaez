import Queue from 'bull';
import { logger } from './logger';

// Create Redis connection for Bull
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Queue for media processing jobs
 * Handles image-to-video conversion, subtitle generation, etc.
 */
export const mediaProcessingQueue = new Queue('media-processing', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

/**
 * Process media jobs with concurrency limit
 * This prevents overloading the server with too many simultaneous jobs
 */
mediaProcessingQueue.process(5, async (job) => {
  const { type, data } = job.data;
  
  logger.info(`Processing ${type} job`, { jobId: job.id });
  
  try {
    // Process different job types
    switch (type) {
      case 'image-to-video':
        // Call the actual processing function
        // In a real implementation, this would call the appropriate service
        logger.info(`Processing image-to-video job`, { jobId: job.id, data });
        // return await processImageToVideo(data);
        return { status: 'success', message: 'Image to video conversion completed' };
        
      case 'generate-subtitles':
        logger.info(`Processing subtitle generation job`, { jobId: job.id, data });
        // return await generateSubtitles(data);
        return { status: 'success', message: 'Subtitle generation completed' };
        
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  } catch (error) {
    logger.error(`Error processing ${type} job`, { 
      jobId: job.id, 
      error: error.message 
    });
    throw error;
  }
});

// Add event listeners for monitoring
mediaProcessingQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

mediaProcessingQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed`, { error: error.message });
});

mediaProcessingQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

/**
 * Add a job to the media processing queue
 * @param type Type of job (e.g., 'image-to-video', 'generate-subtitles')
 * @param data Job data
 * @param options Job options
 * @returns The created job
 */
export const addMediaProcessingJob = async (type: string, data: any, options = {}) => {
  const job = await mediaProcessingQueue.add({ type, data }, options);
  logger.info(`Added ${type} job to queue`, { jobId: job.id });
  return job;
};

/**
 * Get the status of a job
 * @param jobId The job ID
 * @returns The job status
 */
export const getJobStatus = async (jobId: string) => {
  const job = await mediaProcessingQueue.getJob(jobId);
  
  if (!job) {
    return { status: 'not_found' };
  }
  
  const state = await job.getState();
  const progress = job._progress;
  
  return {
    id: job.id,
    status: state,
    progress,
    data: job.data,
    createdAt: job.timestamp,
    processedAt: job.processedOn,
    finishedAt: job.finishedOn
  };
};

/**
 * Get all jobs in the queue
 * @param status Job status to filter by
 * @returns Array of jobs
 */
export const getJobs = async (status?: string) => {
  let jobs;
  
  if (status) {
    jobs = await mediaProcessingQueue.getJobs([status]);
  } else {
    // Get jobs with various statuses
    const activeJobs = await mediaProcessingQueue.getActive();
    const waitingJobs = await mediaProcessingQueue.getWaiting();
    const delayedJobs = await mediaProcessingQueue.getDelayed();
    const completedJobs = await mediaProcessingQueue.getCompleted();
    const failedJobs = await mediaProcessingQueue.getFailed();
    
    jobs = [
      ...activeJobs,
      ...waitingJobs,
      ...delayedJobs,
      ...completedJobs,
      ...failedJobs
    ];
  }
  
  return jobs.map(job => ({
    id: job.id,
    status: job.status,
    data: job.data,
    createdAt: job.timestamp,
    processedAt: job.processedOn,
    finishedAt: job.finishedOn
  }));
};
