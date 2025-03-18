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
const websocket_1 = __importDefault(require("./services/websocket"));
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const assetRoutes_1 = __importDefault(require("./routes/assetRoutes"));
const templateRoutes_1 = __importDefault(require("./routes/templateRoutes"));
const campaignRoutes_1 = __importDefault(require("./routes/campaignRoutes"));
const creatomate_routes_1 = __importDefault(require("./routes/creatomate.routes"));
const exports_routes_1 = __importDefault(require("./routes/exports.routes"));
const webhooks_routes_1 = __importDefault(require("./routes/webhooks.routes"));
const llm_routes_1 = __importDefault(require("./routes/llm.routes"));
const signoff_routes_1 = __importDefault(require("./routes/signoff.routes"));
const signoff_sessions_routes_1 = __importDefault(require("./routes/signoff-sessions.routes"));
const matrix_routes_1 = __importDefault(require("./routes/matrix.routes"));
// Initialize environment variables
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Create HTTP server
const server = http_1.default.createServer(app);
// Initialize WebSocket service
const wsService = new websocket_1.default(server);
// Initialize database
(0, supabaseClient_1.initializeDatabase)().catch(error => {
    console.error('Database initialization failed:', error);
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Static files (uploads)
const uploadsDir = path_1.default.join(__dirname, '../uploads');
app.use('/uploads', express_1.default.static(uploadsDir));
// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
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
            '/api/exports'
        ]
    });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/assets', assetRoutes_1.default);
app.use('/api/templates', templateRoutes_1.default);
app.use('/api/campaigns', campaignRoutes_1.default);
app.use('/api/creatomate', creatomate_routes_1.default);
app.use('/api/exports', exports_routes_1.default);
app.use('/api/webhooks', webhooks_routes_1.default);
app.use('/api/llm', llm_routes_1.default);
app.use('/api/signoff', signoff_routes_1.default);
app.use('/api/signoff-sessions', signoff_sessions_routes_1.default);
app.use('/api/matrix', matrix_routes_1.default);
// Start the server - make sure we listen on all interfaces
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Root URL: http://localhost:${PORT}/`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
    console.log(`Auth endpoints: http://localhost:${PORT}/api/auth/login & /register`);
    console.log(`Assets endpoint: http://localhost:${PORT}/api/assets`);
    console.log(`Templates endpoint: http://localhost:${PORT}/api/templates`);
    console.log(`Campaigns endpoint: http://localhost:${PORT}/api/campaigns`);
    console.log(`Creatomate endpoint: http://localhost:${PORT}/api/creatomate`);
    console.log(`Exports endpoint: http://localhost:${PORT}/api/exports`);
    console.log(`LLM endpoint: http://localhost:${PORT}/api/llm`);
    console.log(`Sign-off endpoint: http://localhost:${PORT}/api/signoff`);
    console.log(`Matrix endpoint: http://localhost:${PORT}/api/matrix`);
});
