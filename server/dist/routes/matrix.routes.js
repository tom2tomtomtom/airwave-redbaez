"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const matrixService_1 = require("../services/matrixService");
const supabaseClient_1 = require("../db/supabaseClient");
const router = express_1.default.Router();
// Create a new matrix configuration
router.post('/', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { campaignId, name, slots, rows, description } = req.body;
        if (!campaignId || !name || !slots) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        // Create matrix configuration
        const matrix = await matrixService_1.matrixService.createMatrix({
            campaignId,
            name,
            description,
            slots,
            rows: rows || []
        }, req.user.id);
        res.status(201).json({
            success: true,
            message: 'Matrix configuration created successfully',
            data: matrix
        });
    }
    catch (error) {
        console.error('Error creating matrix configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create matrix configuration',
            error: error.message
        });
    }
});
// Get all matrices for a campaign
router.get('/campaign/:campaignId', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { data, error } = await supabaseClient_1.supabase
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
    }
    catch (error) {
        console.error('Error fetching matrix configurations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch matrix configurations',
            error: error.message
        });
    }
});
// Get a specific matrix by ID
router.get('/:id', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const matrix = await matrixService_1.matrixService.getMatrixById(id);
        res.json({
            success: true,
            data: matrix
        });
    }
    catch (error) {
        console.error('Error fetching matrix configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch matrix configuration',
            error: error.message
        });
    }
});
// Update a matrix configuration
router.put('/:id', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, slots, rows } = req.body;
        // Update the matrix
        const matrix = await matrixService_1.matrixService.updateMatrix(id, {
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
    }
    catch (error) {
        console.error('Error updating matrix configuration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update matrix configuration',
            error: error.message
        });
    }
});
// Generate combinations for a matrix
router.post('/:id/combinations', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const options = req.body.options || {};
        // Generate combinations
        const matrix = await matrixService_1.matrixService.generateCombinations(id, options);
        res.json({
            success: true,
            message: 'Combinations generated successfully',
            data: matrix
        });
    }
    catch (error) {
        console.error('Error generating combinations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate combinations',
            error: error.message
        });
    }
});
// Render a specific row in the matrix
router.post('/:id/rows/:rowId/render', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { id, rowId } = req.params;
        // Render the row
        const row = await matrixService_1.matrixService.renderMatrixRow(id, rowId);
        res.json({
            success: true,
            message: 'Render job started successfully',
            data: row
        });
    }
    catch (error) {
        console.error('Error rendering matrix row:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to render matrix row',
            error: error.message
        });
    }
});
// Update a row's lock status
router.put('/:id/rows/:rowId/lock', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { id, rowId } = req.params;
        const { locked } = req.body;
        if (typeof locked !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Locked status must be a boolean'
            });
        }
        // Get the current matrix
        const matrix = await matrixService_1.matrixService.getMatrixById(id);
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
        const updatedMatrix = await matrixService_1.matrixService.updateMatrix(id, { rows: matrix.rows });
        res.json({
            success: true,
            message: `Row ${locked ? 'locked' : 'unlocked'} successfully`,
            data: updatedMatrix.rows[rowIndex]
        });
    }
    catch (error) {
        console.error('Error updating row lock status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update row lock status',
            error: error.message
        });
    }
});
// Update a slot's lock status
router.put('/:id/slots/:slotId/lock', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { id, slotId } = req.params;
        const { locked } = req.body;
        if (typeof locked !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Locked status must be a boolean'
            });
        }
        // Get the current matrix
        const matrix = await matrixService_1.matrixService.getMatrixById(id);
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
        const updatedMatrix = await matrixService_1.matrixService.updateMatrix(id, { slots: matrix.slots });
        res.json({
            success: true,
            message: `Slot ${locked ? 'locked' : 'unlocked'} successfully`,
            data: updatedMatrix.slots[slotIndex]
        });
    }
    catch (error) {
        console.error('Error updating slot lock status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update slot lock status',
            error: error.message
        });
    }
});
// Render all rows in the matrix
router.post('/:id/render-all', auth_middleware_1.checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // Get the matrix
        const matrix = await matrixService_1.matrixService.getMatrixById(id);
        // Get rows that are in draft status
        const draftRows = matrix.rows.filter(row => row.status === 'draft');
        if (draftRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No draft rows to render'
            });
        }
        // Start rendering each row (in parallel)
        const renderPromises = draftRows.map(row => matrixService_1.matrixService.renderMatrixRow(id, row.id)
            .catch(error => {
            console.error(`Error rendering row ${row.id}:`, error);
            return null;
        }));
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
    }
    catch (error) {
        console.error('Error rendering all rows:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to render rows',
            error: error.message
        });
    }
});
exports.default = router;
