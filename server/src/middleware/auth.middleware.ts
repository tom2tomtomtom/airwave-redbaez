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

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';

/**
 * Middleware to authenticate JWT token and attach user to request
 */
export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {

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
    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        // If our JWT verification fails, try Supabase token
        try {
          // Verify with Supabase
          const { data, error } = await supabase.auth.getUser(token);
          
          if (error || !data.user) {
            return res.status(403).json({ message: 'Invalid or expired token' });
          }
          
          // Get user role from Supabase
          const { data: userData } = await supabase
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
        } catch (supabaseError) {
          console.error('Supabase auth error:', supabaseError);
          return res.status(403).json({ message: 'Invalid or expired token' });
        }
      }

      // If JWT verification succeeds, use the decoded token
      req.user = decoded;
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