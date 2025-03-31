import { AssetCombination } from '../components/matrix/MatrixCombinationGrid';
import apiClient from '../api/apiClient';
import { v4 as uuidv4 } from 'uuid';
import { Asset } from '../types/assets';

// Priority levels for the rendering queue
export enum RenderPriority {
  HIGH = 0,
  MEDIUM = 1,
  LOW = 2
}

// Interface for a render job
export interface RenderJob {
  id: string;
  combinationId: string;
  assets: { [variableName: string]: Asset | null };
  templateId: string;
  priority: RenderPriority;
  createdAt: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    previewUrl?: string;
    error?: string;
  };
}

// Comparison function for sorting the priority queue
const compareJobs = (a: RenderJob, b: RenderJob): number => {
  // First compare priority
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }
  
  // Then compare creation time (older jobs first)
  return a.createdAt - b.createdAt;
};

class BatchRenderingService {
  private static instance: BatchRenderingService;
  
  // Queue of rendering jobs
  private queue: RenderJob[] = [];
  
  // Track currently processing jobs
  private processingJobs: Set<string> = new Set();
  
  // Maximum number of concurrent jobs
  private maxConcurrent: number = 3;
  
  // Callback for job updates
  private onJobUpdate: ((job: RenderJob) => void) | null = null;
  
  // Processing status
  private isProcessing: boolean = false;
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): BatchRenderingService {
    if (!BatchRenderingService.instance) {
      BatchRenderingService.instance = new BatchRenderingService();
    }
    return BatchRenderingService.instance;
  }
  
  /**
   * Set the callback for job updates
   */
  public setJobUpdateCallback(callback: ((job: RenderJob) => void) | null): void {
    this.onJobUpdate = callback;
  }
  
  /**
   * Add a rendering job to the queue
   */
  public addJob(
    combinationId: string,
    assets: { [variableName: string]: Asset | null },
    templateId: string,
    priority: RenderPriority = RenderPriority.MEDIUM
  ): string {
    const job: RenderJob = {
      id: uuidv4(),
      combinationId,
      assets,
      templateId,
      priority,
      createdAt: Date.now(),
      status: 'queued',
      progress: 0
    };
    
    // Check if a job for this combination is already in the queue
    const existingJobIndex = this.queue.findIndex(j => j.combinationId === combinationId);
    if (existingJobIndex >= 0) {
      // Replace with the new job
      this.queue[existingJobIndex] = job;
    } else {
      // Add to queue
      this.queue.push(job);
    }
    
    // Sort the queue by priority
    this.sortQueue();
    
    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return job.id;
  }
  
  /**
   * Add multiple jobs at once
   */
  public addJobs(
    combinations: AssetCombination[],
    templateId: string,
    priority: RenderPriority = RenderPriority.MEDIUM
  ): string[] {
    const jobIds: string[] = [];
    
    combinations.forEach(combination => {
      const jobId = this.addJob(
        combination.id,
        combination.assets,
        templateId,
        priority
      );
      jobIds.push(jobId);
    });
    
    return jobIds;
  }
  
  /**
   * Clear all queued jobs (does not affect jobs currently processing)
   */
  public clearQueue(): void {
    // Remove all queued jobs
    this.queue = this.queue.filter(job => job.status === 'processing');
  }
  
  /**
   * Sort the queue by priority
   */
  private sortQueue(): void {
    this.queue.sort(compareJobs);
  }
  
  /**
   * Process the next jobs in the queue
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    
    // Get next jobs up to maxConcurrent
    const availableSlots = this.maxConcurrent - this.processingJobs.size;
    
    if (availableSlots <= 0 || this.queue.length === 0) {
      // Check if we're done processing
      if (this.processingJobs.size === 0) {
        this.isProcessing = false;
      }
      return;
    }
    
    // Get the next jobs to process
    const jobsToProcess = this.queue
      .filter(job => job.status === 'queued')
      .slice(0, availableSlots);
    
    // Mark jobs as processing
    jobsToProcess.forEach(job => {
      job.status = 'processing';
      this.processingJobs.add(job.id);
      this.updateJob(job);
    });
    
    // Process each job
    jobsToProcess.forEach(job => this.processJob(job));
  }
  
  /**
   * Process a single job
   */
  private async processJob(job: RenderJob): Promise<void> {
    try {
      // Update with initial progress
      job.progress = 5;
      this.updateJob(job);
      
      // Prepare the request payload
      const modifications = Object.entries(job.assets)
        .filter(([_, asset]) => asset !== null)
        .map(([name, asset]) => ({
          name,
          assetId: asset!.id
        }));
      
      // Call the API to create the preview
      const response = await apiClient.post('/api/creatomate/preview', {
        templateId: job.templateId,
        modifications,
        combinationId: job.combinationId
      });
      
      // Update with success
      job.status = 'completed';
      job.progress = 100;
      job.result = {
        previewUrl: response.data.previewUrl
      };
    } catch (error) {
      console.error('Error processing render job:', error);
      
      // Update with failure
      job.status = 'failed';
      job.progress = 0;
      job.result = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Remove from processing set
      this.processingJobs.delete(job.id);
      
      // Update job
      this.updateJob(job);
      
      // Continue processing the queue
      this.processQueue();
    }
  }
  
  /**
   * Update a job and trigger the callback
   */
  private updateJob(job: RenderJob): void {
    if (this.onJobUpdate) {
      this.onJobUpdate(job);
    }
  }
  
  /**
   * Get all jobs
   */
  public getJobs(): RenderJob[] {
    return [...this.queue];
  }
  
  /**
   * Get a specific job by ID
   */
  public getJob(jobId: string): RenderJob | undefined {
    return this.queue.find(job => job.id === jobId);
  }
  
  /**
   * Cancel a job
   */
  public cancelJob(jobId: string): boolean {
    const index = this.queue.findIndex(job => job.id === jobId);
    
    if (index >= 0 && this.queue[index].status === 'queued') {
      // Remove the job from the queue
      this.queue.splice(index, 1);
      return true;
    }
    
    return false;
  }
  
  /**
   * Set the maximum number of concurrent jobs
   */
  public setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    
    // Trigger queue processing in case we increased the limit
    if (this.isProcessing) {
      this.processQueue();
    }
  }
}

// Export the singleton instance
export const batchRenderingService = BatchRenderingService.getInstance();
