import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { supabase } from '../db/supabaseClient';
import { AuthenticatedUser } from '../types/shared'; // Import canonical type

/**
 * Authentication configuration
 */
// Single source of truth for auth mode
export const AUTH_MODE = {
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
logger.info(`Auth Mode: ${AUTH_MODE.CURRENT} ${AUTH_MODE.BYPASS_AUTH ? '(with auth bypass)' : ''}`);

/**
 * Middleware to authenticate Supabase token and attach user to request
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  logger.info('Running authenticateToken middleware');
  
  // For development mode, simplify the authentication process
  if (AUTH_MODE.CURRENT === 'development' || AUTH_MODE.CURRENT === 'prototype') {
    // If explicitly bypassing auth, use the development user
    if (AUTH_MODE.BYPASS_AUTH) {
      logger.info(`${AUTH_MODE.CURRENT.toUpperCase()} MODE: Bypassing authentication with DEV_USER_ID`);
      // Assign a consistent development user
      const devUser: AuthenticatedUser = {
        userId: AUTH_MODE.DEV_USER_ID, // Consistent development user ID
        email: 'dev@example.com',
        role: 'admin',
        sessionId: 'dev-session-bypass' // Added session ID for dev mode
      };
      req.user = devUser;
      return next();
    }
    
    // In development mode, if we have any token, let's be permissive
    // This helps during development when tokens might not validate perfectly
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      logger.info(`${AUTH_MODE.CURRENT.toUpperCase()} MODE: Using simplified auth`);
      
      // Check for the development token
      const token = authHeader.split(' ')[1];
      if (token === AUTH_MODE.DEV_TOKEN) {
        logger.info('Development token detected, using dev user');
        // Use the development user
        const devUser: AuthenticatedUser = {
          userId: AUTH_MODE.DEV_USER_ID,
          email: 'dev@example.com',
          role: 'admin',
          sessionId: 'dev-session-token' // Added session ID for dev mode
        };
        req.user = devUser;
        return next();
      }
      
      try {
        // Try to get a session from Supabase
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          // Use the session user
          const supabaseUser: AuthenticatedUser = {
            userId: data.session.user.id,
            email: data.session.user.email || '',
            role: data.session.user.user_metadata?.role || 'user',
            sessionId: data.session.access_token || 'supabase-session-fallback' // Use access token as session identifier
          };
          req.user = supabaseUser;
          return next();
        }
        
        // If no session, fall through to regular auth process
      } catch (error) {
        logger.info('Error getting session in development mode:', error);
        // Fall through to regular auth process
      }
    }
  }
  
  try {
    // Get the token from Authorization header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    logger.info('Auth header present:', !!authHeader);
    
    const token = authHeader && typeof authHeader === 'string' ? authHeader.split(' ')[1] : null;
    
    if (!token) {
      logger.info('No token provided in the request');
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    // Variables to hold the authenticated user data
    let authenticatedUser: Record<string, unknown> = null;

    // First try to get the session directly without passing the token
    // This works better with the Supabase cookie-based auth
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session) {
        logger.info('Using Supabase session from cookies');
        authenticatedUser = sessionData.session.user;
      } else {
        // If no session from cookies, try with the provided token
        logger.info('No session from cookies, trying with token');
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !userData.user) {
          logger.error('Supabase token verification failed:', userError?.message || 'Invalid token');
          return res.status(403).json({ 
            success: false,
            message: 'Invalid or expired token' 
          });
        }
        
        authenticatedUser = userData.user;
      }
    } catch (error) {
      logger.error('Error during Supabase authentication:', error);
      return res.status(403).json({ 
        success: false,
        message: 'Authentication error' 
      });
    }

    logger.info('Supabase token verified for user:', authenticatedUser.id);
    
    // Get additional user data from our database
    const dbUser = null; // Placeholder
    
    // Ensure authenticatedUser has the correct shape matching AuthenticatedUser
    const jwtAuthenticatedUser: AuthenticatedUser = {
      userId: authenticatedUser.id,
      email: authenticatedUser.email, 
      role: authenticatedUser.user_metadata?.role,
      sessionId: authenticatedUser.id 
    };
    
    // Combine data - currently just uses jwtAuthenticatedUser as dbUser is null
    const user: AuthenticatedUser = dbUser || jwtAuthenticatedUser;
    
    // Attach user to request
    req.user = user;
    if (req.user) { // Check if user is defined before logging
      logger.info('User verified and attached to request:', req.user.userId);
    }
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication failed' 
    });
  }
};

/**
 * Middleware to restrict access to admin users
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  logger.info('Checking admin permissions for user:', req.user);
  
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required' 
    });
  }
  
  if (req.user.role !== 'admin') {
    logger.info('Access denied - user is not admin. Role:', req.user.role);
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin only.' 
    });
  }
  
  logger.info('Admin access granted');
  next();
};