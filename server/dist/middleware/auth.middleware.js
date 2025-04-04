"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.checkAdmin = exports.checkAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const ApiError_1 = require("../utils/ApiError");
const errorTypes_1 = require("../types/errorTypes");
// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
// Validate JWT secret is set
if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable must be set in production');
    }
    else {
        logger_1.logger.warn('JWT_SECRET not set, using insecure default for development only');
    }
}
// Middleware to check if user is authenticated
const checkAuth = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.UNAUTHORIZED, 'Authentication required'));
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.UNAUTHORIZED, 'Invalid authentication token'));
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET || 'development-only-insecure-key');
        // Attach user to request
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };
        next();
    }
    catch (error) {
        logger_1.logger.error('Authentication error:', error);
        return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.UNAUTHORIZED, 'Invalid or expired token'));
    }
};
exports.checkAuth = checkAuth;
// Middleware to check if user has admin role
const checkAdmin = (req, res, next) => {
    if (!req.user) {
        return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.UNAUTHORIZED, 'Authentication required'));
    }
    if (req.user.role !== 'admin') {
        return next(new ApiError_1.ApiError(errorTypes_1.ErrorCode.FORBIDDEN, 'Admin access required'));
    }
    next();
};
exports.checkAdmin = checkAdmin;
// Generate JWT token
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET || 'development-only-insecure-key', { expiresIn: '24h' });
};
exports.generateToken = generateToken;
