/**
 * Route Registry
 * 
 * Centralized registry of all API routes
 * Allows for dynamic loading of routes and consistent configuration
 */
import { Application } from 'express';
import { BaseRouter } from './BaseRouter';
import { logger } from '../utils/logger';

/**
 * Registry for all API routes
 */
export class RouteRegistry {
  // Base API path
  private static apiPrefix = '/api';
  
  // Array of all registered routers
  private static routers: BaseRouter[] = [];
  
  /**
   * Register a router with the registry
   * 
   * @param router - Router instance to register
   */
  public static register(router: BaseRouter): void {
    this.routers.push(router);
  }
  
  /**
   * Initialize all registered routes with the Express application
   * 
   * @param app - Express application instance
   */
  public static initializeRoutes(app: Application): void {
    logger.info(`Initializing ${this.routers.length} route handlers...`);
    
    this.routers.forEach((routeHandler, index) => {
      // Get path and router from the handler
      const routePath = routeHandler['path'];
      const router = routeHandler.getRouter();
      
      // Full path including API prefix
      const fullPath = `${this.apiPrefix}${routePath}`;
      
      // Register router with the app
      app.use(fullPath, router);
      
      logger.info(`[${index + 1}/${this.routers.length}] Registered route: ${fullPath}`);
    });
    
    logger.info('All routes initialized successfully');
  }
}
