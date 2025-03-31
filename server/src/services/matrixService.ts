import { supabase } from '../db/supabaseClient';
import { creatomateService } from './creatomateService';
import { WebSocketService } from './WebSocketService';
import { WebSocketEvent, JobProgressPayload } from '../types/websocket.types';
import { logger } from '../utils/logger';

// Types for Matrix operations
export interface AssetSlot {
  id: string;
  name: string;
  type: 'video' | 'image' | 'text' | 'audio' | 'graphics' | 'cta' | 'terms';
  required: boolean;
  assets: string[]; // Array of asset IDs available for this slot
  locked?: boolean; // Whether this slot should remain fixed during permutation
}

export interface MatrixRow {
  id: string;
  slotAssignments: Record<string, string>; // Map of slotId to assetId
  locked?: boolean; // Whether this entire row should remain fixed during permutation
  renderJobId?: string;
  status: 'draft' | 'queued' | 'rendering' | 'completed' | 'failed';
  previewUrl?: string;
  thumbnailUrl?: string;
  priority?: number; // Rendering priority (lower numbers = higher priority)
  errorMessage?: string; // Error message if status is 'failed'
  createTime?: string; // When this row was created
  renderStartTime?: string; // When rendering began
  renderCompleteTime?: string; // When rendering finished
}

