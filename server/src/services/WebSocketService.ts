// server/src/services/WebSocketService.ts
import { Server as HttpServer } from 'http';
import { Server, Socket, BroadcastOperator } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerListenEvents,
  ServerEmitEvents,
  SocketData,
  RoomPayload,
  UserPresencePayload,
  WebSocketEvent, 
  StandardSocketEvents,
} from '../types/websocket.types';
import { TokenPayload } from './TokenService';

// Define the type for our Socket.IO server instance with strongly typed events
type IoServer = Server<
  ServerListenEvents,
  ServerEmitEvents,
  InterServerEvents,
  SocketData
>;

// Define the type for a Socket instance with strongly typed events
type IoSocket = Socket<
  ServerListenEvents,
  ServerEmitEvents,
  InterServerEvents,
  SocketData
>;

export class WebSocketService {
  private io: IoServer | null = null;
  private static instance: WebSocketService;
  
  // Track connected users for reconnection and session management
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private sessionCleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {} // Private constructor for singleton pattern

  /**
   * Gets the singleton instance of the WebSocketService.
   */
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Initializes the Socket.IO server and attaches it to the HTTP server.
   * Sets up authentication middleware and connection handlers.
   * @param httpServer The HTTP server instance.
   */
  public initialize(httpServer: HttpServer): void {
    if (this.io) {
      logger.warn('WebSocketService already initialized.');
      return;
    }

    this.io = new Server<
      ServerListenEvents,
      ServerEmitEvents,
      InterServerEvents,
      SocketData
    >(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN, // Use environment variable for CORS origin
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // Improved connection settings
      transports: ['websocket', 'polling'],  // Prefer WebSocket but fall back to polling
      pingTimeout: 20000,                     // How long to wait for pong (ms)
      pingInterval: 25000,                    // Ping interval (ms)
      connectTimeout: 10000,                  // Connection timeout (ms)
      maxHttpBufferSize: 1e6,                 // 1MB max payload
    });

    logger.info('Socket.IO server initialized with enhanced connection settings');

    // --- Authentication Middleware ---
    this.io.use(this.authenticateSocket);

    // --- Connection Handler ---
    this.io.on('connection', this.handleConnection);
    
