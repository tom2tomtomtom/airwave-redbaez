"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const mcpController_1 = __importDefault(require("../controllers/mcpController"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * @route POST /api/mcp/process
 * @desc Process a sequential thinking request through the MCP service
 * @access Private
 */
router.post('/process', [
    auth_1.authenticateToken,
    (0, express_validator_1.body)('input').notEmpty().withMessage('Input is required'),
    (0, express_validator_1.body)('maxSteps').optional().isInt({ min: 1, max: 10 }).withMessage('Max steps must be between 1 and 10'),
], mcpController_1.default.processRequest);
exports.default = router;
