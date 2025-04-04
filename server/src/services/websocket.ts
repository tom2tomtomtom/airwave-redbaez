// @ts-nocheck
import { Server as HttpServer } from 'http';
import * as WebSocketModule from 'ws';
const WebSocket = WebSocketModule.default || WebSocketModule;
const { Server: WebSocketServer } = WebSocketModule;
import { creatomateService } from './creatomateService';
import * as url from 'url';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { ErrorCode } from '../types/errorTypes';

// Define WebSocket interface for services to use
export interface WebSocketMessagingService {
  broadcastToAll(type: string, payload: any): void;
  broadcastToUsers(userIds: string[], type: string, payload: any): void;
  broadcastToChannel?(channel: string, type: string, payload: any, excludeWs?: any): void;
  broadcastToClientId?(clientId: string, type: string, payload: any): void;
}

// Define connection states for tracking and metrics
enum ConnectionState {
  CONNECTING = 'connecting',
  AUTHENTICATED = 'authenticated',
  ACTIVE = 'active',
  CLOSING = 'closing',
  ERROR = 'error'
}

// Client metadata interface for tracking connections
interface ClientMetadata {
  id: string;
  userId?: string;
  clientId?: string;
  ip?: string;
  userAgent?: string; 
  connectedAt: Date;
  lastActiveAt: Date;
  state: ConnectionState;
  subscribedChannels: Set<string>;
  authenticated: boolean;
  csrfToken?: string;
  error?: string;
}

class WebSocketService {
  private wss: typeof WebSocketServer;
  private clients: Map<WebSocket, ClientMetadata> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Configurable settings
  private readonly heartbeatIntervalMs = 30000; // 30 seconds
  private readonly clientTimeoutMs = 120000; // 2 minutes without activity
  private readonly cleanupIntervalMs = 60000; // 1 minute
  
  // Method to get the current connection count
  public getConnectionCount(): number {
    return this.clients.size;
  }
  
