// server/src/middleware/internalAuth.ts
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/types/AuthenticatedRequest';
import { logger } from '@/utils/logger';
import jwt from 'jsonwebtoken';

/**
 * Middleware for internal user authentication using JWT.
 * Verifies the JWT from the Authorization header and populates
 * req.user if authentication succeeds.
 */
export const internalAuth = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  logger.debug('Entering internalAuth middleware');

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authorization header missing or not Bearer type');
    return res.status(401).json({ message: 'Authorization header missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set! Authentication cannot proceed.');
      return res.status(500).json({ message: 'Internal server error: Authentication configuration missing.' });
    }

    // Verify the token
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload; // Assert structure if known

    // Check if payload contains expected user info
    // Adjust property names (userId, userEmail etc.) based on how your JWT is structured
    if (!decoded || typeof decoded !== 'object' || !decoded.userId || !decoded.userEmail) {
        logger.error('Invalid JWT payload structure', decoded);
        return res.status(401).json({ message: 'Invalid token payload.' });
    }

    // Populate request object
    req.user = { 
      userId: decoded.userId, 
      email: decoded.userEmail, 
      role: decoded.role || 'user', // Assuming role is in token, provide default
      sessionId: decoded.sessionId || '' // Assuming sessionId is in token
    };

    if (req.user) {
      logger.info(`Authenticated internal user ${req.user.userId}`); 
    } else {
      logger.warn('User object not found on request after token verification');
    }

    next(); // Proceed to the next middleware/route handler

  } catch (error: any) {
    logger.error('JWT verification failed:', error.message);
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired.' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token.' });
    } else {
      return res.status(500).json({ message: 'Internal server error during authentication.' });
    }
  }
};
