import { Server as HttpServer } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { creatomateService } from './creatomateService';

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, { id: string; userId?: string }> = new Map();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.initialize();
    console.log('WebSocket server initialized at ws://localhost:[PORT]/ws');
    
    // Register with Creatomate service for render status updates
    creatomateService.setWebSocketService(this);
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = this.generateClientId();
      this.clients.set(ws, { id: clientId });
      
      console.log(`Client connected: ${clientId}, total clients: ${this.clients.size}`);
      
      // Send welcome message
      this.sendToClient(ws, 'connection', { 
        message: 'Connected to AIrWAVE WebSocket server',
        clientId
      });

      // Handle incoming messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
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

  private handleMessage(ws: WebSocket, data: any) {
    const { type, payload } = data;
    const client = this.clients.get(ws);
    
    if (!client) return;
    
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
  private sendToClient(ws: WebSocket, type: string, payload: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  // Broadcast a message to all connected clients
  public broadcastToAll(type: string, payload: any) {
    this.clients.forEach((client, ws) => {
      this.sendToClient(ws, type, payload);
    });
  }

  // Broadcast a message to specific user(s)
  public broadcastToUsers(userIds: string[], type: string, payload: any) {
    this.clients.forEach((client, ws) => {
      if (client.userId && userIds.includes(client.userId)) {
        this.sendToClient(ws, type, payload);
      }
    });
  }

  // Generate a unique client ID
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}

export default WebSocketService;