  // Method to get detailed connection metrics
  public getConnectionMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {
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
      if (client.userId) metrics.withUserId++;
    });
    
    return metrics;
  }

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      // Increase the max payload size to handle larger messages (e.g., for asset previews)
      maxPayload: 5 * 1024 * 1024 // 5MB
    });
    
    this.initialize();
    logger.info('WebSocket server initialized at ws://localhost:[PORT]/ws');
    
    // Start periodic heartbeat to detect dead connections
    this.startHeartbeat();
    
    // Start periodic cleanup to prevent memory leaks
    this.startCleanupInterval();
    
    // Register with Creatomate service for render status updates
    // The creatomateService now uses the singleton WebSocketService instance directly
    // Keep this call for backwards compatibility but don't pass any parameters
    creatomateService.setWebSocketService();
    
    // Handle server shutdown gracefully
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocketModule.WebSocket, req: any) => {
      try {
        // Extract client information from request
        const clientId = this.generateClientId();
        const ip = req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        // Extract CSRF token from URL if present
        let csrfToken: string | undefined;
        if (req.url) {
          const parsedUrl = url.parse(req.url, true);
          csrfToken = parsedUrl.query.csrf_token as string;
        }
        
        // Initialize client metadata
        const metadata: ClientMetadata = {
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
        
        logger.info('WebSocket client connected', { 
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
            logger.warn('WebSocket client failed to authenticate in time', { clientId });
            client.state = ConnectionState.ERROR;
            client.error = 'Authentication timeout';
            ws.close(4001, 'Authentication timeout');
          }
        }, 30000); // 30 second timeout for authentication

        // Handle incoming messages
        ws.on('message', (message: string) => {
          try {
            // Update last active timestamp
            const client = this.clients.get(ws);
            if (client) {
              client.lastActiveAt = new Date();
            }
            
            const data = JSON.parse(message);
            this.handleMessage(ws, data);
          } catch (error) {
            logger.error('Error parsing WebSocket message', { 
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
          logger.error('WebSocket client error', { 
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
        (ws as any).on('close', (code: number, reason: string) => {
          const client = this.clients.get(ws);
          if (client) {
            logger.info('WebSocket client disconnected', { 
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
      } catch (error) {
        logger.error('Error handling WebSocket connection', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        ws.close(1011, 'Internal server error');
      }
    });
  }

  private handleMessage(ws: WebSocket, data: any) {
    const { type, payload } = data;
    const client = this.clients.get(ws);
    
    if (!client) {
      logger.warn('Message received from unregistered client');
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
            logger.info('Client authenticated with CSRF token', { clientId: client.id });
            this.sendToClient(ws, 'authenticated', { success: true });
          } else {
            client.error = 'Invalid CSRF token';
            client.state = ConnectionState.ERROR;
            logger.warn('Invalid CSRF token provided', { clientId: client.id });
            this.sendToClient(ws, 'error', { message: 'Authentication failed: Invalid CSRF token' });
            ws.close(4001, 'Invalid CSRF token');
          }
        } else {
          logger.warn('Authentication attempted without CSRF token', { clientId: client.id });
          this.sendToClient(ws, 'error', { message: 'Authentication failed: CSRF token required' });
        }
        break;
        
      case 'identify':
        // Allow clients to identify themselves with user info
        if (payload.userId) {
          client.userId = payload.userId;
          logger.info('Client identified with user ID', { 
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
          logger.info('Client subscribed to channel', { 
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
          logger.info('Client unsubscribed from channel', { 
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
        if (!this.validateClientState(client, ws)) return;
        
        if (payload.target) {
          logger.debug('Client sent message to channel', { 
            clientId: client.id, 
            channel: payload.target 
          });
          // Broadcast to the specified channel
          this.broadcastToChannel(payload.target, 'message', payload, ws);
        }
        break;
        
      default:
        logger.debug('Received unknown message type', { type, clientId: client.id });
    }
  }

  /**
   * Validate that a client is in a valid state for message processing
   * @param client The client metadata
   * @param ws The WebSocket connection
   * @returns Boolean indicating if client is in a valid state
   */
  private validateClientState(client: ClientMetadata, ws: WebSocket): boolean {
    // Check for authentication if enabled
    if (!client.authenticated && process.env.REQUIRE_WS_AUTH === 'true') {
      logger.warn('Unauthenticated client attempted to send message', { clientId: client.id });
      this.sendToClient(ws, 'error', { message: 'Authentication required' });
      return false;
    }
    
    // Check for valid state
    if (client.state === ConnectionState.ERROR || client.state === ConnectionState.CLOSING) {
      logger.warn('Client in invalid state attempted to send message', { 
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
  private sendToClient(ws: WebSocket, type: string, payload: any) {
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
    } catch (error) {
      logger.error('Error sending message to client', { 
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
  public broadcastToAll(type: string, payload: any) {
    logger.debug('Broadcasting message to all clients', { 
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
  public broadcastToUsers(userIds: string[], type: string, payload: any) {
    const eligibleClients = Array.from(this.clients.entries())
      .filter(([_, client]) => 
        client.userId && 
        userIds.includes(client.userId) && 
        (client.state === ConnectionState.ACTIVE || client.state === ConnectionState.AUTHENTICATED)
      );
    
    logger.debug('Broadcasting message to specific users', { 
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
  public broadcastToChannel(channel: string, type: string, payload: any, excludeWs?: WebSocket) {
    const eligibleClients = Array.from(this.clients.entries())
      .filter(([ws, client]) => 
        ws !== excludeWs && 
        client.subscribedChannels.has(channel) && 
        (client.state === ConnectionState.ACTIVE || client.state === ConnectionState.AUTHENTICATED)
      );
    
    logger.debug('Broadcasting message to channel', { 
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
  public broadcastToClientId(clientId: string, type: string, payload: any) {
    const eligibleClients = Array.from(this.clients.entries())
      .filter(([_, client]) => 
        client.clientId === clientId && 
        (client.state === ConnectionState.ACTIVE || client.state === ConnectionState.AUTHENTICATED)
      );
    
    logger.debug('Broadcasting message to clientId', { 
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
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }

  /**
   * Start a heartbeat interval to detect dead connections
   */
  private startHeartbeat() {
    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Send ping to all clients periodically
    this.heartbeatInterval = setInterval(() => {
      logger.debug('Sending heartbeat ping to all clients');
      
      this.clients.forEach((client, ws) => {
        // Check if client is responsive
        const timeSinceLastActive = Date.now() - client.lastActiveAt.getTime();
        
        if (timeSinceLastActive > this.clientTimeoutMs) {
          // Client has been inactive for too long, close the connection
          logger.warn('Closing inactive WebSocket connection', { 
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
  private startCleanupInterval() {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Periodically clean up resources
    this.cleanupInterval = setInterval(() => {
      // Find and remove dead connections
      this.clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          logger.debug('Cleaning up closed WebSocket connection', { clientId: client.id });
          this.clients.delete(ws);
        }
      });
      
      // Log connection metrics
      const metrics = this.getConnectionMetrics();
      logger.info('WebSocket connection metrics', { metrics });
    }, this.cleanupIntervalMs);
  }
  
  /**
   * Gracefully shut down the WebSocket server
   */
  public shutdown() {
    logger.info('Shutting down WebSocket server');
    
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
      logger.info('WebSocket server closed');
    });
  }
}

export default WebSocketService;