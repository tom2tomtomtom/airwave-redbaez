import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to check if user is authenticated
 * For prototype: Simple validation with all users as admin
 * Production-ready: Validates JWT and includes role-based checks
 */
export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // FOR PROTOTYPE: Skip strict token validation
    if (process.env.NODE_ENV === 'development' && process.env.PROTOTYPE_MODE === 'true') {
      // For prototype, assign admin privileges to all requests
      req.user = {
        id: 'prototype-user',
        email: 'admin@redbaez.com',
        role: 'admin'
      };
      return next();
    }

    // PRODUCTION: Verify token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided, access denied'
      });
    }

    const secret = process.env.JWT_SECRET || 'prototype-secret';
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: string;
    };

    // Add user from payload to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Middleware to check if user has admin role
 * For prototype: Automatically passes all users
 * Production: Checks user's role
 */
export const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
  // For prototype, all users are treated as admins
  if (process.env.NODE_ENV === 'development' && process.env.PROTOTYPE_MODE === 'true') {
    return next();
  }

  // For production, validate the role
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required'
    });
  }

  next();
};