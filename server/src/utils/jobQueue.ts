import { redis } from '../db/redisClient';
import { logger } from '../utils/logger';

/**
 * Memory-safe queue implementation for processing media jobs
 * Uses Redis for persistence and prevents memory leaks
 */
export class MediaProcessingQueue {
  private queueName: string;
  private maxConcurrent: number;
  private processingCount: number = 0;
  private handlers: Map<string, Function> = new Map();
  private isProcessing: boolean = false;
  private maxRetries: number = 3;
  private maxQueueSize: number = 1000; // Prevent unbounded queue growth

  constructor(queueName: string, maxConcurrent: number = 5) {
    this.queueName = queueName;
    this.maxConcurrent = maxConcurrent;

    // Set up event handlers
    this.handlers.set('completed', () => {});
    this.handlers.set('failed', () => {});
    this.handlers.set('stalled', () => {});

    // Start processing
    this.startProcessing();
  }

  /**
   * Add a job to the queue
   * @param jobData Job data to process
   * @returns Job ID
   */
  async add(jobData: any): Promise<string> {
    try {
      // Check queue size before adding
      const queueSize = await this.getQueueSize();
      if (queueSize >= this.maxQueueSize) {
        throw new Error(`Queue size limit (${this.maxQueueSize}) reached`);
      }

      // Create a job with metadata
      const job = {
        id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        data: jobData,
        status: 'pending',
        createdAt: Date.now(),
        attempts: 0,
        maxRetries: this.maxRetries
      };

      // Add to Redis queue
      await redis.rPush(`queue:${this.queueName}`, JSON.stringify(job));
      logger.info(`Added job ${job.id} to queue ${this.queueName}`);

      return job.id;
    } catch (error) {
      logger.error(`Error adding job to queue ${this.queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get the current size of the queue
   * @returns Number of jobs in the queue
   */
  async getQueueSize(): Promise<number> {
    return await redis.lLen(`queue:${this.queueName}`);
  }

  /**
   * Get all jobs in the queue
   * @returns Array of jobs
   */
  async getJobs(): Promise<any[]> {
    const jobsData = await redis.lRange(`queue:${this.queueName}`, 0, -1);
    return jobsData.map(job => JSON.parse(job));
  }

  /**
   * Register event handler
   * @param event Event name ('completed', 'failed', 'stalled')
   * @param handler Handler function
   */
  on(event: string, handler: Function): void {
    this.handlers.set(event, handler);
  }

  /**
   * Start processing jobs from the queue
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    logger.info(`Started processing queue ${this.queueName}`);

    try {
      while (this.isProcessing) {
        // Process jobs if we're under the concurrency limit
        while (this.processingCount < this.maxConcurrent) {
          const job = await this.getNextJob();
          if (!job) break; // No more jobs to process
          
          this.processingCount++;
          this.processJob(job).finally(() => {
            this.processingCount--;
          });
        }
        
        // Wait a bit before checking for more jobs
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      logger.error(`Error in queue processing for ${this.queueName}:`, error);
      this.isProcessing = false;
      
      // Restart processing after a delay
      setTimeout(() => this.startProcessing(), 5000);
    }
  }

  /**
   * Get the next job from the queue
   * @returns Next job or null if queue is empty
   */
  private async getNextJob(): Promise<any | null> {
    const jobData = await redis.lPop(`queue:${this.queueName}`);
    if (!jobData) return null;
    
    return JSON.parse(jobData);
  }

  /**
   * Process a job
   * @param job Job to process
   */
  private async processJob(job: any): Promise<void> {
    try {
      // Process the job (implementation would depend on job type)
      logger.info(`Processing job ${job.id} from queue ${this.queueName}`);
      
      // Update job status
      job.status = 'completed';
      
      // Call the completed handler
      const completedHandler = this.handlers.get('completed');
      if (completedHandler) {
        await completedHandler(job);
      }
    } catch (error) {
      logger.error(`Error processing job ${job.id}:`, error);
      
      // Increment attempts
      job.attempts++;
      
      if (job.attempts < job.maxRetries) {
        // Re-queue the job
        logger.info(`Requeueing job ${job.id} (attempt ${job.attempts}/${job.maxRetries})`);
        await redis.rPush(`queue:${this.queueName}`, JSON.stringify(job));
      } else {
        // Mark as failed
        job.status = 'failed';
        job.error = error.message;
        
        // Call the failed handler
        const failedHandler = this.handlers.get('failed');
        if (failedHandler) {
          await failedHandler(job, error);
        }
      }
    }
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    this.isProcessing = false;
    logger.info(`Stopped processing queue ${this.queueName}`);
  }
}

// Create a singleton instance for media processing
export const mediaProcessingQueue = new MediaProcessingQueue('media-processing', 3);
