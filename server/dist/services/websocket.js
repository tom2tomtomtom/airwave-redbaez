"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocketModule = __importStar(require("ws"));
const WebSocket = WebSocketModule.default || WebSocketModule;
const { Server: WebSocketServer } = WebSocketModule;
const creatomateService_1 = require("./creatomateService");
const url = __importStar(require("url"));
const logger_1 = require("../utils/logger");
// Define connection states for tracking and metrics
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["CONNECTING"] = "connecting";
    ConnectionState["AUTHENTICATED"] = "authenticated";
    ConnectionState["ACTIVE"] = "active";
    ConnectionState["CLOSING"] = "closing";
    ConnectionState["ERROR"] = "error";
})(ConnectionState || (ConnectionState = {}));
class WebSocketService {
    // Method to get the current connection count
    getConnectionCount() {
        return this.clients.size;
    }
    // Method to get detailed connection metrics
    getConnectionMetrics() {
        const metrics = {
            total: this.clients.size,
            connecting: 0,
            authenticated: 0,
            active: 0,
            closing: 0,
            error: 0,
            withUserId: 0
        };
        this.clients.forEach(client => {
            metrics[client.state]++;
            if (client.userId)
                metrics.withUserId++;
        });
        return metrics;
    }
    constructor(server) {
        this.clients = new Map();
        this.heartbeatInterval = null;
        this.cleanupInterval = null;
        // Configurable settings
        this.heartbeatIntervalMs = 30000; // 30 seconds
        this.clientTimeoutMs = 120000; // 2 minutes without activity
        this.cleanupIntervalMs = 60000; // 1 minute
        this.wss = new WebSocketServer({
            server,
            path: '/ws',
            // Increase the max payload size to handle larger messages (e.g., for asset previews)
            maxPayload: 5 * 1024 * 1024 // 5MB
        });
        this.initialize();
        logger_1.logger.info('WebSocket server initialized at ws://localhost:[PORT]/ws');
        // Start periodic heartbeat to detect dead connections
        this.startHeartbeat();
        // Start periodic cleanup to prevent memory leaks
        this.startCleanupInterval();
        // Register with Creatomate service for render status updates
        // The creatomateService now uses the singleton WebSocketService instance directly
        // Keep this call for backwards compatibility but don't pass any parameters
        creatomateService_1.creatomateService.setWebSocketService();
        // Handle server shutdown gracefully
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }
    initialize() {
        this.wss.on('connection', (ws, req) => {
            try {
                // Extract client information from request
                const clientId = this.generateClientId();
                const ip = req.socket.remoteAddress || 'unknown';
                const userAgent = req.headers['user-agent'] || 'unknown';
                // Extract CSRF token from URL if present
                let csrfToken;
                if (req.url) {
                    const parsedUrl = url.parse(req.url, true);
                    csrfToken = parsedUrl.query.csrf_token;
                }
                // Initialize client metadata
                const metadata = {
                    id: clientId,
                    ip,
                    userAgent,
                    connectedAt: new Date(),
                    lastActiveAt: new Date(),
                    state: ConnectionState.CONNECTING,
                    subscribedChannels: new Set(),
                    authenticated: false,
                    csrfToken
                };
                this.clients.set(ws, metadata);
                logger_1.logger.info('WebSocket client connected', {
                    clientId,
                    ip,
                    totalClients: this.clients.size,
                    hasCSRF: !!csrfToken
                });
                // Send welcome message
                this.sendToClient(ws, 'connection', {
                    message: 'Connected to AIrWAVE WebSocket server',
                    clientId,
                    requiresAuth: !csrfToken // Indicate if authentication is required
                });
                // Set up a timeout to close connections that don't authenticate
                const authTimeout = setTimeout(() => {
                    const client = this.clients.get(ws);
                    if (client && !client.authenticated) {
                        logger_1.logger.warn('WebSocket client failed to authenticate in time', { clientId });
                        client.state = ConnectionState.ERROR;
                        client.error = 'Authentication timeout';
                        ws.close(4001, 'Authentication timeout');
                    }
                }, 30000); // 30 second timeout for authentication
                // Handle incoming messages
                ws.on('message', (message) => {
                    try {
                        // Update last active timestamp
                        const client = this.clients.get(ws);
                        if (client) {
                            client.lastActiveAt = new Date();
                        }
                        const data = JSON.parse(message);
                        this.handleMessage(ws, data);
                    }
                    catch (error) {
                        logger_1.logger.error('Error parsing WebSocket message', {
                            error: error instanceof Error ? error.message : String(error),
                            clientId
                        });
                        this.sendToClient(ws, 'error', {
                            message: 'Invalid message format',
                            details: error instanceof Error ? error.message : 'Unknown parsing error'
                        });
                    }
                });
                // Handle errors
                ws.on('error', (error) => {
                    const client = this.clients.get(ws);
                    logger_1.logger.error('WebSocket client error', {
                        error: error.message,
                        clientId: client?.id,
                        stack: error.stack
                    });
                    if (client) {
                        client.state = ConnectionState.ERROR;
                        client.error = error.message;
                    }
                });
                // Handle disconnection
                ws.on('close', (code, reason) => {
                    const client = this.clients.get(ws);
                    if (client) {
                        logger_1.logger.info('WebSocket client disconnected', {
                            clientId: client.id,
                            code,
                            reason: reason.toString(),
                            remainingClients: this.clients.size - 1,
                            duration: Date.now() - client.connectedAt.getTime()
                        });
                    }
                    clearTimeout(authTimeout);
                    this.clients.delete(ws);
                });
            }
            catch (error) {
                logger_1.logger.error('Error handling WebSocket connection', {
                    error: error instanceof Error ? error.message : String(error)
                });
                ws.close(1011, 'Internal server error');
            }
        });
    }
    handleMessage(ws, data) {
        const { type, payload } = data;
        const client = this.clients.get(ws);
        if (!client) {
            logger_1.logger.warn('Message received from unregistered client');
            return;
        }
        switch (type) {
            case 'authenticate':
                // Handle authentication with CSRF token
                if (payload.csrfToken) {
                    // Normally you would validate this against the stored session
                    // For now, just accept the token that matches what was provided in the URL
                    if (client.csrfToken && payload.csrfToken === client.csrfToken) {
                        client.authenticated = true;
                        client.state = ConnectionState.AUTHENTICATED;
                        logger_1.logger.info('Client authenticated with CSRF token', { clientId: client.id });
                        this.sendToClient(ws, 'authenticated', { success: true });
                    }
                    else {
                        client.error = 'Invalid CSRF token';
                        client.state = ConnectionState.ERROR;
                        logger_1.logger.warn('Invalid CSRF token provided', { clientId: client.id });
                        this.sendToClient(ws, 'error', { message: 'Authentication failed: Invalid CSRF token' });
                        ws.close(4001, 'Invalid CSRF token');
                    }
                }
                else {
                    logger_1.logger.warn('Authentication attempted without CSRF token', { clientId: client.id });
                    this.sendToClient(ws, 'error', { message: 'Authentication failed: CSRF token required' });
                }
                break;
            case 'identify':
                // Allow clients to identify themselves with user info
                if (payload.userId) {
                    client.userId = payload.userId;
                    logger_1.logger.info('Client identified with user ID', {
                        clientId: client.id,
                        userId: payload.userId
                    });
                    this.sendToClient(ws, 'identified', { userId: payload.userId });
                }
                break;
            case 'join':
            case 'subscribe':
                // Allow clients to subscribe to specific channels/topics
                if (payload.channel) {
                    client.subscribedChannels.add(payload.channel);
                    if (payload.clientId) {
                        client.clientId = payload.clientId;
                    }
                    client.state = ConnectionState.ACTIVE;
                    logger_1.logger.info('Client subscribed to channel', {
                        clientId: client.id,
                        channel: payload.channel,
                        projectClientId: payload.clientId
                    });
                    this.sendToClient(ws, 'subscribed', {
                        channel: payload.channel,
                        clientId: payload.clientId
                    });
                }
                break;
            case 'unsubscribe':
                // Allow clients to unsubscribe from specific channels
                if (payload.channel && client.subscribedChannels.has(payload.channel)) {
                    client.subscribedChannels.delete(payload.channel);
                    logger_1.logger.info('Client unsubscribed from channel', {
                        clientId: client.id,
                        channel: payload.channel
                    });
                    this.sendToClient(ws, 'unsubscribed', { channel: payload.channel });
                }
                break;
            case 'ping':
                // Simple ping-pong for connection testing & keepalive
                this.sendToClient(ws, 'pong', {
                    timestamp: new Date().toISOString(),
                    serverTime: Date.now(),
                    clientTime: payload.timestamp || 0
                });
                break;
            case 'message':
                // Handle client-to-client or client-to-server messages
                if (!this.validateClientState(client, ws))
                    return;
                if (payload.target) {
                    logger_1.logger.debug('Client sent message to channel', {
                        clientId: client.id,
                        channel: payload.target
                    });
                    // Broadcast to the specified channel
                    this.broadcastToChannel(payload.target, 'message', payload, ws);
                }
                break;
            default:
                logger_1.logger.debug('Received unknown message type', { type, clientId: client.id });
        }
    }
    /**
     * Validate that a client is in a valid state for message processing
     * @param client The client metadata
     * @param ws The WebSocket connection
     * @returns Boolean indicating if client is in a valid state
     */
    validateClientState(client, ws) {
        // Check for authentication if enabled
        if (!client.authenticated && process.env.REQUIRE_WS_AUTH === 'true') {
            logger_1.logger.warn('Unauthenticated client attempted to send message', { clientId: client.id });
            this.sendToClient(ws, 'error', { message: 'Authentication required' });
            return false;
        }
        // Check for valid state
        if (client.state === ConnectionState.ERROR || client.state === ConnectionState.CLOSING) {
            logger_1.logger.warn('Client in invalid state attempted to send message', {
                clientId: client.id,
                state: client.state
            });
            return false;
        }
        return true;
    }
    /**
     * Send a message to a specific client with error handling and rate limiting
     * @param ws WebSocket connection
     * @param type Message type
     * @param payload Message payload
     */
    sendToClient(ws, type, payload) {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                const message = JSON.stringify({ type, payload });
                ws.send(message);
                // Update client last active timestamp
                const client = this.clients.get(ws);
                if (client) {
                    client.lastActiveAt = new Date();
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error sending message to client', {
                error: error instanceof Error ? error.message : String(error),
                type
            });
            // Mark client as having an error
            const client = this.clients.get(ws);
            if (client) {
                client.state = ConnectionState.ERROR;
                client.error = error instanceof Error ? error.message : 'Error sending message';
            }
        }
    }
    /**
     * Broadcast a message to all connected clients
     * @param type Message type
     * @param payload Message payload
     */
    broadcastToAll(type, payload) {
        logger_1.logger.debug('Broadcasting message to all clients', {
            type,
            recipientCount: this.clients.size
        });
        this.clients.forEach((client, ws) => {
            if (client.state === ConnectionState.ACTIVE || client.state === ConnectionState.AUTHENTICATED) {
                this.sendToClient(ws, type, payload);
            }
        });
    }
    /**
     * Broadcast a message to specific user(s)
     * @param userIds Array of user IDs to broadcast to
     * @param type Message type
     * @param payload Message payload
     */
    broadcastToUsers(userIds, type, payload) {
        const eligibleClients = Array.from(this.clients.entries())
            .filter(([_, client]) => client.userId &&
            userIds.includes(client.userId) &&
            (client.state === ConnectionState.ACTIVE || client.state === ConnectionState.AUTHENTICATED));
        logger_1.logger.debug('Broadcasting message to specific users', {
            type,
            userIds,
            recipientCount: eligibleClients.length
        });
        eligibleClients.forEach(([ws, client]) => {
            this.sendToClient(ws, type, payload);
        });
    }
    /**
     * Broadcast a message to all clients subscribed to a specific channel
     * @param channel The channel to broadcast to
     * @param type Message type
     * @param payload Message payload
     * @param excludeWs Optional WebSocket connection to exclude from broadcast
     */
    broadcastToChannel(channel, type, payload, excludeWs) {
        const eligibleClients = Array.from(this.clients.entries())
            .filter(([ws, client]) => ws !== excludeWs &&
            client.subscribedChannels.has(channel) &&
            (client.state === ConnectionState.ACTIVE || client.state === ConnectionState.AUTHENTICATED));
        logger_1.logger.debug('Broadcasting message to channel', {
            channel,
            type,
            recipientCount: eligibleClients.length
        });
        eligibleClients.forEach(([ws, _]) => {
            this.sendToClient(ws, type, payload);
        });
    }
    /**
     * Broadcast a message to clients with specific client ID
     * @param clientId The client ID to target
     * @param type Message type
     * @param payload Message payload
     */
    broadcastToClientId(clientId, type, payload) {
        const eligibleClients = Array.from(this.clients.entries())
            .filter(([_, client]) => client.clientId === clientId &&
            (client.state === ConnectionState.ACTIVE || client.state === ConnectionState.AUTHENTICATED));
        logger_1.logger.debug('Broadcasting message to clientId', {
            clientId,
            type,
            recipientCount: eligibleClients.length
        });
        eligibleClients.forEach(([ws, _]) => {
            this.sendToClient(ws, type, payload);
        });
    }
    /**
     * Generate a unique client ID
     * @returns A unique string identifier for the client
     */
    generateClientId() {
        return `client-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    }
    /**
     * Start a heartbeat interval to detect dead connections
     */
    startHeartbeat() {
        // Clear any existing interval
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        // Send ping to all clients periodically
        this.heartbeatInterval = setInterval(() => {
            logger_1.logger.debug('Sending heartbeat ping to all clients');
            this.clients.forEach((client, ws) => {
                // Check if client is responsive
                const timeSinceLastActive = Date.now() - client.lastActiveAt.getTime();
                if (timeSinceLastActive > this.clientTimeoutMs) {
                    // Client has been inactive for too long, close the connection
                    logger_1.logger.warn('Closing inactive WebSocket connection', {
                        clientId: client.id,
                        inactiveDuration: timeSinceLastActive
                    });
                    client.state = ConnectionState.CLOSING;
                    ws.close(1000, 'Connection timeout due to inactivity');
                    return;
                }
                // Send ping to active clients
                if (client.state === ConnectionState.ACTIVE || client.state === ConnectionState.AUTHENTICATED) {
                    this.sendToClient(ws, 'ping', { timestamp: Date.now() });
                }
            });
        }, this.heartbeatIntervalMs);
    }
    /**
     * Start an interval to clean up resources and prevent memory leaks
     */
    startCleanupInterval() {
        // Clear any existing interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        // Periodically clean up resources
        this.cleanupInterval = setInterval(() => {
            // Find and remove dead connections
            this.clients.forEach((client, ws) => {
                if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                    logger_1.logger.debug('Cleaning up closed WebSocket connection', { clientId: client.id });
                    this.clients.delete(ws);
                }
            });
            // Log connection metrics
            const metrics = this.getConnectionMetrics();
            logger_1.logger.info('WebSocket connection metrics', { metrics });
        }, this.cleanupIntervalMs);
    }
    /**
     * Gracefully shut down the WebSocket server
     */
    shutdown() {
        logger_1.logger.info('Shutting down WebSocket server');
        // Clear intervals
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        // Close all client connections gracefully
        this.clients.forEach((client, ws) => {
            client.state = ConnectionState.CLOSING;
            ws.close(1001, 'Server shutting down');
        });
        // Close the server
        this.wss.close(() => {
            logger_1.logger.info('WebSocket server closed');
        });
    }
}
exports.default = WebSocketService;
