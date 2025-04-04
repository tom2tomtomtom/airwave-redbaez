import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';
import MCPService from '../services/mcp/mcpService';

// Initialize the MCP service
const mcpService = new MCPService();

/**
 * Controller for Media Content Platform (MCP) operations
 */
export const mcpController = {
  /**
   * Get MCP status
   */
  getStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get MCP status
      logger.info('Getting MCP status');
      
      const status = await mcpService.getStatus();
      
      return res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Error getting MCP status:', error);
      next(error);
    }
  },
  
  /**
   * Create a new MCP project
   */
  createProject: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { name, description, settings } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Project name is required'
        });
      }
      
      // Create project
      logger.info(`Creating MCP project: ${name}`);
      
      const project = await mcpService.createProject({
        name,
        description,
        settings,
        userId: req.user?.id
      });
      
      return res.status(201).json({
        success: true,
        data: project
      });
    } catch (error) {
      logger.error('Error creating MCP project:', error);
      next(error);
    }
  }
};
