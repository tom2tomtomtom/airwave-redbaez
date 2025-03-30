"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.requireAdmin = exports.checkAdmin = exports.authenticateToken = exports.checkAuth = exports.AUTH_MODE = void 0;
const TokenService_1 = require("../services/TokenService");
const supabaseClient_1 = require("../db/supabaseClient");
const errorHandler_1 = require("./errorHandler");
const errorTypes_1 = require("../types/errorTypes");
const redisClient_1 = require("../db/redisClient");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'airwave-jwt-secret-key';
// Constants
exports.AUTH_MODE = {
    PRODUCTION: 'production',
    DEVELOPMENT: 'development',
    PROTOTYPE: 'prototype',
    CURRENT: process.env.NODE_ENV || 'development',
    BYPASS_AUTH: process.env.DEV_BYPASS_AUTH === 'true' || process.env.PROTOTYPE_MODE === 'true'
};
/**
 * Middleware to authenticate requests and attach user to request object
 * Supports both JWT and Supabase authentication methods
 */
const checkAuth = async (req, res, next) => {
    // Check for development mode with auth bypass
    if ((exports.AUTH_MODE.CURRENT === 'development' || exports.AUTH_MODE.CURRENT === 'prototype') &&
        exports.AUTH_MODE.BYPASS_AUTH) {
        console.log('[DEV] Bypassing authentication check');
        // Set a mock user on the request
        req.user = {
            userId: '00000000-0000-0000-0000-000000000000',
            email: 'admin@airwave.dev',
            role: 'admin',
            sessionId: 'dev-session',
            name: 'Development Admin'
        };
        // In development mode with successful auth, return a CSRF token for the client
        const csrfToken = TokenService_1.tokenService.generateCsrfToken(req.user.sessionId);
        res.set('X-CSRF-Token', csrfToken);
        return next();
    }
    try {
        // Extract token from different possible locations
        // First try Authorization header
        let token = req.headers.authorization?.split(' ')[1];
        // Then try cookie (for HttpOnly approach)
        if (!token && req.cookies?.access_token) {
            token = req.cookies.access_token;
        }
        // No token found
        if (!token) {
            throw new errorHandler_1.ApiError({
                statusCode: 401,
                message: 'Authentication required',
                code: errorTypes_1.ErrorCode.AUTHENTICATION_REQUIRED
            });
        }
        try {
            // First try to verify with our JWT service
            const payload = TokenService_1.tokenService.verifyAccessToken(token);
            // Attach user info to request
            req.user = {
                ...payload,
                userId: payload.userId,
                email: payload.email,
                role: payload.role,
                sessionId: payload.sessionId
            };
            // Check for token in blocklist (logged out tokens)
            const isBlocked = await redisClient_1.redis.exists(`blocklist:${token}`);
            if (isBlocked) {
                throw new errorHandler_1.ApiError({
                    statusCode: 401,
                    message: 'Token has been revoked',
                    code: errorTypes_1.ErrorCode.INVALID_TOKEN
                });
            }
            // Set CSRF token in header for the client
            const csrfToken = TokenService_1.tokenService.generateCsrfToken(payload.sessionId);
            res.set('X-CSRF-Token', csrfToken);
            next();
        }
        catch (jwtError) {
            // If JWT verification fails, try Supabase token as fallback
            try {
                // Verify with Supabase
                const { data, error } = await supabaseClient_1.supabase.auth.getUser(token);
                if (error || !data.user) {
                    throw new errorHandler_1.ApiError({
                        statusCode: 401,
                        message: 'Invalid or expired token',
                        code: errorTypes_1.ErrorCode.INVALID_TOKEN
                    });
                }
                // Get user role from Supabase
                const { data: userData, error: userError } = await supabaseClient_1.supabase
                    .from('users')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();
                if (userError) {
                    console.warn('Error getting user role:', userError);
                }
                // Create a session ID for this request
                const sessionId = `supabase-${Date.now()}`;
                // Attach user info to request
                req.user = {
                    userId: data.user.id,
                    email: data.user.email || '',
                    role: userData?.role || 'user',
                    sessionId: sessionId
                };
                // Set CSRF token in header for the client
                const csrfToken = TokenService_1.tokenService.generateCsrfToken(sessionId);
                res.set('X-CSRF-Token', csrfToken);
                next();
            }
            catch (supabaseError) {
                console.error('Authentication error:', supabaseError);
                throw new errorHandler_1.ApiError({
                    statusCode: 401,
                    message: 'Authentication failed',
                    code: errorTypes_1.ErrorCode.AUTHENTICATION_REQUIRED
                });
            }
        }
    }
    catch (error) {
        next(error instanceof errorHandler_1.ApiError ? error : new errorHandler_1.ApiError({
            statusCode: 500,
            message: 'Authentication failed',
            code: errorTypes_1.ErrorCode.INTERNAL_ERROR
        }));
    }
};
exports.checkAuth = checkAuth;
// Alias for backwards compatibility
exports.authenticateToken = exports.checkAuth;
/**
 * Middleware to restrict access to admin users
 */
const checkAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};
exports.checkAdmin = checkAdmin;
// Alias for backwards compatibility
exports.requireAdmin = exports.checkAdmin;
/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
};
exports.generateToken = generateToken;
