"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const mcpService_1 = __importDefault(require("../services/mcp/mcpService"));
/**
 * Controller for handling Model Communication Protocol (MCP) requests
 * Manages sequential thinking operations through the MCP service
 */
class MCPController {
    constructor() {
        /**
         * Process a sequential thinking request through the MCP service
         * @param req Express request object containing MCP request parameters
         * @param res Express response object
         */
        this.processRequest = async (req, res) => {
            try {
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({ errors: errors.array() });
                    return;
                }
                const mcpRequest = {
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
            }
            catch (error) {
                console.error('Error processing MCP request:', error);
                res.status(500).json({ error: 'Error processing request', details: String(error) });
            }
        };
        try {
            this.mcpService = new mcpService_1.default();
        }
        catch (error) {
            console.error('Failed to initialize MCP service:', error);
            // Initialize with a dummy service that will throw errors when used
            // This ensures the property is definitely assigned
            this.mcpService = {};
        }
    }
}
exports.default = new MCPController();
