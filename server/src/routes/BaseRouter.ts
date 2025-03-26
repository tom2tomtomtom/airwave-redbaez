/**
 * Base Router Class
 * 
 * Abstract base class that all route handlers should extend
 * Provides standardized methods and patterns for route implementation
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { normalizeAllParams } from '../middleware/paramNormalization';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export abstract class BaseRouter {
  // The Express router instance
  public router: Router;
  
  // Path prefix for this router (e.g., '/assets')
  protected path: string;
  
  // Whether routes require authentication by default
  protected requireAuth: boolean;
  
  /**
   * Create a new router instance
   * 
   * @param path - Path prefix for this router
   * @param requireAuth - Whether routes require authentication by default (defaults to true)
   */
  constructor(path: string, requireAuth = true) {
    this.router = Router();
    this.path = path;
    this.requireAuth = requireAuth;
    
    // Apply default middleware to all routes
    this.router.use(normalizeAllParams);
    
    // Initialize routes
    this.initializeRoutes();
  }
  
  /**
   * Initialize the routes for this router
   * Must be implemented by subclasses
   */
  protected abstract initializeRoutes(): void;
  
  /**
   * Wrap route handlers with try/catch for consistent error handling
   * 
   * @param handler - Route handler function
   * @returns Wrapped route handler with error handling
   */
  protected asyncHandler(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await handler(req, res, next);
      } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, 'Internal server error'));
      }
    };
  }
  
  /**
   * Create a protected route that requires authentication
   * 
   * @param handler - Route handler function
   * @returns Route handler with authentication and error handling
   */
  protected protectedRoute(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return [
      authenticateToken,
      this.asyncHandler(handler)
    ];
  }
  
  /**
   * Helper method to validate that client ID is present
   * Essential for asset operations which all require a client context
   * 
   * @param req - Express request object
   * @throws ApiError if client ID is missing
   */
  protected validateClientId(req: Request): string {
    // The client ID may come from various sources, normalized by middleware
    const clientId = 
      (req as any).normalizedClientId || 
      req.query.clientId?.toString() || 
      req.body?.clientId;
      
    if (!clientId) {
      logger.warn('Missing client ID in request', { 
        path: req.path, 
        method: req.method,
        query: req.query,
        bodyKeys: req.body ? Object.keys(req.body) : 'no body' 
      });
      throw new ApiError(400, 'Client ID is required for this operation');
    }
    
    return clientId as string;
  }
  
  /**
   * Get the routes for this router
   * 
   * @returns Router instance
   */
  public getRouter(): Router {
    return this.router;
  }
}
