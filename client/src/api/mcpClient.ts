import apiClient from './apiClient';
// Ensure correct import path for MCP types
import type { MCPRequest, MCPResponse } from '../types/mcp';

/**
 * Client for interacting with the Model Communication Protocol (MCP) service
 * Provides methods for sequential thinking operations
 */
export const mcpClient = {
  /**
   * Process a sequential thinking request through the MCP service
   * @param request The MCP request containing input, context, and configuration
   * @returns Promise resolving to the MCP response with all reasoning steps
   */
  processRequest: async (request: MCPRequest): Promise<MCPResponse> => {
    try {
      const response = await apiClient.post('/api/mcp/process', request);
      return response.data as MCPResponse;
    } catch (error) {
      console.error('Error processing MCP request:', error);
      throw error;
    }
  },
};
