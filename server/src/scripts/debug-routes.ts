import express from 'express';
import { logger } from './logger';
import assetRoutes from '../routes/assets.routes';

/**
 * Debug script to list all registered routes in the asset router
 */
function listRoutes($1: unknown) {
  const routes: Record<string, unknown>[] = [];
  
  // This extracts the stack of route handlers from the Express router
  if (router && router.stack) {
    router.stack.forEach(($1: unknown) => {
      if (layer.route) {
        const path = layer.route.path;
        const methods = Object.keys(layer.route.methods).map(method => method.toUpperCase());
        routes.push({ path, methods });
      } else if (layer.name === 'router' && layer.handle.stack) {
        // Recursively extract routes from sub-routers
        const subRoutes = listRoutes(layer.handle);
        routes.push(...subRoutes.map(route => ({
          path: layer.regexp.source + route.path,
          methods: route.methods
        })));
      }
    });
  }
  
  return routes;
}

// Main function to debug routes
async function main() {
  try {
    logger.info('Debugging Asset Routes...');
    
    // Create a dummy Express app
    const app = express();
    
    // Mount the asset routes
    app.use('/api/assets', assetRoutes);
    
    // List the registered routes
    logger.info('\nRegistered Asset Routes:');
    
    // Get the routes from the Express app
    const routes = listRoutes(app._router);
    
    routes.forEach(route => {
      logger.info(`${route.methods.join(', ')} ${route.path}`);
    });
    
    // Specifically check for the by-client route
    const byClientRoute = routes.find(route => route.path.includes('by-client'));
    if (byClientRoute) {
      logger.info('\n✅ Found by-client route:', byClientRoute);
    } else {
      logger.info('\n❌ No by-client route found!');
    }
    
  } catch (error) {
    logger.error('Error debugging routes:', error);
  }
}

main().catch(console.error);
