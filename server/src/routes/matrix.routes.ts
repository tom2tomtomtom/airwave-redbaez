import express, { Request, Response, NextFunction } from 'express';
import { checkAuth } from '../middleware/auth.middleware';
import { matrixService, PermutationOptions } from '../services/matrixService';
import { supabase } from '../db/supabaseClient';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';

const router = express.Router();

// Create a new matrix configuration
router.post('/', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const { campaignId, name, slots, rows, description } = req.body;
    
    if (!campaignId || !name || !slots) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Create matrix configuration
    const matrix = await matrixService.createMatrix({
      campaignId,
      name,
      description,
      slots,
      rows: rows || []
    }, req.user.userId);
    
    res.status(201).json({
      success: true,
      message: 'Matrix configuration created successfully',
      data: matrix
    });
  } catch (error: any) {
    console.error('Error creating matrix configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create matrix configuration',
      error: error.message
    });
  }
});

// Get all matrices for a campaign
router.get('/campaign/:campaignId', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const { campaignId } = req.params;
    
    const { data, error } = await supabase
      .from('matrix_configurations')
      .select('*')
      .eq('campaignId', campaignId)
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching matrix configurations:', error);
      throw new Error('Failed to fetch matrix configurations');
    }
    
    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching matrix configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matrix configurations',
      error: error.message
    });
  }
});

// Get a specific matrix by ID
router.get('/:id', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const { id } = req.params;
    
    const matrix = await matrixService.getMatrixById(id);
    
    res.json({
      success: true,
      data: matrix
    });
  } catch (error: any) {
    console.error('Error fetching matrix configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matrix configuration',
      error: error.message
    });
  }
});

// Update a matrix configuration
router.put('/:id', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const { id } = req.params;
    const { name, description, slots, rows } = req.body;
    
    // Update the matrix
    const matrix = await matrixService.updateMatrix(id, {
      name,
      description,
      slots,
      rows
    });
    
    res.json({
      success: true,
      message: 'Matrix configuration updated successfully',
      data: matrix
    });
  } catch (error: any) {
    console.error('Error updating matrix configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update matrix configuration',
      error: error.message
    });
  }
});

// Generate combinations for a matrix
router.post('/:id/combinations', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const { id } = req.params;
    const options: PermutationOptions = req.body.options || {};
    
    // Generate combinations
    const matrix = await matrixService.generateCombinations(id, options);
    
    res.json({
      success: true,
      message: 'Combinations generated successfully',
      data: matrix
    });
  } catch (error: any) {
    console.error('Error generating combinations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate combinations',
      error: error.message
    });
  }
});

// Render a specific row in the matrix
router.post('/:id/rows/:rowId/render', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const { id, rowId } = req.params;
    
    // Render the row
    const row = await matrixService.renderMatrixRow(id, rowId);
    
    res.json({
      success: true,
      message: 'Render job started successfully',
      data: row
    });
  } catch (error: any) {
    console.error('Error rendering matrix row:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to render matrix row',
      error: error.message
    });
  }
});

// Update a row's lock status
router.put('/:id/rows/:rowId/lock', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const { id, rowId } = req.params;
    const { locked } = req.body;
    
    if (typeof locked !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Locked status must be a boolean'
      });
    }
    
    // Get the current matrix
    const matrix = await matrixService.getMatrixById(id);
    
    // Find and update the row
    const rowIndex = matrix.rows.findIndex(row => row.id === rowId);
    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Row not found'
      });
    }
    
    matrix.rows[rowIndex].locked = locked;
    
    // Save the updated matrix
    const updatedMatrix = await matrixService.updateMatrix(id, { rows: matrix.rows });
    
    res.json({
      success: true,
      message: `Row ${locked ? 'locked' : 'unlocked'} successfully`,
      data: updatedMatrix.rows[rowIndex]
    });
  } catch (error: any) {
    console.error('Error updating row lock status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update row lock status',
      error: error.message
    });
  }
});

// Update a slot's lock status
router.put('/:id/slots/:slotId/lock', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const { id, slotId } = req.params;
    const { locked } = req.body;
    
    if (typeof locked !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Locked status must be a boolean'
      });
    }
    
    // Get the current matrix
    const matrix = await matrixService.getMatrixById(id);
    
    // Find and update the slot
    const slotIndex = matrix.slots.findIndex(slot => slot.id === slotId);
    if (slotIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }
    
    matrix.slots[slotIndex].locked = locked;
    
    // Save the updated matrix
    const updatedMatrix = await matrixService.updateMatrix(id, { slots: matrix.slots });
    
    res.json({
      success: true,
      message: `Slot ${locked ? 'locked' : 'unlocked'} successfully`,
      data: updatedMatrix.slots[slotIndex]
    });
  } catch (error: any) {
    console.error('Error updating slot lock status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update slot lock status',
      error: error.message
    });
  }
});

// Render all rows in the matrix
router.post('/:id/render-all', checkAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const { id } = req.params;
    
    // Get the matrix
    const matrix = await matrixService.getMatrixById(id);
    
    // Get rows that are in draft status
    const draftRows = matrix.rows.filter(row => row.status === 'draft');
    
    if (draftRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No draft rows to render'
      });
    }
    
    // Start rendering each row (in parallel)
    const renderPromises = draftRows.map(row => 
      matrixService.renderMatrixRow(id, row.id)
        .catch(error => {
          console.error(`Error rendering row ${row.id}:`, error);
          return null;
        })
    );
    
    // Wait for all render jobs to start
    const renderedRows = await Promise.all(renderPromises);
    const successfulRows = renderedRows.filter(row => row !== null);
    
    res.json({
      success: true,
      message: `Started rendering ${successfulRows.length} out of ${draftRows.length} rows`,
      data: {
        totalRows: draftRows.length,
        successfulRows: successfulRows.length,
        rows: successfulRows
      }
    });
  } catch (error: any) {
    console.error('Error rendering all rows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to render rows',
      error: error.message
    });
  }
});

export default router;