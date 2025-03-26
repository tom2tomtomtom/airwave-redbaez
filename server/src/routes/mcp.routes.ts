import express from 'express';
import { body } from 'express-validator';
import mcpController from '../controllers/mcpController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * @route POST /api/mcp/process
 * @desc Process a sequential thinking request through the MCP service
 * @access Private
 */
router.post(
  '/process',
  [
    authenticateToken,
    body('input').notEmpty().withMessage('Input is required'),
    body('maxSteps').optional().isInt({ min: 1, max: 10 }).withMessage('Max steps must be between 1 and 10'),
  ],
  mcpController.processRequest
);

export default router;
