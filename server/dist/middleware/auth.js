"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticateToken = exports.AUTH_MODE = void 0;
const supabaseClient_1 = require("../db/supabaseClient");
/**
 * Authentication configuration
 */
// Single source of truth for auth mode
exports.AUTH_MODE = {
    // Main auth mode - controls which authentication mechanism is active
    // Values: 'production', 'development', 'prototype'
    CURRENT: process.env.NODE_ENV === 'production' ? 'production' :
        process.env.PROTOTYPE_MODE === 'true' ? 'prototype' : 'development',
    // Explicit auth bypass (only works in development and prototype modes)
    BYPASS_AUTH: process.env.DEV_BYPASS_AUTH === 'true',
    // Development user constants - must match client-side values
    DEV_USER_ID: '00000000-0000-0000-0000-000000000000',
    DEV_TOKEN: 'dev-token-fixed-airwave'
};
// Log the current auth mode on startup
console.log(`Auth Mode: ${exports.AUTH_MODE.CURRENT} ${exports.AUTH_MODE.BYPASS_AUTH ? '(with auth bypass)' : ''}`);
/**
 * Middleware to authenticate Supabase token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
    console.log('Running authenticateToken middleware');
    // For development mode, simplify the authentication process
    if (exports.AUTH_MODE.CURRENT === 'development' || exports.AUTH_MODE.CURRENT === 'prototype') {
        // If explicitly bypassing auth, use the development user
        if (exports.AUTH_MODE.BYPASS_AUTH) {
            console.log(`${exports.AUTH_MODE.CURRENT.toUpperCase()} MODE: Bypassing authentication with DEV_USER_ID`);
            // Assign a consistent development user
            req.user = {
                id: exports.AUTH_MODE.DEV_USER_ID, // Consistent development user ID
                email: 'dev@example.com',
                name: 'Development User',
                role: 'admin'
            };
            return next();
        }
        // In development mode, if we have any token, let's be permissive
        // This helps during development when tokens might not validate perfectly
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            console.log(`${exports.AUTH_MODE.CURRENT.toUpperCase()} MODE: Using simplified auth`);
            // Check for the development token
            const token = authHeader.split(' ')[1];
            if (token === exports.AUTH_MODE.DEV_TOKEN) {
                console.log('Development token detected, using dev user');
                // Use the development user
                req.user = {
                    id: exports.AUTH_MODE.DEV_USER_ID,
                    email: 'dev@example.com',
                    name: 'Development User',
                    role: 'admin'
                };
                return next();
            }
            try {
                // Try to get a session from Supabase
                const { data } = await supabaseClient_1.supabase.auth.getSession();
                if (data?.session?.user) {
                    // Use the session user
                    req.user = {
                        id: data.session.user.id,
                        email: data.session.user.email || '',
                        name: data.session.user.user_metadata?.name || 'User',
                        role: data.session.user.user_metadata?.role || 'user'
                    };
                    return next();
                }
                // If no session, fall through to regular auth process
            }
            catch (error) {
                console.log('Error getting session in development mode:', error);
                // Fall through to regular auth process
            }
        }
    }
    try {
        // Get the token from Authorization header
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        console.log('Auth header present:', !!authHeader);
        const token = authHeader && typeof authHeader === 'string' ? authHeader.split(' ')[1] : null;
        if (!token) {
            console.log('No token provided in the request');
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Variables to hold the authenticated user data
        let authenticatedUser = null;
        // First try to get the session directly without passing the token
        // This works better with the Supabase cookie-based auth
        try {
            const { data: sessionData } = await supabaseClient_1.supabase.auth.getSession();
            if (sessionData?.session) {
                console.log('Using Supabase session from cookies');
                authenticatedUser = sessionData.session.user;
            }
            else {
                // If no session from cookies, try with the provided token
                console.log('No session from cookies, trying with token');
                const { data: userData, error: userError } = await supabaseClient_1.supabase.auth.getUser(token);
                if (userError || !userData.user) {
                    console.error('Supabase token verification failed:', userError?.message || 'Invalid token');
                    return res.status(403).json({
                        success: false,
                        message: 'Invalid or expired token'
                    });
                }
                authenticatedUser = userData.user;
            }
        }
        catch (error) {
            console.error('Error during Supabase authentication:', error);
            return res.status(403).json({
                success: false,
                message: 'Authentication error'
            });
        }
        console.log('Supabase token verified for user:', authenticatedUser.id);
        // Get additional user data from our database
        const { data: dbUser, error: dbError } = await supabaseClient_1.supabase
            .from('users')
            .select('id, email, name, role')
            .eq('id', authenticatedUser.id)
            .single();
        if (dbError && dbError.code !== 'PGRST116') { // PGRST116 is 'not found'
            console.error('Error fetching user from database:', dbError.message);
        }
        // Combine data from Auth and database
        // If user exists in our database, use that data, otherwise create basic user object from auth data
        const user = dbUser || {
            id: authenticatedUser.id,
            email: authenticatedUser.email || '',
            name: authenticatedUser.user_metadata?.name || 'User',
            role: authenticatedUser.user_metadata?.role || 'user'
        };
        // Attach the verified user data to the request
        req.user = user;
        console.log('User verified and attached to request:', req.user.id);
        next();
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
