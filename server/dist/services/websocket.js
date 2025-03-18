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
exports.WebSocketService = void 0;
const ws_1 = __importStar(require("ws"));
const creatomateService_1 = require("./creatomateService");
class WebSocketService {
    constructor(server) {
        this.clients = new Map();
        this.wss = new ws_1.Server({ server, path: '/ws' });
        this.initialize();
        console.log('WebSocket server initialized at ws://localhost:[PORT]/ws');
        // Register with Creatomate service for render status updates
        creatomateService_1.creatomateService.setWebSocketService(this);
    }
    initialize() {
        this.wss.on('connection', (ws) => {
            const clientId = this.generateClientId();
            this.clients.set(ws, { id: clientId });
            console.log(`Client connected: ${clientId}, total clients: ${this.clients.size}`);
            // Send welcome message
            this.sendToClient(ws, 'connection', {
                message: 'Connected to AIrWAVE WebSocket server',
                clientId
            });
            // Handle incoming messages
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                }
                catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    this.sendToClient(ws, 'error', { message: 'Invalid message format' });
                }
            });
            // Handle disconnection
            ws.on('close', () => {
                const client = this.clients.get(ws);
                console.log(`Client disconnected: ${client?.id}, remaining clients: ${this.clients.size - 1}`);
                this.clients.delete(ws);
            });
        });
    }
    handleMessage(ws, data) {
        const { type, payload } = data;
        const client = this.clients.get(ws);
        if (!client)
            return;
        switch (type) {
            case 'identify':
                // Allow clients to identify themselves with user info
                if (payload.userId) {
                    client.userId = payload.userId;
                    console.log(`Client ${client.id} identified as user ${payload.userId}`);
                    this.sendToClient(ws, 'identified', { userId: payload.userId });
                }
                break;
            case 'subscribe':
                // Allow clients to subscribe to specific channels/topics
                console.log(`Client ${client.id} subscribed to: ${payload.channel}`);
                this.sendToClient(ws, 'subscribed', { channel: payload.channel });
                break;
            case 'ping':
                // Simple ping-pong for connection testing
                this.sendToClient(ws, 'pong', { timestamp: new Date().toISOString() });
                break;
            default:
                console.log(`Received unknown message type: ${type}`);
        }
    }
    // Send a message to a specific client
    sendToClient(ws, type, payload) {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify({ type, payload }));
        }
    }
    // Broadcast a message to all connected clients
    broadcastToAll(type, payload) {
        this.clients.forEach((client, ws) => {
            this.sendToClient(ws, type, payload);
        });
    }
    // Broadcast a message to specific user(s)
    broadcastToUsers(userIds, type, payload) {
        this.clients.forEach((client, ws) => {
            if (client.userId && userIds.includes(client.userId)) {
                this.sendToClient(ws, type, payload);
            }
        });
    }
    // Generate a unique client ID
    generateClientId() {
        return `client-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
}
exports.WebSocketService = WebSocketService;
exports.default = WebSocketService;
