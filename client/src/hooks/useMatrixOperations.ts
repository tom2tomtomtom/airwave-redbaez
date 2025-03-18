import { useState, useCallback } from 'react';
import apiClient from '../utils/api';

// Types
export interface Asset {
  id: string;
  name: string;
  type: 'video' | 'image' | 'audio' | 'text' | 'graphic';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  mimeType?: string;
  tags?: string[];
  category?: string;
}

export interface MatrixSlot {
  id: string;
  type: 'video' | 'image' | 'audio' | 'text' | 'graphic';
  assetId: string | null;
  locked: boolean;
  name: string;
}

export interface MatrixRow {
  id: string;
  slots: MatrixSlot[];
  locked: boolean;
  renderStatus?: 'idle' | 'rendering' | 'complete' | 'failed';
  previewUrl?: string;
}

export interface MatrixColumn {
  id: string;
  type: 'video' | 'image' | 'audio' | 'text' | 'graphic';
  name: string;
}

export interface MatrixData {
  id: string;
  name: string;
  campaignId: string;
  rows: MatrixRow[];
  columns: MatrixColumn[];
}

export interface CombinationOptions {
  maxCombinations: number;
  varyCopy: boolean;
  varyVideos: boolean;
  varyImages: boolean;
  varyAudio: boolean;
  varyGraphics: boolean;
}

/**
 * Custom hook for managing campaign matrix operations
 */
