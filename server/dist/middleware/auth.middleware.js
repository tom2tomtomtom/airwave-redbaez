"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.requireAdmin = exports.checkAdmin = exports.authenticateToken = exports.checkAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Environment check for prototype mode
const PROTOTYPE_MODE = false; // Force disable prototype mode
// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
/**
 * Middleware to authenticate JWT token and attach user to request
 */
const checkAuth = async (req, res, next) => {
    // Skip authentication in prototype mode if enabled
    if (PROTOTYPE_MODE) {
        console.log('Warning: Running in PROTOTYPE_MODE. Authentication is simplified.');
        req.user = { id: 'prototype-user', email: 'prototype@example.com', role: 'admin' };
        return next();
    }
    try {
        // Get the token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        // Verify the token
        jsonwebtoken_1.default.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid or expired token' });
            }
            // In this implementation, we trust the decoded JWT without additional DB lookup
            // This is temporary until we implement proper user management in Supabase
            req.user = decoded;
            next();
        });
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ message: 'Authentication failed' });
    }
};
exports.checkAuth = checkAuth;
// Alias for backwards compatibility
exports.authenticateToken = exports.checkAuth;
/**
 * Middleware to restrict access to admin users
 */
const checkAdmin = (req, res, next) => {
    if (PROTOTYPE_MODE) {
        return next();
    }
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
