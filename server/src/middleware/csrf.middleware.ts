import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/TokenService';
import { ApiError } from './errorHandler';
import { ErrorCode } from '../types/errorTypes';

// List of methods that require CSRF protection
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// URLs that should be exempt from CSRF protection
const CSRF_EXEMPT_URLS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh-token',
  '/api/auth/logout',
  '/api/auth/dev-login'
];

/**
 * CSRF protection middleware
 * Verifies CSRF token for non-GET requests to protected endpoints
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF check for non-protected methods or exempt URLs
  if (
    !CSRF_PROTECTED_METHODS.includes(req.method) ||
    CSRF_EXEMPT_URLS.some(url => req.path.startsWith(url))
  ) {
    return next();
  }

  // Skip in development mode if configured to do so
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_CSRF === 'true') {
    logger.warn('[DEV] Skipping CSRF protection');
    return next();
  }

  // Ensure user is authenticated
  if (!req.user || !req.user.sessionId) {
    return next(new ApiError({
      statusCode: 403,
      message: 'Authentication required for this action',
      code: ErrorCode.AUTHENTICATION_REQUIRED
    }));
  }

  // Get CSRF token from header
  const csrfToken = req.headers['x-csrf-token'] as string;
  
  if (!csrfToken) {
    return next(new ApiError({
      statusCode: 403,
      message: 'CSRF token is required',
      code: ErrorCode.INVALID_CSRF_TOKEN
    }));
  }

  // Verify CSRF token
  try {
    const isValid = tokenService.verifyCsrfToken(csrfToken, req.user.sessionId);
    
    if (!isValid) {
      return next(new ApiError({
        statusCode: 403,
        message: 'Invalid CSRF token',
        code: ErrorCode.INVALID_CSRF_TOKEN
      }));
    }
    
    next();
  } catch (error) {
    logger.error('CSRF verification error:', error);
    next(new ApiError({
      statusCode: 403,
      message: 'CSRF verification failed',
      code: ErrorCode.INVALID_CSRF_TOKEN
    }));
  }
};

/**
 * Middleware to attach CSRF token to response for client use
 * This should be called after authentication middleware
 */
export const attachCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Only attach if user is authenticated
  if (req.user && req.user.sessionId) {
    const csrfToken = tokenService.generateCsrfToken(req.user.sessionId);
    // Set CSRF token in response header
    res.set('X-CSRF-Token', csrfToken);
  }
  
  next();
};
