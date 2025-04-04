"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const supabaseClient_1 = require("./db/supabaseClient");
const WebSocketService_1 = require("./services/WebSocketService");
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
const responseHandler_1 = require("./middleware/responseHandler");
// Import logger
const logger_1 = require("./utils/logger");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const templateRoutes_1 = __importDefault(require("./routes/templateRoutes"));
const campaignRoutes_1 = __importDefault(require("./routes/campaignRoutes"));
const creatomate_routes_1 = __importDefault(require("./routes/creatomate.routes"));
const runway_routes_1 = __importDefault(require("./routes/runway.routes"));
const exports_routes_1 = __importDefault(require("./routes/exports.routes"));
const webhooks_routes_1 = __importDefault(require("./routes/webhooks.routes"));
const llm_routes_1 = __importDefault(require("./routes/llm.routes"));
const signoff_routes_1 = __importDefault(require("./routes/signoff.routes"));
const signoff_sessions_routes_1 = __importDefault(require("./routes/signoff-sessions.routes"));
const matrix_routes_1 = __importDefault(require("./routes/matrix.routes"));
const briefRoutes_1 = __importDefault(require("./routes/briefRoutes"));
const mcp_routes_1 = __importDefault(require("./routes/mcp.routes"));
const revisionRoutes_1 = __importDefault(require("./routes/revisionRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const timeBasedCommentRoutes_1 = __importDefault(require("./routes/timeBasedCommentRoutes"));
// Import new image-to-video router
const ImageToVideoRouter_1 = require("./routes/ImageToVideoRouter");
// Generation service routes
const generationRoutes_1 = __importDefault(require("./routes/generationRoutes"));
const subtitleRoutes_1 = __importDefault(require("./routes/subtitleRoutes"));
// v2 API routes
const v2_1 = __importDefault(require("./routes/v2"));
// Initialize environment variables
dotenv_1.default.config();
// Import environment validation
const appConfig_1 = require("./utils/appConfig");
// Validate required environment variables
(0, appConfig_1.validateAppEnvironment)();
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
const ALTERNATE_PORT = 3005; // Use an alternate port if the default is in use
// Create HTTP server
const server = http_1.default.createServer(app);
// Initialize WebSocket service using the singleton instance
WebSocketService_1.webSocketService.initialize(server);
// Import runwayService after WebSocketService initialization
const runwayService_1 = require("./services/runwayService");
// Register runwayService with the WebSocketService instance
runwayService_1.runwayService.setWebSocketService(WebSocketService_1.webSocketService); // Use the singleton instance
// Initialize database
(0, supabaseClient_1.initializeDatabase)().catch(error => {
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
}
else {
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
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
// More strict rate limiting for authentication routes
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many authentication attempts, please try again after an hour'
});
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Apply security middleware
app.use((0, helmet_1.default)());
// Apply our custom middleware
app.use(responseHandler_1.responseHandler);
app.use(responseHandler_1.requestLogger);
// Static files (uploads)
const uploadsDir = path_1.default.join(__dirname, '../uploads');
app.use('/uploads', express_1.default.static(uploadsDir));
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
app.use('/api/auth', authLimiter, auth_routes_1.default);
// Register other routes
app.use('/api/templates', templateRoutes_1.default);
app.use('/api/campaigns', campaignRoutes_1.default);
app.use('/api/creatomate', creatomate_routes_1.default);
app.use('/api/runway', runway_routes_1.default);
app.use('/api/exports', exports_routes_1.default);
app.use('/api/webhooks', webhooks_routes_1.default);
app.use('/api/llm', llm_routes_1.default);
app.use('/api/signoff', signoff_routes_1.default);
app.use('/api/signoff-sessions', signoff_sessions_routes_1.default);
app.use('/api/matrix', matrix_routes_1.default);
app.use('/api/briefs', briefRoutes_1.default);
app.use('/api/mcp', mcp_routes_1.default);
app.use('/api/image-to-video', ImageToVideoRouter_1.imageToVideoRouter.getRouter());
app.use('/api/generation', generationRoutes_1.default);
app.use('/api/subtitles', subtitleRoutes_1.default);
app.use('/api/revisions', revisionRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api', timeBasedCommentRoutes_1.default);
app.use('/api/v2', v2_1.default);
// Apply error handling middleware (must be after all routes)
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// Start the server - make sure we listen on all interfaces
// Try the default port first, if it fails, try the alternate port
server.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT}`);
    logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.logger.info(`Root URL: http://localhost:${PORT}/`);
    logger_1.logger.info(`Health check: http://localhost:${PORT}/health`);
    logger_1.logger.info(`WebSocket Initialized (listening for connections)`);
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
    logger_1.logger.info('Available API endpoints:');
    routeInfo.forEach(route => {
        logger_1.logger.info(`- ${route.name}: http://localhost:${PORT}${route.path}`);
    });
    logger_1.logger.info('Server initialization complete');
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        logger_1.logger.warn(`Port ${PORT} is already in use, trying alternate port ${ALTERNATE_PORT}`);
        // Try the alternate port
        server.listen(ALTERNATE_PORT, () => {
            logger_1.logger.info(`Server running on alternate port ${ALTERNATE_PORT}`);
            logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger_1.logger.info(`Root URL: http://localhost:${ALTERNATE_PORT}/`);
            logger_1.logger.info(`Health check: http://localhost:${ALTERNATE_PORT}/health`);
            logger_1.logger.info(`WebSocket Initialized (listening for connections)`);
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
            logger_1.logger.info('Available API endpoints:');
            routeInfo.forEach(route => {
                logger_1.logger.info(`- ${route.name}: http://localhost:${ALTERNATE_PORT}${route.path}`);
            });
            logger_1.logger.info('Server initialization complete');
        });
    }
    else {
        logger_1.logger.error('Error starting server:', err);
    }
});
