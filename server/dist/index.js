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
const supabaseClient_1 = require("./db/supabaseClient");
const WebSocketService_1 = require("./services/WebSocketService");
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
const responseHandler_1 = require("./middleware/responseHandler");
// Import route registry
const RouteRegistry_1 = require("./routes/RouteRegistry");
// Import logger
const logger_1 = require("./utils/logger");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
// import assetRoutes from './routes/assetRoutes'; // Removed unused legacy import
const templateRoutes_1 = __importDefault(require("./routes/templateRoutes"));
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
// Initialize environment variables
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
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
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
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
            '/api/assets',
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
// Register routes - Legacy approach (to be migrated to route registry)
app.use('/api/auth', auth_routes_1.default);
app.use('/api/templates', templateRoutes_1.default);
// app.use('/api/campaigns', campaignRoutes); // Migrated to route registry pattern
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
// v2 API Routes - new slug-based design
// app.use('/api/v2', v2Routes); // Removed direct mount - using registry for consistency
// Import router classes
const assets_routes_1 = require("./routes/assets.routes");
const clients_routes_1 = require("./routes/clients.routes");
const campaigns_routes_1 = require("./routes/campaigns.routes");
// import { V2AssetRouter } from './routes/v2/assets.routes'; // Removed redundant V2 router
const clients_routes_2 = require("./routes/v2/clients.routes");
// Register route handlers with the registry
RouteRegistry_1.RouteRegistry.register(new assets_routes_1.AssetRouter());
RouteRegistry_1.RouteRegistry.register(new clients_routes_1.ClientRouter());
RouteRegistry_1.RouteRegistry.register(new campaigns_routes_1.CampaignRouter());
// RouteRegistry.register(new V2AssetRouter()); // Removed redundant V2 registration
RouteRegistry_1.RouteRegistry.register(new clients_routes_2.V2ClientRouter());
// Initialize all registered routes
RouteRegistry_1.RouteRegistry.initializeRoutes(app);
// Apply error handling middleware (must be after all routes)
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// Start the server - make sure we listen on all interfaces
server.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT}`);
    logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.logger.info(`Root URL: http://localhost:${PORT}/`);
    logger_1.logger.info(`Health check: http://localhost:${PORT}/health`);
    logger_1.logger.info(`WebSocket Initialized (listening for connections)`);
    // Log route information
    const routeInfo = [
        { name: 'Auth', path: '/api/auth' },
        { name: 'Assets', path: '/api/assets' },
        { name: 'Templates', path: '/api/templates' },
        { name: 'Campaigns', path: '/api/campaigns' },
        { name: 'Creatomate', path: '/api/creatomate' },
        { name: 'Runway', path: '/api/runway' },
        { name: 'Exports', path: '/api/exports' },
        { name: 'LLM', path: '/api/llm' },
        { name: 'Sign-off', path: '/api/signoff' },
        { name: 'Matrix', path: '/api/matrix' },
        { name: 'Clients', path: '/api/clients' },
        { name: 'MCP', path: '/api/mcp' },
        { name: 'V2 API', path: '/api/v2' }
    ];
    logger_1.logger.info('Available API endpoints:');
    routeInfo.forEach(route => {
        logger_1.logger.info(`- ${route.name}: http://localhost:${PORT}${route.path}`);
    });
    logger_1.logger.info('Server initialization complete');
});
