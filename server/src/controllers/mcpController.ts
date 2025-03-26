import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import MCPService from '../services/mcp/mcpService';
import { MCPRequest } from '../types/mcp';

/**
 * Controller for handling Model Communication Protocol (MCP) requests
 * Manages sequential thinking operations through the MCP service
 */
class MCPController {
  private mcpService: MCPService;

  constructor() {
    try {
      this.mcpService = new MCPService();
    } catch (error) {
      console.error('Failed to initialize MCP service:', error);
      // Initialize with a dummy service that will throw errors when used
      // This ensures the property is definitely assigned
      this.mcpService = {} as MCPService;
    }
  }

  /**
   * Process a sequential thinking request through the MCP service
   * @param req Express request object containing MCP request parameters
   * @param res Express response object
   */
  processRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const mcpRequest: MCPRequest = {
        input: req.body.input,
        context: req.body.context,
        maxSteps: req.body.maxSteps,
        format: req.body.format
      };

      if (!mcpRequest.input) {
        res.status(400).json({ error: 'Input is required' });
        return;
      }

      const result = await this.mcpService.process(mcpRequest);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error processing MCP request:', error);
      res.status(500).json({ error: 'Error processing request', details: String(error) });
    }
  };
}

export default new MCPController();
