import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';

// Define user interface
export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  [key: string]: unknown;
}

// Define token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;

// Validate JWT secret is set
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  } else {
    logger.warn('JWT_SECRET not set, using insecure default for development only');
  }
}

// Middleware to check if user is authenticated
export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(ErrorCode.UNAUTHORIZED, 'Authentication required'));
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(new ApiError(ErrorCode.UNAUTHORIZED, 'Invalid authentication token'));
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET || 'development-only-insecure-key') as TokenPayload;
    
    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return next(new ApiError(ErrorCode.UNAUTHORIZED, 'Invalid or expired token'));
  }
}

// Export authenticateToken as an alias for checkAuth for backward compatibility
export const authenticateToken = checkAuth;

// Middleware to check if user has admin role
export const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ApiError(ErrorCode.UNAUTHORIZED, 'Authentication required'));
  }
  
  if (req.user.role !== 'admin') {
    return next(new ApiError(ErrorCode.FORBIDDEN, 'Admin access required'));
  }
  
  next();
}

// Generate JWT token
export const generateToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(
    payload,
    JWT_SECRET || 'development-only-insecure-key',
    { expiresIn: '24h' }
  );
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
