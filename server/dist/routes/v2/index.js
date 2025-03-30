"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * V2 API Routes
 *
 * Registry of all V2 API routes
 * Uses slug-based design for better URL structure
 */
const express_1 = __importDefault(require("express"));
const clients_routes_1 = __importDefault(require("./clients.routes"));
const assets_routes_1 = __importDefault(require("../assets.routes"));
const logger_1 = require("../../utils/logger");
const router = express_1.default.Router();
// Register v2 routes
router.use('/clients', clients_routes_1.default);
router.use('/assets', assets_routes_1.default);
logger_1.logger.info('V2 API routes initialized');
exports.default = router;
