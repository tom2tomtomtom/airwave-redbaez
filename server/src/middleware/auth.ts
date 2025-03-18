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

// Dev mode for testing
const DEV_MODE = process.env.NODE_ENV !== 'production';
const DEV_BYPASS_AUTH = process.env.DEV_BYPASS_AUTH === 'true'; // Only true if explicitly set

// Force disable prototype mode
process.env.PROTOTYPE_MODE = 'false';
const PROTOTYPE_MODE = false; // Force disable prototype mode

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';

/**
 * Middleware to authenticate JWT token and attach user to request
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  console.log('Running authenticateToken middleware');
  
  // Temporary development testing bypass
  if (DEV_MODE && DEV_BYPASS_AUTH) {
    console.log('DEV MODE: Bypassing authentication for testing');
    // Assign a mock user for testing purposes
    req.user = {
      id: '00000000-0000-0000-0000-000000000000', // Valid UUID for testing
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    };
    return next();
  }
  
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
    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        console.error('Token verification failed:', err.message);
        return res.status(403).json({ 
          success: false,
          message: 'Invalid or expired token' 
        });
      }

      console.log('Token verified successfully. Decoded:', decoded);
      
      // Verify that the user exists in the database
      const { data: user, error } = await supabase
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
  } catch (error) {
    console.error('Authentication error:', error);
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