export const useMatrixOperations = (campaignId: string, initialMatrixId?: string) => {
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [matrixId, setMatrixId] = useState<string | undefined>(initialMatrixId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [renderingAll, setRenderingAll] = useState(false);

  /**
   * Load matrix data from API or create an empty matrix
   */
  const loadMatrixData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data: MatrixData;
      
      if (matrixId) {
        // Load existing matrix
        const response = await apiClient.matrix.getMatrixById(matrixId);
        data = response.data.data;
      } else {
        // Create new matrix structure
        data = createEmptyMatrix(campaignId);
      }
      
      setMatrixData(data);
    } catch (err: any) {
      console.error('Error loading matrix data:', err);
      setError(err.response?.data?.message || 'Failed to load matrix data');
    } finally {
      setLoading(false);
    }
  }, [campaignId, matrixId]);

  /**
   * Create an empty matrix structure
   */
  const createEmptyMatrix = (campaignId: string): MatrixData => {
    // Generate a timestamp for unique IDs
    const timestamp = Date.now();
    
    // Define default column types for a new matrix
    const defaultColumns: MatrixColumn[] = [
      { id: `col-${timestamp}-1`, type: 'video', name: 'Video' },
      { id: `col-${timestamp}-2`, type: 'image', name: 'Image' },
      { id: `col-${timestamp}-3`, type: 'text', name: 'Copy' },
      { id: `col-${timestamp}-4`, type: 'audio', name: 'Music' },
      { id: `col-${timestamp}-5`, type: 'audio', name: 'Voice Over' },
    ];
    
    // Create slots for a single row based on the columns
    const slots: MatrixSlot[] = defaultColumns.map(col => ({
      id: `slot-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
      type: col.type,
      assetId: null,
      locked: false,
      name: col.name,
    }));
    
    // Create the matrix with one row
    return {
      id: `matrix-${timestamp}`,
      name: 'New Campaign Matrix',
      campaignId,
      columns: defaultColumns,
      rows: [
        {
          id: `row-${timestamp}-1`,
          slots,
          locked: false,
          renderStatus: 'idle',
        },
      ],
    };
  };

  /**
   * Save the matrix data to the server
   */
  const saveMatrix = useCallback(async () => {
    if (!matrixData) return;
    
    try {
      setSaving(true);
      setError(null);
      
      let response;
      
      if (matrixId) {
        // Update existing matrix
        response = await apiClient.matrix.update(matrixId, matrixData);
      } else {
        // Create new matrix
        response = await apiClient.matrix.create(matrixData);
      }
      
      const savedMatrixId = response.data.data.id;
      setMatrixId(savedMatrixId);
      
      // Update the matrix data with any changes from the server
      setMatrixData(response.data.data);
      
      return savedMatrixId;
    } catch (err: any) {
      console.error('Error saving matrix:', err);
      setError(err.response?.data?.message || 'Failed to save matrix');
      return null;
    } finally {
      setSaving(false);
    }
  }, [matrixData, matrixId]);

  /**
   * Add a new row to the matrix
   */
  const addRow = useCallback(() => {
    if (!matrixData) return;
    
    const timestamp = Date.now();
    
    // Create slots for the new row based on the existing columns
    const newSlots: MatrixSlot[] = matrixData.columns.map(col => ({
      id: `slot-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
      type: col.type,
      assetId: null,
      locked: false,
      name: col.name,
    }));
    
    // Add the new row to the matrix
    setMatrixData({
      ...matrixData,
      rows: [
        ...matrixData.rows,
        {
          id: `row-${timestamp}-${matrixData.rows.length + 1}`,
          slots: newSlots,
          locked: false,
          renderStatus: 'idle',
        }
      ]
    });
  }, [matrixData]);

  /**
   * Delete a row from the matrix
   */
  const deleteRow = useCallback((rowId: string) => {
    if (!matrixData) return;
    
    // Remove the row from the matrix
    setMatrixData({
      ...matrixData,
      rows: matrixData.rows.filter(row => row.id !== rowId)
    });
  }, [matrixData]);

  /**
   * Duplicate a row in the matrix
   */
  const duplicateRow = useCallback((rowId: string) => {
    if (!matrixData) return;
    
    // Find the row to duplicate
    const rowToDuplicate = matrixData.rows.find(row => row.id === rowId);
    if (!rowToDuplicate) return;
    
    const timestamp = Date.now();
    
    // Create a duplicate of the row with new IDs
    const duplicatedRow: MatrixRow = {
      id: `row-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
      slots: rowToDuplicate.slots.map(slot => ({
        ...slot,
        id: `slot-${timestamp}-${Math.random().toString(36).substring(2, 9)}`,
        locked: false
      })),
      locked: false,
      renderStatus: 'idle',
    };
    
    // Add the duplicated row to the matrix
    setMatrixData({
      ...matrixData,
      rows: [...matrixData.rows, duplicatedRow]
    });
  }, [matrixData]);

  /**
   * Toggle the lock state of a slot
   */
  const toggleSlotLock = useCallback((rowId: string, slotId: string) => {
    if (!matrixData) return;
    
    // Update the matrix with the toggled lock state
    setMatrixData({
      ...matrixData,
      rows: matrixData.rows.map(row => 
        row.id === rowId
          ? {
              ...row,
              slots: row.slots.map(slot => 
                slot.id === slotId
                  ? { ...slot, locked: !slot.locked }
                  : slot
              )
            }
          : row
      )
    });
  }, [matrixData]);

  /**
   * Toggle the lock state of a row
   */
  const toggleRowLock = useCallback((rowId: string) => {
    if (!matrixData) return;
    
    // Update the matrix with the toggled lock state
    setMatrixData({
      ...matrixData,
      rows: matrixData.rows.map(row => 
        row.id === rowId
          ? { ...row, locked: !row.locked }
          : row
      )
    });
  }, [matrixData]);

  /**
   * Set an asset for a specific slot
   */
  const setSlotAsset = useCallback((rowId: string, slotId: string, assetId: string | null) => {
    if (!matrixData) return;
    
    // Update the matrix with the selected asset
    setMatrixData({
      ...matrixData,
      rows: matrixData.rows.map(row => ({
        ...row,
        slots: row.slots.map(slot => 
          (row.id === rowId && slot.id === slotId)
            ? { ...slot, assetId }
            : slot
        )
      }))
    });
  }, [matrixData]);

  /**
   * Render a specific row
   */
  const renderRow = useCallback(async (rowId: string) => {
    if (!matrixData || !matrixId) return;
    
    try {
      setError(null);
      
      // Update row status to rendering
      setMatrixData({
        ...matrixData,
        rows: matrixData.rows.map(row => 
          row.id === rowId
            ? { ...row, renderStatus: 'rendering' }
            : row
        )
      });
      
      // Call API to render the row
      await apiClient.matrix.renderRow(matrixId, rowId);
      
      // In a production implementation, we would set up WebSocket listeners here
      // For now, we'll just update the state directly after the API call
      
      // The API call would return a render job ID that we can use to track the render progress
      // const renderJobId = await apiClient.matrix.renderRow(matrixId, rowId);
      
      // Subscribe to render job updates
      const handleRenderUpdate = (update: { renderJobId: string; status: string; previewUrl: string }) => {
        // In a real implementation, this would be called when we receive a WebSocket update
        if (update.renderJobId && update.status === 'complete') {
          setMatrixData(prevMatrix => {
            if (!prevMatrix) return null;
            
            return {
              ...prevMatrix,
              rows: prevMatrix.rows.map(row => 
                row.id === rowId
                  ? { 
                      ...row, 
                      renderStatus: 'complete',
                      previewUrl: update.previewUrl
                    }
                  : row
              )
            };
          });
          
          // Unsubscribe from updates for this job
          // renderUpdateService.unsubscribe(renderJobId, handleRenderUpdate);
        }
      };
      
      // renderUpdateService.subscribe(renderJobId, handleRenderUpdate);
    } catch (err: any) {
      console.error('Error rendering row:', err);
      setError(err.response?.data?.message || 'Failed to render row');
      
      // Update row status to failed
      setMatrixData(prevMatrix => {
        if (!prevMatrix) return null;
        
        return {
          ...prevMatrix,
          rows: prevMatrix.rows.map(row => 
            row.id === rowId
              ? { ...row, renderStatus: 'failed' }
              : row
          )
        };
      });
    }
  }, [matrixData, matrixId]);

  /**
   * Render all rows in the matrix
   */
  const renderAllRows = useCallback(async () => {
    if (!matrixData || !matrixId) return;
    
    try {
      setRenderingAll(true);
      setError(null);
      
      // Update all rows to rendering status
      setMatrixData({
        ...matrixData,
        rows: matrixData.rows.map(row => ({
          ...row,
          renderStatus: 'rendering'
        }))
      });
      
      // Call API to render all rows
      await apiClient.matrix.renderAll(matrixId);
      
      // In a production implementation, we would set up WebSocket listeners here
      // For now, we'll just update the state directly after the API call
      
      // The API call would return a batch render job ID that we can use to track the render progress
      // const batchRenderJobId = await apiClient.matrix.renderAll(matrixId);
      
      // Subscribe to batch render job updates
      const handleBatchRenderUpdate = (update: { 
        batchRenderJobId?: string; 
        status?: string; 
        completedRows?: Array<{rowId: string; previewUrl: string}>
      }) => {
        // In a real implementation, this would be called when we receive a WebSocket update
        if (update.batchRenderJobId) {
          // Update individual row statuses
          if (update.completedRows) {
            setMatrixData(prevMatrix => {
              if (!prevMatrix) return null;
              
              return {
                ...prevMatrix,
                rows: prevMatrix.rows.map(row => {
                  const completedRow = update.completedRows?.find(cr => cr.rowId === row.id);
                  if (completedRow) {
                    return { 
                      ...row, 
                      renderStatus: 'complete',
                      previewUrl: completedRow.previewUrl
                    };
                  }
                  return row;
                })
              };
            });
          }
          
          // If batch job is complete, update UI state
          if (update.status === 'complete') {
            setRenderingAll(false);
            // renderUpdateService.unsubscribe(batchRenderJobId, handleBatchRenderUpdate);
          }
        }
      };
      
      // renderUpdateService.subscribe(batchRenderJobId, handleBatchRenderUpdate);
    } catch (err: any) {
      console.error('Error rendering all rows:', err);
      setError(err.response?.data?.message || 'Failed to render all rows');
      setRenderingAll(false);
      
      // Update rows to failed status
      setMatrixData(prevMatrix => {
        if (!prevMatrix) return null;
        
        return {
          ...prevMatrix,
          rows: prevMatrix.rows.map(row => ({
            ...row,
            renderStatus: 'failed'
          }))
        };
      });
    }
  }, [matrixData, matrixId]);

  /**
   * Generate combinations of assets
   */
  const generateCombinations = useCallback(async (options: CombinationOptions) => {
    if (!matrixData || !matrixId) return;
    
    try {
      setError(null);
      
      // Call API to generate combinations
      const response = await apiClient.matrix.generateCombinations(
        matrixId, 
        options
      );
      
      // Update matrix with new combinations
      setMatrixData(response.data.data);
      return true;
    } catch (err: any) {
      console.error('Error generating combinations:', err);
      setError(err.response?.data?.message || 'Failed to generate combinations');
      return false;
    }
  }, [matrixData, matrixId]);

  return {
    matrixData,
    matrixId,
    loading,
    error,
    saving,
    renderingAll,
    loadMatrixData,
    saveMatrix,
    addRow,
    deleteRow,
    duplicateRow,
    toggleSlotLock,
    toggleRowLock,
    setSlotAsset,
    renderRow,
    renderAllRows,
    generateCombinations
  };
};