    // Start session cleanup (every 5 minutes, timeout after 1 hour of inactivity)
    this.startSessionCleanup(300000, 3600000);
  }

  /**
   * Middleware to authenticate socket connections using JWT.
   * Enhanced with token expiry validation, role-based access control,
   * and session tracking.
   */
  private authenticateSocket = async (socket: IoSocket, next: (err?: Error) => void): Promise<void> => {
    // Get token from multiple possible sources - ordered by security preference
    const token = 
      socket.handshake.auth.token || 
      socket.handshake.headers['authorization']?.split(' ')[1] ||
      socket.handshake.headers['x-access-token'];
    
    // Get CSRF token for additional security
    const csrfToken = 
      socket.handshake.auth.csrfToken ||
      socket.handshake.headers['x-csrf-token'];
    
    // Connection context for enhanced security logging
    const connectionContext = {
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      transport: socket.conn.transport.name,
      origin: socket.handshake.headers.origin || 'unknown',
      time: new Date().toISOString(),
      secure: socket.handshake.secure,
      hasCsrfToken: !!csrfToken
    };

    // Verify connection origin in production
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
      // Add known production domains if not already included
      if (!allowedOrigins.includes('https://airwave.redbaez.com')) {
        allowedOrigins.push('https://airwave.redbaez.com');
      }
      
      const origin = socket.handshake.headers.origin;
      if (origin && !allowedOrigins.includes(origin)) {
        logger.warn('WS Connection rejected: Invalid origin', { ...connectionContext, origin });
        return next(new Error('Connection from unauthorized origin'));
      }
    }

    if (!token) {
      logger.warn('WS Connection rejected: No token provided', connectionContext);
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      // Use ONLY the proper JWT access token secret, avoid fallbacks
      const jwtSecret = process.env.JWT_ACCESS_SECRET;
      if (!jwtSecret) {
        logger.error('WS Authentication error: JWT_ACCESS_SECRET environment variable not set');
        return next(new Error('Authentication configuration error'));
      }

      // Use tokenService for verification instead of direct jwt verification
      // This ensures consistent token validation across the application
      let decoded: TokenPayload;
      try {
        // Import dynamically to avoid circular dependency
        const { tokenService } = await import('./TokenService');
        decoded = tokenService.verifyAccessToken(token);
        
        // Validate token expiry explicitly
        const currentTime = Math.floor(Date.now() / 1000);
        const tokenAge = currentTime - (decoded.issuedAt || 0);
        const maxTokenAge = process.env.WS_TOKEN_MAX_AGE_SECONDS ? 
          parseInt(process.env.WS_TOKEN_MAX_AGE_SECONDS, 10) : 
          3600; // Default to 1 hour
          
        if (tokenAge > maxTokenAge) {
          throw new Error(`Token expired (age: ${tokenAge}s, max: ${maxTokenAge}s)`);
        }
        
        // Only require CSRF tokens in production or if explicitly enabled
        const enforceCsrf = process.env.NODE_ENV === 'production' || 
                           process.env.ENFORCE_CSRF === 'true';
                           
        // Validate CSRF token if we have a sessionId and enforcement is enabled
        if (enforceCsrf && decoded.sessionId) {
          // Skip CSRF for development when bypassing is explicitly enabled
          const bypassForDev = process.env.NODE_ENV !== 'production' && 
                              process.env.BYPASS_CSRF_FOR_TESTING === 'true';
                              
          if (!bypassForDev) {
            if (!csrfToken) {
              logger.warn('WS Connection rejected: Missing CSRF token', connectionContext);
              throw new Error('Authentication error: CSRF token required');
            }
            
            const isValidCsrf = tokenService.validateCsrfToken(csrfToken, decoded.sessionId);
            if (!isValidCsrf) {
              logger.warn('WS Connection rejected: Invalid CSRF token', connectionContext);
              throw new Error('Authentication error: Invalid CSRF token');
            }
            
            logger.debug('CSRF validation successful for WebSocket connection');
          }
        }
        
        // IP validation for additional security (if IP was stored in token)
        if (decoded.ipAddress && decoded.ipAddress !== socket.handshake.address) {
          logger.warn('WS Connection rejected: IP mismatch', {
            ...connectionContext,
            tokenIp: decoded.ipAddress,
            connectionIp: socket.handshake.address
          });
          return next(new Error('Authentication error: Client IP mismatch'));
        }
        
        // Validate user agent if stored in token (basic fingerprinting)
        if (decoded.fingerprint && 
            socket.handshake.headers['user-agent'] && 
            !socket.handshake.headers['user-agent'].includes(decoded.fingerprint.substring(0, 50))) {
          logger.warn('WS Connection rejected: User agent mismatch', {
            ...connectionContext,
            expectedUserAgent: decoded.fingerprint.substring(0, 30) + '...',
            actualUserAgent: socket.handshake.headers['user-agent'].substring(0, 30) + '...'
          });
          return next(new Error('Authentication error: Client fingerprint mismatch'));
        }
      } catch (verifyError) {
        logger.error('WS Token verification failed:', verifyError);
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      // Attach user info to the socket object for later use with additional security metadata
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role || 'user'; // Default to user role if not specified
      socket.data.clientId = null; // Client ID will be set when joining a room
      socket.data.sessionId = decoded.sessionId; // Track the session ID
      socket.data.connectedAt = Date.now();
      socket.data.connectionMetadata = connectionContext; // Store connection context for security auditing
      
      logger.info(`WS User authenticated: ${decoded.userId} (Role: ${decoded.role || 'user'})`);
      next(); // Proceed to connection handler
    } catch (error) {
      logger.error('WS Authentication error:', { error, ...connectionContext });
      next(new Error('Authentication error: Invalid token'));
    }
  };

  /**
   * Handles new authenticated socket connections and sets up event listeners.
   */
  private handleConnection = (socket: IoSocket): void => {
    const userId = socket.data.userId;
    logger.info(`WS User connected: ${userId} (Socket ID: ${socket.id})`);

    // Track this connection by user ID for reconnection management
    this.trackUserConnection(userId, socket.id);
    
    // Emit connection acknowledgement with socket info
    // Cast to 'any' to bypass TypeScript's strict checking on event types
    (socket.emit as any)(StandardSocketEvents.CONNECTION_ACK, {
      socketId: socket.id,
      userId: userId,
      connectedAt: new Date().toISOString(),
      serverTime: Date.now()
    });

    // --- Standard Event Listeners ---
    socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
    socket.on('ping', () => this.handlePing(socket));

    // --- Custom Event Listeners ---
    socket.on(ClientToServerEvents.JOIN_ROOM, (payload, ack) => this.handleJoinRoom(socket, payload, ack));
    socket.on(ClientToServerEvents.LEAVE_ROOM, (payload, ack) => this.handleLeaveRoom(socket, payload, ack));
    // Add listeners for other ClientToServerEvents (e.g., COLLABORATIVE_ACTION) here

    // Store last activity timestamp for session management
    socket.data.lastActivity = Date.now();
  };

  /**
   * Handles socket disconnections with proper cleanup.
   */
  private handleDisconnect = (socket: IoSocket, reason: string): void => {
    try {
      const userId = socket.data.userId;
      const socketId = socket.id;
      const clientId = socket.data.clientId;
      
      logger.info(`WS User disconnected: ${userId} (Socket ID: ${socketId}), Reason: ${reason}`);
      
      // Remove user from connection tracking
      this.removeUserConnection(userId, socketId);
      
      // Broadcast presence update if a client room was joined
      if (clientId) {
        // Check if this is the last connection for this user before broadcasting offline
        const userSockets = this.connectedUsers.get(userId);
        const isLastConnection = !userSockets || userSockets.size === 0;
        
        if (isLastConnection) {
          this.broadcastPresence(userId, clientId, 'offline');
          logger.debug(`Last connection for user ${userId}, marked offline in client ${clientId}`);
        } else {
          logger.debug(`User ${userId} still has ${userSockets.size} active connections, not marking offline`);
        }
      }
      
      // Perform cleanup - proactively leave all joined rooms
      if (socket.rooms && socket.rooms.size > 0) {
        socket.rooms.forEach((room) => {
          if (room !== socket.id) { // Skip the socket's own room (auto-managed by Socket.IO)
            socket.leave(room);
            logger.debug(`Socket ${socketId} removed from room ${room}`);
          }
        });
        logger.debug(`Cleaned up ${socket.rooms.size - 1} rooms for disconnected socket ${socketId}`);
      }
      
      // Force release socket resources if they haven't been properly released
      if (socket.connected) {
        logger.warn(`Socket ${socketId} still marked as connected during disconnect handling, forcing close`);
        socket.disconnect(true);
      }
    } catch (error) {
      logger.error('Error during socket disconnect handling', { error, socketId: socket.id });
    }
  };
  
  /**
   * Handle ping messages from clients and respond with pong
   */
  private handlePing = (socket: IoSocket): void => {
    // Update last activity timestamp
    socket.data.lastActivity = Date.now();
    
    // Respond with pong including server timestamp for latency calculation
    // Cast to 'any' to bypass TypeScript's strict checking on event types
    (socket.emit as any)('pong', { timestamp: Date.now() });
  };
  
  /**
   * Track user connections for managing reconnections and presence
   */
  private trackUserConnection(userId: string, socketId: string): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    
    this.connectedUsers.get(userId)?.add(socketId);
    logger.debug(`User ${userId} now has ${this.connectedUsers.get(userId)?.size} active connections`);
  }
  
  /**
   * Remove a socket from user connection tracking
   */
  private removeUserConnection(userId: string, socketId: string): void {
    const userSockets = this.connectedUsers.get(userId);
    
    if (userSockets) {
      userSockets.delete(socketId);
      
      // If no more connections for this user, remove the user entry
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
        logger.debug(`Removed last connection for user ${userId}`);
      } else {
        logger.debug(`User ${userId} still has ${userSockets.size} active connections after disconnect`);
      }
    }
  }

  /**
   * Handles requests from clients to join a specific room (e.g., client-specific room).
   */
  private handleJoinRoom = (socket: IoSocket, payload: RoomPayload, ack?: (status: { success: boolean }) => void): void => {
    const { room } = payload;
    const userId = socket.data.userId;

    // Basic validation: Ensure room name starts with 'client_'
    if (!room.startsWith('client_')) {
        logger.warn(`WS User ${userId} attempted to join invalid room: ${room}`);
        if(ack) ack({ success: false });
        return;
    }

    const clientId = room.split('_')[1]; // Extract client ID

    // Leave previous client room if exists
    if (socket.data.clientId && socket.data.clientId !== clientId) {
        const previousRoom = `client_${socket.data.clientId}`;
        socket.leave(previousRoom);
        logger.info(`WS User ${userId} left room: ${previousRoom}`);
        
        // Check if any other sockets from this user are still in the previous room
        // before broadcasting offline presence
        const userSockets = this.connectedUsers.get(userId);
        let otherSocketsInPreviousRoom = false;
        
        if (userSockets) {
          // Convert Set to Array before iteration to avoid TypeScript errors
          for (const otherSocketId of Array.from(userSockets)) {
            if (otherSocketId === socket.id) continue; // Skip current socket
            
            const otherSocket = this.io?.sockets.sockets.get(otherSocketId);
            if (otherSocket && otherSocket.data.clientId === socket.data.clientId) {
              otherSocketsInPreviousRoom = true;
              break;
            }
          }
        }
        
        // Only broadcast offline if no other sockets from this user are in the room
        if (!otherSocketsInPreviousRoom) {
          this.broadcastPresence(userId, socket.data.clientId, 'offline');
        }
    }

    // Update socket data and join room
    socket.join(room);
    socket.data.clientId = clientId; // Store current client ID
    socket.data.lastActivity = Date.now(); // Update last activity
    logger.info(`WS User ${userId} joined room: ${room}`);

    // Broadcast presence update to the new room
    this.broadcastPresence(userId, clientId, 'online');

    if(ack) ack({ success: true });
  };

    /**
   * Handles requests from clients to leave a specific room.
   */
  private handleLeaveRoom = (socket: IoSocket, payload: RoomPayload, ack?: (status: { success: boolean }) => void): void => {
    const { room } = payload;
    const userId = socket.data.userId;

    // Only allow leaving client rooms explicitly associated with the socket
    if (room === `client_${socket.data.clientId}`) {
        socket.leave(room);
        logger.info(`WS User ${userId} left room: ${room}`);
        this.broadcastPresence(userId, socket.data.clientId, 'offline'); // Broadcast offline
        socket.data.clientId = null; // Clear stored client ID
        if(ack) ack({ success: true });
    } else {
         logger.warn(`WS User ${userId} attempted to leave unauthorized/invalid room: ${room}`);
         if(ack) ack({ success: false });
    }
  };


  /**
   * Broadcasts user presence updates to a specific client room.
   * @param userId The ID of the user whose presence changed.
   * @param clientId The client ID scope for the presence update.
   * @param status The new presence status.
   */
   private broadcastPresence = (userId: string, clientId: string | null, status: 'online' | 'offline' | 'idle'): void => {
     if (!this.io || !clientId) return;

     const room = `client_${clientId}`;
     const payload: UserPresencePayload = {
       userId,
       clientId,
       status,
       lastSeen: Date.now(),
     };
     // @ts-ignore - Temporarily ignore due to complex type inference with .to().emit()
     (this.io.to(room).emit as any)(WebSocketEvent.USER_PRESENCE_UPDATE, payload);
     logger.debug(`WS Broadcast presence to ${room}: User ${userId} is ${status}`);
   }

  // --- Emitter Methods ---

  /**
   * Emits an event to all connected sockets.
   * @param event The event name.
   * @param payload The data to send.
   */
  public broadcast<T extends WebSocketEvent>(event: T, payload: ServerEmitEvents[T]): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast.');
      return;
    }
    // Cast the emit call itself to any to bypass complex internal TS checks
    (this.io.emit as any)(event, payload);
    logger.debug(`WS Broadcast [${String(event)}] to all clients`);
  }

  /**
   * Emits an event to a specific client identified by their client ID.
   * @param clientId The target client ID.
   * @param event The event name.
   * @param payload The data to send.
   */
  public broadcastToClient<T extends WebSocketEvent>(
    clientId: string,
    event: T,
    payload: ServerEmitEvents[T]
  ): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast to client.');
      return;
    }
    const room = `client_${clientId}`;
    (this.io.to(room).emit as any)(event, payload);
    logger.debug(`WS Broadcast [${String(event)}] to client ${clientId}`);
  }

  /**
   * Emits an event to a specific user identified by their user ID.
   * @param userId The target user ID.
   * @param event The event name.
   * @param payload The data to send.
   */
  public broadcastToUser<T extends WebSocketEvent>(
    userId: string,
    event: T,
    payload: ServerEmitEvents[T]
  ): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast to user.');
      return;
    }
    // Assuming a room per user, e.g., 'user_<userId>'
    const room = `user_${userId}`;
    (this.io.to(room).emit as any)(event, payload);
    logger.debug(`WS Broadcast [${String(event)}] to user ${userId}`);
  }

  /**
   * Start a session cleanup interval.
   * Periodically checks for inactive sessions and cleans them up.
   * Enhanced with memory leak detection and orphaned connection cleanup.
   * @param intervalMs How often to check for inactive sessions (default: 60s)
   * @param inactivityTimeout How long a session can be inactive before disconnecting (default: 1h)
   */
  public startSessionCleanup(intervalMs: number = 60000, inactivityTimeout: number = 3600000): void {
    // Use environment variables if set, otherwise use default values
    const configuredIntervalMs = process.env.WS_CLEANUP_INTERVAL_MS ? 
      parseInt(process.env.WS_CLEANUP_INTERVAL_MS, 10) : intervalMs;
      
    const configuredInactivityTimeout = process.env.WS_INACTIVITY_TIMEOUT_MS ? 
      parseInt(process.env.WS_INACTIVITY_TIMEOUT_MS, 10) : inactivityTimeout;
    if (!this.io) {
      logger.warn('Cannot start session cleanup: WebSocket server not initialized');
      return;
    }
    
    // Clear any existing cleanup interval
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }
    
    this.sessionCleanupInterval = setInterval(() => {
      try {
        const now = Date.now();
        logger.debug('Running WebSocket session cleanup check');
        
        // Get all connected sockets
        if (!this.io) return;
        const sockets = this.io.sockets.sockets;
        
        // Count before cleanup
        const beforeCount = sockets.size;
        let disconnectedCount = 0;
        
        // Check for potential orphaned connections in our tracking vs actual connected sockets
        let orphanedSocketIds: string[] = [];
        
        // Check each socket for inactivity
        sockets.forEach((socket) => {
          try {
            const lastActivity = socket.data.lastActivity || 0;
            const inactiveDuration = now - lastActivity;
            
            // If socket has been inactive for too long, disconnect it
            if (inactiveDuration > inactivityTimeout) {
              logger.info(`Disconnecting inactive socket ${socket.id} (User: ${socket.data.userId}). Inactive for ${Math.round(inactiveDuration / 1000 / 60)} minutes`);
              socket.disconnect(true);
              disconnectedCount++;
            }
          } catch (socketError) {
            logger.error('Error processing socket during cleanup', { socketId: socket.id, error: socketError });
            // Try to disconnect problematic socket
            try {
              socket.disconnect(true);
              disconnectedCount++;
            } catch (e) {
              logger.error('Failed to disconnect problematic socket', { socketId: socket.id });
            }
          }
        });
        
        // Check for orphaned sockets in our tracking Map that might not exist in Socket.IO anymore
        this.connectedUsers.forEach((socketIds, userId) => {
          socketIds.forEach(socketId => {
            if (!this.io?.sockets.sockets.has(socketId)) {
              orphanedSocketIds.push(socketId);
              this.removeUserConnection(userId, socketId);
              logger.warn(`Cleaned up orphaned socket ID ${socketId} for user ${userId}`);
            }
          });
        });
        
        if (disconnectedCount > 0 || orphanedSocketIds.length > 0) {
          logger.info(`WebSocket cleanup: Disconnected ${disconnectedCount} inactive sockets out of ${beforeCount} total, cleaned up ${orphanedSocketIds.length} orphaned connections`);
        }
        
        // Report current memory usage for monitoring
        const memoryUsage = process.memoryUsage();
        logger.debug('WebSocket server memory usage', { 
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          connections: sockets.size,
          trackedUsers: this.connectedUsers.size
        });
      } catch (error) {
        logger.error('Critical error during WebSocket session cleanup', { error });
      }
    }, intervalMs);
    
    logger.info(`WebSocket session cleanup started. Running every ${intervalMs/1000} seconds, timeout after ${inactivityTimeout/1000/60} minutes of inactivity`);
  }

  /**
   * Emits an event to a specific room.
   * @param room The target room name.
   * @param event The event name.
   * @param payload The data to send.
   */
  public broadcastToRoom<T extends WebSocketEvent>(
    room: string,
    event: T,
    payload: ServerEmitEvents[T]
  ): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast to room.');
      return;
    }
    (this.io.to(room).emit as any)(event, payload);
    logger.debug(`WS Broadcast [${String(event)}] to room ${room}`);
  }
  
  /**
   * Emits an event to a specific room.
   * This is an alias for broadcastToRoom, added for code clarity.
   * @param room The target room name.
   * @param event The event name.
   * @param payload The data to send.
   */
  public emitToRoom<T extends WebSocketEvent>(
    room: string,
    event: T,
    payload: ServerEmitEvents[T]
  ): void {
    this.broadcastToRoom(room, event, payload);
  }

  /**
   * Emits an event directly to a specific user identified by their socket ID.
   * Use sparingly, prefer room-based communication.
   * @param socketId The target socket ID.
   * @param event The event name.
   * @param payload The data to send.
   */
   public emitToSocket<T extends WebSocketEvent>(
    socketId: string,
    event: T,
    payload: ServerEmitEvents[T]
  ): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot emit to socket.');
      return;
    }
    (this.io.to(socketId).emit as any)(event, payload);
    logger.debug(`WS Emitted [${String(event)}] to socket ${socketId}`);
  }

  /**
   * Gets the underlying Socket.IO server instance.
   * Use with caution, prefer using service methods.
   */
  public getIoServer(): IoServer | null {
    return this.io;
  }
}

// Export a singleton instance
export const webSocketService = WebSocketService.getInstance();
