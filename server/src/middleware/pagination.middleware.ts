import express from 'express';
import { checkAuth } from '../middleware/auth.middleware';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';
import { logger } from '../utils/logger';

// Pagination middleware for API endpoints
export const paginationMiddleware = (
  defaultLimit: number = 20,
  maxLimit: number = 100
) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // Get pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      let limit = parseInt(req.query.limit as string) || defaultLimit;
      
      // Validate and enforce limits
      if (page < 1) {
        return next(new ApiError(
          ErrorCode.VALIDATION_FAILED,
          'Page number must be greater than or equal to 1'
        ));
      }
      
      // Enforce maximum limit to prevent performance issues
      if (limit > maxLimit) {
        logger.warn(`Requested limit ${limit} exceeds maximum ${maxLimit}, using maximum`);
        limit = maxLimit;
      }
      
      // Calculate offset
      const offset = (page - 1) * limit;
      
      // Attach pagination info to request object for use in route handlers
      req.pagination = {
        page,
        limit,
        offset
      };
      
      next();
    } catch (error) {
      logger.error('Error in pagination middleware:', error);
      next(new ApiError(
        ErrorCode.VALIDATION_FAILED,
        'Invalid pagination parameters'
      ));
    }
  };
};

// Helper function to format paginated response
export const formatPaginatedResponse = (
  data: any[],
  totalCount: number,
  page: number,
  limit: number
) => {
  const totalPages = Math.ceil(totalCount / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      totalItems: totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// Extend Express Request interface to include pagination
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
        offset: number;
      };
    }
  }
}
