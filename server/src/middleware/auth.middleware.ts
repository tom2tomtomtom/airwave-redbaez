import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/TokenService';
import { supabase } from '../db/supabaseClient';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';
import { redis } from '../db/redisClient';
import jwt from 'jsonwebtoken';

import { AuthenticatedUser } from '../types/shared';

// Extend Express Request type to include user property with typed information
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser & {
        sessionId: string;     // Unique identifier for the session
        [key: string]: any;
      };
    }
  }
}

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'airwave-jwt-secret-key';

// Constants
export const AUTH_MODE = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  PROTOTYPE: 'prototype',
  CURRENT: process.env.NODE_ENV || 'development',
  BYPASS_AUTH: process.env.DEV_BYPASS_AUTH === 'true' || process.env.PROTOTYPE_MODE === 'true'
};

/**
 * Middleware to authenticate requests and attach user information to the request object.
 * Supports JWT-based authentication.
 * In non-production environments, authentication can be bypassed for development purposes.
 */
export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Strict check: Only bypass authentication if NODE_ENV is explicitly *not* 'production'.
  // Avoids relying on potentially misconfigured bypass flags (DEV_BYPASS_AUTH, PROTOTYPE_MODE).
  if (process.env.NODE_ENV !== 'production') {
    // Log clearly that bypass is active due to non-production environment.
    console.warn('[AUTH BYPASS ACTIVE] Bypassing authentication check due to non-production environment.');
    
    // Set a mock user on the request
    req.user = {
      id: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      email: 'admin@airwave.dev',
      role: 'admin',
      sessionId: 'dev-session',
      name: 'Development Admin'
    };
    
    // In development mode with successful auth, return a CSRF token for the client
    const csrfToken = tokenService.generateCsrfToken(req.user.sessionId);
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
      throw new ApiError(
        ErrorCode.AUTHENTICATION_REQUIRED,
        'Authentication required'
      );
    }
    
    try {
      // First try to verify with our JWT service
      const payload = tokenService.verifyAccessToken(token);
      
      // Attach user info to request
      req.user = {
        ...payload,
        id: payload.userId || payload.id,
        userId: payload.userId || payload.id,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        role: payload.role,
        sessionId: payload.sessionId
      };
      
      // Check for token in blocklist (logged out tokens)
      const isBlocked = await redis.exists(`blocklist:${token}`);
      if (isBlocked) {
        throw new ApiError(
          ErrorCode.INVALID_TOKEN,
          'Token has been revoked'
        );
      }
      
      // Set CSRF token in header for the client
      const csrfToken = tokenService.generateCsrfToken(payload.sessionId);
      res.set('X-CSRF-Token', csrfToken);
      
      next();
    } catch (jwtError) {
      // If JWT verification fails, try Supabase token as fallback
      try {
        // Verify with Supabase
        const { data, error } = await supabase.auth.getUser(token);
        
        if (error || !data.user) {
          throw new ApiError(
            ErrorCode.INVALID_TOKEN,
            'Invalid or expired token'
          );
        }
        
        // Get user role from Supabase
        const { data: userData, error: userError } = await supabase
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
          id: data.user.id,
          userId: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          role: userData?.role || 'user',
          sessionId: sessionId
        };
        
        // Set CSRF token in header for the client
        const csrfToken = tokenService.generateCsrfToken(sessionId);
        res.set('X-CSRF-Token', csrfToken);
        
        next();
      } catch (supabaseError) {
        console.error('Authentication error:', supabaseError);
        throw new ApiError(
          ErrorCode.AUTHENTICATION_REQUIRED,
          'Authentication failed'
        );
      }
    }
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(
      ErrorCode.INTERNAL_ERROR, 
      'Authentication failed'
    ));
  }
};

// Alias for backwards compatibility
export const authenticateToken = checkAuth;

/**
 * Middleware to restrict access to admin users
 */
export const checkAdmin = (req: Request, res: Response, next: NextFunction) => {

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

// Alias for backwards compatibility
export const requireAdmin = checkAdmin;

/**
 * Generate JWT token for user
 */
export const generateToken = (user: any): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};