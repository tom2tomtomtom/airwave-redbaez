"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabaseClient_1 = require("../db/supabaseClient");
// Force disable prototype mode
process.env.PROTOTYPE_MODE = 'false';
const PROTOTYPE_MODE = false; // Force disable prototype mode
// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
/**
 * Middleware to authenticate JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
    console.log('Running authenticateToken middleware');
    console.log('Headers:', req.headers);
    try {
        // Get the token from Authorization header
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        console.log('Auth header:', authHeader);
        const token = authHeader && typeof authHeader === 'string' ? authHeader.split(' ')[1] : null;
        console.log('Token extracted:', token ? 'Token found' : 'No token');
        if (!token) {
            console.log('No token provided in the request');
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        // Verify the token
        jsonwebtoken_1.default.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                console.error('Token verification failed:', err.message);
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }
            console.log('Token verified successfully. Decoded:', decoded);
            // Verify that the user exists in the database
            const { data: user, error } = await supabaseClient_1.supabase
                .from('users')
                .select('id, email, name, role')
                .eq('id', decoded.id)
                .single();
            if (error || !user) {
                console.error('User verification failed:', error?.message || 'User not found in database');
                return res.status(403).json({
                    success: false,
                    message: 'Invalid user credentials'
                });
            }
            // Attach the verified user data from the database to the request
            req.user = user;
            console.log('User verified and attached to request:', req.user);
            next();
        });
    }
    catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Middleware to restrict access to admin users
 */
const requireAdmin = (req, res, next) => {
    console.log('Checking admin permissions for user:', req.user);
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    if (req.user.role !== 'admin') {
        console.log('Access denied - user is not admin. Role:', req.user.role);
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
    console.log('Admin access granted');
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
};
exports.generateToken = generateToken;
