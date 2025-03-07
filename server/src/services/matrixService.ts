import { supabase } from '../db/supabaseClient';
import { creatomateService } from './creatomateService';

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
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  previewUrl?: string;
  thumbnailUrl?: string;
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
}

class MatrixService {
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
      
      // Create new rows
      for (const combination of combinations) {
        newRows.push({
          id: crypto.randomUUID(),
          slotAssignments: combination,
          status: 'draft'
        });
      }
      
      // Update the matrix with new rows
      const updatedMatrix = await this.updateMatrix(matrixId, { rows: newRows });
      
      return updatedMatrix;
    } catch (error: any) {
      console.error('Error in generateCombinations:', error);
      throw new Error(`Failed to generate combinations: ${error.message}`);
    }
  }
  
  /**
   * Render a specific row in the matrix
   */
  async renderMatrixRow(matrixId: string, rowId: string): Promise<MatrixRow> {
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
          console.error(`Error fetching asset ${assetId}:`, error);
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
      
      // Update the row with the job ID
      matrix.rows[rowIndex] = {
        ...row,
        renderJobId: renderJob.id,
        status: 'rendering'
      };
      
      // Save the updated matrix
      await this.updateMatrix(matrixId, { rows: matrix.rows });
      
      return matrix.rows[rowIndex];
    } catch (error: any) {
      console.error('Error in renderMatrixRow:', error);
      throw new Error(`Failed to render matrix row: ${error.message}`);
    }
  }
  
  /**
   * Generate all permutations of the given slots
   * This is the core algorithm for the matrix combinations
   */
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