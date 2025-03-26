"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.requireAdmin = exports.checkAdmin = exports.authenticateToken = exports.checkAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabaseClient_1 = require("../db/supabaseClient");
// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
/**
 * Middleware to authenticate JWT token and attach user to request
 */
const checkAuth = async (req, res, next) => {
    // Check for development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEV_BYPASS_AUTH === 'true';
    // In development mode, bypass authentication entirely
    if (isDevelopment) {
        console.log('[DEV] Bypassing authentication check');
        // Set a mock user on the request
        req.user = {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'admin@airwave.dev',
            role: 'admin',
            name: 'Development Admin'
        };
        return next();
    }
    try {
        // Get the token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        // First try to verify with our JWT
        jsonwebtoken_1.default.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                // If our JWT verification fails, try Supabase token
                try {
                    // Verify with Supabase
                    const { data, error } = await supabaseClient_1.supabase.auth.getUser(token);
                    if (error || !data.user) {
                        return res.status(403).json({ message: 'Invalid or expired token' });
                    }
                    // Get user role from Supabase
                    const { data: userData } = await supabaseClient_1.supabase
                        .from('users')
                        .select('role')
                        .eq('id', data.user.id)
                        .single();
                    req.user = {
                        id: data.user.id,
                        email: data.user.email,
                        role: userData?.role || 'user'
                    };
                    return next();
                }
                catch (supabaseError) {
                    console.error('Supabase auth error:', supabaseError);
                    return res.status(403).json({ message: 'Invalid or expired token' });
                }
            }
            // If JWT verification succeeds, use the decoded token
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
