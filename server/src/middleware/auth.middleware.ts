import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../db/supabaseClient';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Environment check for prototype mode
const PROTOTYPE_MODE = process.env.PROTOTYPE_MODE === 'true';

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';

/**
 * Middleware to authenticate JWT token and attach user to request
 */
export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
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
    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }

      // Get user from Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .single();

      if (error || !user) {
        return res.status(403).json({ message: 'User not found or not authorized' });
      }

      // Attach user to request object
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

// Alias for backwards compatibility
export const authenticateToken = checkAuth;

/**
 * Middleware to restrict access to admin users
 */
export const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (PROTOTYPE_MODE) {
    return next();
  }

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