export interface MatrixConfiguration {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  slots: AssetSlot[];
  rows: MatrixRow[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermutationOptions {
  varySlots?: string[]; // Specific slots to vary (if empty, all unlocked slots vary)
  maxCombinations?: number; // Maximum number of combinations to generate
  preserveExisting?: boolean; // Whether to keep existing rows 
  autoRender?: boolean; // Whether to automatically start rendering the combinations
  renderPriority?: number; // Priority for the render jobs (lower = higher priority)
}

// Interface for the batch rendering queue item
export interface BatchRenderQueueItem {
  matrixId: string;
  rowId: string;
  priority: number;
  clientId?: string;
  userId?: string;
  templateId: string;
  createdAt: string;
  attempted?: number; // Number of render attempts
  lastAttempt?: string; // Timestamp of last attempt
}

// Interface for batch rendering progress
export interface BatchRenderProgress {
  matrixId: string;
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  queued: number;
  estimatedTimeRemaining?: number; // in seconds
  overallProgress: number; // 0-1 value
}

class MatrixService {  
  private renderQueue: BatchRenderQueueItem[] = [];
  private isProcessingQueue: boolean = false;
  private maxConcurrentRenders: number = 5; // Configurable
  private activeRenders: Set<string> = new Set(); // rowIds currently rendering
  private wsService?: WebSocketService;
  private batchProgress: Record<string, BatchRenderProgress> = {}; // Track progress by matrixId

  /**
   * Set the WebSocket service for real-time updates
   */
  setWebSocketService(wsService: WebSocketService): void {
    this.wsService = wsService;
    // Connect with creatomate service for render job updates
    creatomateService.setWebSocketService(wsService);
  }
  
  /**
   * Configure the batch renderer
   */
  configure(config: { maxConcurrentRenders?: number }): void {
    if (config.maxConcurrentRenders) {
      this.maxConcurrentRenders = config.maxConcurrentRenders;
    }
  }
  /**
   * Create a new matrix configuration
   */
  async createMatrix(matrix: Partial<MatrixConfiguration>, userId: string): Promise<MatrixConfiguration> {
    try {
      if (!matrix.campaignId || !matrix.name || !matrix.slots || !matrix.slots.length) {
        throw new Error('Missing required matrix fields');
      }
      
      const newMatrix: Partial<MatrixConfiguration> = {
        ...matrix,
        id: matrix.id || crypto.randomUUID(),
        rows: matrix.rows || [],
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to database
      const { data, error } = await supabase
        .from('matrix_configurations')
        .insert([newMatrix])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating matrix configuration:', error);
        throw new Error('Failed to create matrix configuration');
      }
      
      return data as MatrixConfiguration;
    } catch (error: any) {
      console.error('Error in createMatrix:', error);
      throw new Error(`Failed to create matrix: ${error.message}`);
    }
  }
  
  /**
   * Get a matrix configuration by ID
   */
  async getMatrixById(id: string): Promise<MatrixConfiguration> {
    try {
      const { data, error } = await supabase
        .from('matrix_configurations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching matrix configuration:', error);
        throw new Error('Failed to fetch matrix configuration');
      }
      
      return data as MatrixConfiguration;
    } catch (error: any) {
      console.error('Error in getMatrixById:', error);
      throw new Error(`Failed to get matrix: ${error.message}`);
    }
  }
  
  /**
   * Update a matrix configuration
   */
  async updateMatrix(id: string, updates: Partial<MatrixConfiguration>): Promise<MatrixConfiguration> {
    try {
      const { data, error } = await supabase
        .from('matrix_configurations')
        .update({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating matrix configuration:', error);
        throw new Error('Failed to update matrix configuration');
      }
      
      return data as MatrixConfiguration;
    } catch (error: any) {
      console.error('Error in updateMatrix:', error);
      throw new Error(`Failed to update matrix: ${error.message}`);
    }
  }
  
  /**
   * Generate asset combinations based on permutation options
   */
  async generateCombinations(
    matrixId: string, 
    options: PermutationOptions
  ): Promise<MatrixConfiguration> {
    try {
      // Get current matrix
      const matrix = await this.getMatrixById(matrixId);
      
      // Filter slots based on options
      const slotsToVary = options.varySlots && options.varySlots.length > 0
        ? matrix.slots.filter(slot => options.varySlots!.includes(slot.id) && !slot.locked)
        : matrix.slots.filter(slot => !slot.locked);
      
      if (slotsToVary.length === 0) {
        throw new Error('No slots available for permutation');
      }
      
      // Start with existing rows if preserving
      let newRows: MatrixRow[] = options.preserveExisting 
        ? [...matrix.rows.filter(row => row.locked)] 
        : [];
      
      // Generate combinations
      const combinations = this.generatePermutations(matrix.slots, slotsToVary, options.maxCombinations);
      
      // Timestamp for tracking when combinations were created
      const createTime = new Date().toISOString();
      
      // Create new rows
      for (const combination of combinations) {
        newRows.push({
          id: crypto.randomUUID(),
          slotAssignments: combination,
          status: options.autoRender ? 'queued' : 'draft',
          priority: options.renderPriority || 5, // Default priority
          createTime
        });
      }
      
      // Update the matrix with new rows
      const updatedMatrix = await this.updateMatrix(matrixId, { rows: newRows });
      
      // If auto render is enabled, queue all the rows for rendering
      if (options.autoRender) {
        // Initialize batch progress tracking
        this.initializeBatchProgress(matrixId, newRows.length);
        
        // Add new rows to render queue
        const queuedRows = newRows.filter(row => row.status === 'queued');
        for (const row of queuedRows) {
          this.addToRenderQueue({
            matrixId,
            rowId: row.id,
            priority: row.priority || 5,
            templateId: 'cm-template-1', // Should come from configuration
            createdAt: createTime
          });
        }
        
        // Start processing the queue
        this.processRenderQueue();
      }
      
      return updatedMatrix;
    } catch (error: any) {
      logger.error('Error in generateCombinations:', error);
      throw new Error(`Failed to generate combinations: ${error.message}`);
    }
  }
  
  /**
   * Render a specific row in the matrix
   */
  async renderMatrixRow(matrixId: string, rowId: string, options?: { priority?: number }): Promise<MatrixRow> {
    try {
      // Get the matrix
      const matrix = await this.getMatrixById(matrixId);
      
      // Find the row
      const rowIndex = matrix.rows.findIndex(row => row.id === rowId);
      if (rowIndex === -1) {
        throw new Error('Row not found');
      }
      
      const row = matrix.rows[rowIndex];
      
      // Get assets for each slot
      const assetAssignments: Record<string, any> = {};
      const modifications: Record<string, any> = {};
      
      for (const [slotId, assetId] of Object.entries(row.slotAssignments)) {
        // Find the slot to get its type
        const slot = matrix.slots.find(s => s.id === slotId);
        if (!slot) continue;
        
        // Get the asset data from Supabase
        const { data: asset, error } = await supabase
          .from('assets')
          .select('*')
          .eq('id', assetId)
          .single();
        
        if (error || !asset) {
          logger.error(`Error fetching asset ${assetId}:`, error);
          continue; // Skip this asset
        }
        
        assetAssignments[slotId] = asset;
        
        // Map the asset to Creatomate modifications format
        if (slot.type === 'text' && asset.content) {
          modifications[slotId] = asset.content;
        } else if (asset.url) {
          modifications[slotId] = asset.url;
        }
      }
      
      // Start the render job with Creatomate
      // Determine the template ID (in a real app, you'd need to get this from the campaign or template configuration)
      const templateId = 'cm-template-1'; // Placeholder
      
      // Generate the video
      const renderJob = await creatomateService.generateVideo({
        templateId,
        outputFormat: 'mp4',
        modifications
      });
      
      // Update the row with the job ID and timestamps
      matrix.rows[rowIndex] = {
        ...row,
        renderJobId: renderJob.id,
        status: 'rendering',
        renderStartTime: new Date().toISOString()
      };
      
      // Save the updated matrix
      await this.updateMatrix(matrixId, { rows: matrix.rows });
      
      // Register for job status updates
      this.monitorRenderJobStatus(matrixId, rowId, renderJob.id);
      
      // Update batch progress
      this.updateBatchProgress(matrixId);
      
      return matrix.rows[rowIndex];
    } catch (error: any) {
      logger.error('Error in renderMatrixRow:', error);
      
      // Update row status to failed
      try {
        const matrix = await this.getMatrixById(matrixId);
        const rowIndex = matrix.rows.findIndex(row => row.id === rowId);
        if (rowIndex !== -1) {
          matrix.rows[rowIndex].status = 'failed';
          matrix.rows[rowIndex].errorMessage = error.message;
          await this.updateMatrix(matrixId, { rows: matrix.rows });
        }
      } catch (updateError) {
        logger.error('Error updating failed row status:', updateError);
      }
      
      throw new Error(`Failed to render matrix row: ${error.message}`);
    }
  }
  
  /**
   * Generate all permutations of the given slots
   * This is the core algorithm for the matrix combinations
   */
  /**
   * Monitor the status of a render job
   */
  private monitorRenderJobStatus(matrixId: string, rowId: string, jobId: string): void {
    // Register for job updates from Creatomate service
    creatomateService.onJobStatusUpdate(jobId, async (status, result) => {
      try {
        // Get current matrix
        const matrix = await this.getMatrixById(matrixId);
        
        // Find the row
        const rowIndex = matrix.rows.findIndex(row => row.id === rowId);
        if (rowIndex === -1) return; // Row not found, nothing to update
        
        const row = matrix.rows[rowIndex];
        
        // Update row based on job status
        if (status === 'completed' && result) {
          matrix.rows[rowIndex] = {
            ...row,
            status: 'completed',
            previewUrl: result.url,
            thumbnailUrl: result.thumbnailUrl,
            renderCompleteTime: new Date().toISOString()
          };
          
          // Remove from active renders set
          this.activeRenders.delete(rowId);
        } else if (status === 'failed') {
          matrix.rows[rowIndex] = {
            ...row,
            status: 'failed',
            errorMessage: result?.error || 'Unknown error',
            renderCompleteTime: new Date().toISOString()
          };
          
          // Remove from active renders set
          this.activeRenders.delete(rowId);
        }
        
        // Save the updated matrix
        await this.updateMatrix(matrixId, { rows: matrix.rows });
        
        // Update batch progress
        this.updateBatchProgress(matrixId);
        
        // Process next item in queue if this one is complete/failed
        if (status === 'completed' || status === 'failed') {
          this.processRenderQueue();
        }
      } catch (error) {
        logger.error(`Error updating render job status for matrix ${matrixId}, row ${rowId}:`, error);
      }
    });
  }
  
  /**
   * Initialize batch progress tracking for a matrix
   */
  private initializeBatchProgress(matrixId: string, totalRows: number): void {
    this.batchProgress[matrixId] = {
      matrixId,
      total: totalRows,
      completed: 0,
      failed: 0,
      inProgress: 0,
      queued: totalRows,
      overallProgress: 0
    };
    
    // Emit initial progress
    this.emitBatchProgress(matrixId);
  }
  
  /**
   * Update batch progress tracking for a matrix
   */
  private async updateBatchProgress(matrixId: string): Promise<void> {
    try {
      // Get current matrix
      const matrix = await this.getMatrixById(matrixId);
      
      // Count rows by status
      const counts = matrix.rows.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Update progress object
      const progress = this.batchProgress[matrixId] || {
        matrixId,
        total: matrix.rows.length,
        completed: 0,
        failed: 0,
        inProgress: 0,
        queued: 0,
        overallProgress: 0
      };
      
      progress.completed = counts.completed || 0;
      progress.failed = counts.failed || 0;
      progress.inProgress = counts.rendering || 0;
      progress.queued = counts.queued || 0;
      
      // Calculate overall progress
      progress.overallProgress = 
        (progress.completed + progress.failed) / progress.total;
      
      // Estimate time remaining based on average render time
      if (progress.completed > 0) {
        const completedRows = matrix.rows.filter(row => 
          row.status === 'completed' && row.renderStartTime && row.renderCompleteTime);
        
        if (completedRows.length > 0) {
          // Calculate average render time in seconds
          const avgRenderTime = completedRows.reduce((sum, row) => {
            const start = new Date(row.renderStartTime!).getTime();
            const end = new Date(row.renderCompleteTime!).getTime();
            return sum + (end - start) / 1000;
          }, 0) / completedRows.length;
          
          // Estimate remaining time
          progress.estimatedTimeRemaining = avgRenderTime * (progress.queued + progress.inProgress);
        }
      }
      
      // Save updated progress
      this.batchProgress[matrixId] = progress;
      
      // Emit progress update
      this.emitBatchProgress(matrixId);
    } catch (error) {
      logger.error(`Error updating batch progress for matrix ${matrixId}:`, error);
    }
  }
  
  /**
   * Emit batch progress update via WebSocket
   */
  private emitBatchProgress(matrixId: string): void {
    if (!this.wsService) return;
    
    const progress = this.batchProgress[matrixId];
    if (!progress) return;
    
    this.wsService.emitToRoom(`matrix:${matrixId}`, WebSocketEvent.BATCH_PROGRESS_UPDATE, {
      matrixId,
      progress
    });
  }
  
  /**
   * Add a row to the render queue
   */
  private addToRenderQueue(item: BatchRenderQueueItem): void {
    // Add to queue
    this.renderQueue.push(item);
    
    // Sort queue by priority (lower numbers = higher priority)
    this.renderQueue.sort((a, b) => a.priority - b.priority);
    
    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.processRenderQueue();
    }
  }
  
  /**
   * Process the render queue
   */
  private async processRenderQueue(): Promise<void> {
    // If already processing, exit
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    try {
      // While we have room for more renders and items in the queue
      while (
        this.activeRenders.size < this.maxConcurrentRenders && 
        this.renderQueue.length > 0
      ) {
        // Get the next item from the queue
        const nextItem = this.renderQueue.shift();
        if (!nextItem) break;
        
        // Mark as active render
        this.activeRenders.add(nextItem.rowId);
        
        // Start render in the background
        this.startRenderJob(nextItem).catch(error => {
          logger.error(`Error starting render job for matrix ${nextItem.matrixId}, row ${nextItem.rowId}:`, error);
          // Remove from active renders on error
          this.activeRenders.delete(nextItem.rowId);
          // Process next item
          this.processRenderQueue();
        });
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  /**
   * Start a render job from the queue
   */
  private async startRenderJob(item: BatchRenderQueueItem): Promise<void> {
    try {
      // Update job attempt count
      item.attempted = (item.attempted || 0) + 1;
      item.lastAttempt = new Date().toISOString();
      
      // Get the matrix
      const matrix = await this.getMatrixById(item.matrixId);
      
      // Find the row
      const rowIndex = matrix.rows.findIndex(row => row.id === item.rowId);
      if (rowIndex === -1) {
        logger.error(`Row ${item.rowId} not found in matrix ${item.matrixId}`);
        return;
      }
      
      // Update row status to rendering
      matrix.rows[rowIndex].status = 'rendering';
      matrix.rows[rowIndex].renderStartTime = new Date().toISOString();
      await this.updateMatrix(item.matrixId, { rows: matrix.rows });
      
      // Call renderMatrixRow to start the actual render
      await this.renderMatrixRow(item.matrixId, item.rowId, { priority: item.priority });
      
      // Update batch progress
      this.updateBatchProgress(item.matrixId);
    } catch (error) {
      logger.error(`Error in startRenderJob for matrix ${item.matrixId}, row ${item.rowId}:`, error);
      
      // If failed, update row status
      try {
        const matrix = await this.getMatrixById(item.matrixId);
        const rowIndex = matrix.rows.findIndex(row => row.id === item.rowId);
        if (rowIndex !== -1) {
          matrix.rows[rowIndex].status = 'failed';
          matrix.rows[rowIndex].errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await this.updateMatrix(item.matrixId, { rows: matrix.rows });
        }
      } catch (updateError) {
        logger.error('Error updating failed row status:', updateError);
      }
      
      // Remove from active renders
      this.activeRenders.delete(item.rowId);
      
      // Throw the error for the caller to handle
      throw error;
    }
  }
  
  /**
   * Get a summary of the render queue status
   */
  async getRenderQueueStatus(): Promise<{
    queueLength: number;
    activeRenders: number;
    maxConcurrentRenders: number;
  }> {
    return {
      queueLength: this.renderQueue.length,
      activeRenders: this.activeRenders.size,
      maxConcurrentRenders: this.maxConcurrentRenders
    };
  }
  
  /**
   * Get batch rendering progress for a matrix
   */
  async getBatchProgress(matrixId: string): Promise<BatchRenderProgress> {
    if (!this.batchProgress[matrixId]) {
      // If no progress info, calculate it
      await this.updateBatchProgress(matrixId);
    }
    
    return this.batchProgress[matrixId];
  }
  
  /**
   * Start batch rendering for all queued rows in a matrix
   */
  async startBatchRendering(matrixId: string, options?: { priority?: number }): Promise<BatchRenderProgress> {
    try {
      // Get the matrix
      const matrix = await this.getMatrixById(matrixId);
      
      // Find all draft rows
      const draftRows = matrix.rows.filter(row => row.status === 'draft');
      
      if (draftRows.length === 0) {
        throw new Error('No draft rows to render');
      }
      
      // Initialize progress tracking
      this.initializeBatchProgress(matrixId, draftRows.length);
      
      // Mark rows as queued
      const updatedRows = [...matrix.rows];
      for (let i = 0; i < updatedRows.length; i++) {
        if (updatedRows[i].status === 'draft') {
          updatedRows[i] = {
            ...updatedRows[i],
            status: 'queued',
            priority: options?.priority ?? 5
          };
        }
      }
      
      // Save updated rows
      await this.updateMatrix(matrixId, { rows: updatedRows });
      
      // Queue up all the rows for rendering
      for (const row of draftRows) {
        this.addToRenderQueue({
          matrixId,
          rowId: row.id,
          priority: options?.priority ?? row.priority ?? 5,
          templateId: 'cm-template-1', // Should come from configuration
          createdAt: new Date().toISOString()
        });
      }
      
      // Start processing the queue
      this.processRenderQueue();
      
      return this.batchProgress[matrixId];
    } catch (error: any) {
      logger.error('Error in startBatchRendering:', error);
      throw new Error(`Failed to start batch rendering: ${error.message}`);
    }
  }
  
  private generatePermutations(
    allSlots: AssetSlot[], 
    slotsToVary: AssetSlot[],
    maxCombinations?: number
  ): Record<string, string>[] {
    // Base case: if no slots to vary, return an empty assignment
    if (slotsToVary.length === 0) {
      return [{}];
    }
    
    // Initialize with assignments for locked slots (those not in slotsToVary)
    const lockedAssignments: Record<string, string> = {};
    
    for (const slot of allSlots) {
      if (!slotsToVary.some(s => s.id === slot.id) && slot.assets.length > 0) {
        // For locked slots, use the first asset
        lockedAssignments[slot.id] = slot.assets[0];
      }
    }
    
    // Generate all possible combinations for slots that vary
    let combinations: Record<string, string>[] = [lockedAssignments];
    
    for (const slot of slotsToVary) {
      if (slot.assets.length === 0) continue;
      
      const newCombinations: Record<string, string>[] = [];
      
      for (const combination of combinations) {
        for (const assetId of slot.assets) {
          newCombinations.push({
            ...combination,
            [slot.id]: assetId
          });
          
          // Check if we've reached the maximum number of combinations
          if (maxCombinations && newCombinations.length >= maxCombinations) {
            return newCombinations;
          }
        }
      }
      
      combinations = newCombinations;
    }
    
    // Apply limit if specified
    if (maxCombinations && combinations.length > maxCombinations) {
      combinations = combinations.slice(0, maxCombinations);
    }
    
    return combinations;
  }
  
  /**
   * Update a row's status based on render job status
   */
  async updateRowStatus(matrixId: string, rowId: string, status: 'rendering' | 'completed' | 'failed', urls?: { url?: string, thumbnailUrl?: string }): Promise<MatrixRow> {
    try {
      const matrix = await this.getMatrixById(matrixId);
      
      const rowIndex = matrix.rows.findIndex(row => row.id === rowId);
      if (rowIndex === -1) {
        throw new Error('Row not found');
      }
      
      // Update the row
      matrix.rows[rowIndex] = {
        ...matrix.rows[rowIndex],
        status,
        previewUrl: urls?.url || matrix.rows[rowIndex].previewUrl,
        thumbnailUrl: urls?.thumbnailUrl || matrix.rows[rowIndex].thumbnailUrl
      };
      
      // Save the updated matrix
      await this.updateMatrix(matrixId, { rows: matrix.rows });
      
      return matrix.rows[rowIndex];
    } catch (error: any) {
      console.error('Error in updateRowStatus:', error);
      throw new Error(`Failed to update row status: ${error.message}`);
    }
  }
}

// Export singleton instance
export const matrixService = new MatrixService();