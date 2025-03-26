import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { initializeDatabase } from './db/supabaseClient';
import WebSocketService from './services/websocket';

// Routes
import authRoutes from './routes/auth.routes';
import assetRoutes from './routes/assetRoutes';
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

// v2 API routes
import v2Routes from './routes/v2';

// Initialize environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Import runwayService after WebSocketService initialization
import { runwayService } from './services/runwayService';

// Register runwayService with the WebSocketService instance
runwayService.setWebSocketService(wsService);

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

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
    connections: wsService.getConnectionCount(),
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
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
app.use('/api/clients', clientRoutes);
app.use('/api/mcp', mcpRoutes);

// v2 API Routes - new slug-based design
app.use('/api/v2', v2Routes);

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
  console.log(`Runway endpoint: http://localhost:${PORT}/api/runway`);
  console.log(`Exports endpoint: http://localhost:${PORT}/api/exports`);
  console.log(`LLM endpoint: http://localhost:${PORT}/api/llm`);
  console.log(`Sign-off endpoint: http://localhost:${PORT}/api/signoff`);
  console.log(`Matrix endpoint: http://localhost:${PORT}/api/matrix`);
  console.log(`Clients endpoint: http://localhost:${PORT}/api/clients`);
  console.log(`MCP endpoint: http://localhost:${PORT}/api/mcp`);
});