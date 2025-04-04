import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './db/supabaseClient';
import { webSocketService } from './services/WebSocketService';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { responseHandler, requestLogger } from './middleware/responseHandler';
import { ApiError } from './utils/ApiError';
import { ErrorCode } from './types/errorTypes';

// Import route registry
import { RouteRegistry } from './routes/RouteRegistry';

// Import logger
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth.routes';
import templateRoutes from './routes/templateRoutes';
import campaignRoutes from './routes/campaignRoutes';
import creatomateRoutes from './routes/creatomate.routes';
import runwayRoutes from './routes/runway.routes';
import exportsRoutes from './routes/exports.routes';
import webhooksRoutes from './routes/webhooks.routes';
import llmRoutes from './routes/llm.routes';
import signoffRoutes from './routes/signoff.routes';
import signoffSessionsRoutes from './routes/signoff-sessions.routes';
import matrixRoutes from './routes/matrix.routes';
import briefRoutes from './routes/briefRoutes';
import clientRoutes from './routes/clientRoutes';
import mcpRoutes from './routes/mcp.routes';
import revisionRoutes from './routes/revisionRoutes';
import notificationRoutes from './routes/notificationRoutes';
import timeBasedCommentRoutes from './routes/timeBasedCommentRoutes';

// Import new image-to-video router
import { imageToVideoRouter } from './routes/ImageToVideoRouter';

// Generation service routes
import generationRoutes from './routes/generationRoutes';
import subtitleRoutes from './routes/subtitleRoutes';

// v2 API routes
import v2Routes from './routes/v2';

// Initialize environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;
const ALTERNATE_PORT = 3005; // Use an alternate port if the default is in use

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service using the singleton instance
webSocketService.initialize(server);

// Import runwayService after WebSocketService initialization
import { runwayService } from './services/runwayService';

// Register runwayService with the WebSocketService instance
runwayService.setWebSocketService(webSocketService); // Use the singleton instance

// Initialize database
initializeDatabase().catch(error => {
  console.error('Database initialization failed:', error);
});

// CORS Configuration
let corsOptions;

// In development, allow requests from any origin
if (process.env.NODE_ENV !== 'production') {
  console.log('Development mode: allowing CORS from any origin');
  corsOptions = {
    origin: true, // Allow any origin in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };
} else {
  // In production, use specific origins
  const corsOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : ['http://localhost:3002'];
  
  // Add production domains if not already included
  if (!corsOrigins.includes('https://airwave.redbaez.com')) {
    corsOrigins.push('https://airwave.redbaez.com');
  }
  
  console.log('Production mode - CORS origins:', corsOrigins);
  
  corsOptions = {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };
}

// Define rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// More strict rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts, please try again after an hour'
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply security middleware
app.use(helmet());

// Apply our custom middleware
app.use(responseHandler);
app.use(requestLogger);

// Static files (uploads)
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Health check routes
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    prototype_mode: process.env.PROTOTYPE_MODE === 'true'
  });
});

// WebSocket status check
app.get('/websocket-status', (req, res) => {
  res.status(200).json({
    running: true,
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'AIrWAVE API Server',
    version: '1.0.0',
    endpoints: [
      '/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/templates',
      '/api/campaigns',
      '/api/creatomate',
      '/api/runway',
      '/api/exports',
      '/api/briefs',
      '/api/v2/clients',
      '/api/v2/assets/by-client/:slug'
    ]
  });
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Register routes with specific rate limits for auth routes
app.use('/api/auth', authLimiter, authRoutes);

// Register other routes
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/creatomate', creatomateRoutes);
app.use('/api/runway', runwayRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/signoff', signoffRoutes);
app.use('/api/signoff-sessions', signoffSessionsRoutes);
app.use('/api/matrix', matrixRoutes);
app.use('/api/briefs', briefRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/image-to-video', imageToVideoRouter.getRouter());
app.use('/api/generation', generationRoutes);
app.use('/api/subtitles', subtitleRoutes);
app.use('/api/revisions', revisionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', timeBasedCommentRoutes);
app.use('/api/v2', v2Routes);

// Apply error handling middleware (must be after all routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Start the server - make sure we listen on all interfaces
// Try the default port first, if it fails, try the alternate port
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Root URL: http://localhost:${PORT}/`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`WebSocket Initialized (listening for connections)`);
  
  // Log route information
  const routeInfo = [
    { name: 'Auth', path: '/api/auth' },
    { name: 'Templates', path: '/api/templates' },
    { name: 'Campaigns', path: '/api/campaigns' },
    { name: 'Creatomate', path: '/api/creatomate' },
    { name: 'Runway', path: '/api/runway' },
    { name: 'Exports', path: '/api/exports' },
    { name: 'LLM', path: '/api/llm' },
    { name: 'Sign-off', path: '/api/signoff' },
    { name: 'Matrix', path: '/api/matrix' },
    { name: 'Briefs', path: '/api/briefs' },
    { name: 'MCP', path: '/api/mcp' },
    { name: 'Generation', path: '/api/generation' },
    { name: 'Subtitles', path: '/api/subtitles' },
    { name: 'Revisions', path: '/api/revisions' },
    { name: 'Notifications', path: '/api/notifications' },
    { name: 'TimeBasedComments', path: '/api/reviews/:reviewId/comments/timebased' },
    { name: 'V2 API', path: '/api/v2' }
  ];
  
  logger.info('Available API endpoints:');
  routeInfo.forEach(route => {
    logger.info(`- ${route.name}: http://localhost:${PORT}${route.path}`);
  });
  
  logger.info('Server initialization complete');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${PORT} is already in use, trying alternate port ${ALTERNATE_PORT}`);
    
    // Try the alternate port
    server.listen(ALTERNATE_PORT, () => {
      logger.info(`Server running on alternate port ${ALTERNATE_PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Root URL: http://localhost:${ALTERNATE_PORT}/`);
      logger.info(`Health check: http://localhost:${ALTERNATE_PORT}/health`);
      logger.info(`WebSocket Initialized (listening for connections)`);
      
      // Log route information for alternate port
      const routeInfo = [
        { name: 'Auth', path: '/api/auth' },
        { name: 'Templates', path: '/api/templates' },
        { name: 'Campaigns', path: '/api/campaigns' },
        { name: 'Creatomate', path: '/api/creatomate' },
        { name: 'Runway', path: '/api/runway' },
        { name: 'Exports', path: '/api/exports' },
        { name: 'LLM', path: '/api/llm' },
        { name: 'Sign-off', path: '/api/signoff' },
        { name: 'Matrix', path: '/api/matrix' },
        { name: 'Briefs', path: '/api/briefs' },
        { name: 'MCP', path: '/api/mcp' },
        { name: 'Generation', path: '/api/generation' },
        { name: 'Subtitles', path: '/api/subtitles' },
        { name: 'Revisions', path: '/api/revisions' },
        { name: 'Notifications', path: '/api/notifications' },
        { name: 'TimeBasedComments', path: '/api/reviews/:reviewId/comments/timebased' },
        { name: 'V2 API', path: '/api/v2' }
      ];
      
      logger.info('Available API endpoints:');
      routeInfo.forEach(route => {
        logger.info(`- ${route.name}: http://localhost:${ALTERNATE_PORT}${route.path}`);
      });
      
      logger.info('Server initialization complete');
    });
  } else {
    logger.error('Error starting server:', err);
  }
});
