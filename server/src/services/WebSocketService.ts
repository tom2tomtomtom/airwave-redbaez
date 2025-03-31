// server/src/services/WebSocketService.ts
import { Server as HttpServer } from 'http';
import { Server, Socket, BroadcastOperator } from 'socket.io';
import jwt from 'jsonwebtoken';
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
      // Optional: Add transport options if needed
      // transports: ['websocket', 'polling'],
    });

    logger.info('Socket.IO server initialized.');

    // --- Authentication Middleware ---
    this.io.use(this.authenticateSocket);

    // --- Connection Handler ---
    this.io.on('connection', this.handleConnection);
  }

  /**
   * Middleware to authenticate socket connections using JWT.
   */
  private authenticateSocket = (socket: IoSocket, next: (err?: Error) => void): void => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];

    if (!token) {
      logger.warn('WS Connection rejected: No token provided.');
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        logger.error('WS Authentication error: JWT_SECRET environment variable not set.');
        return next(new Error('Authentication configuration error'));
      }

      const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
      // Attach user info to the socket object for later use
      socket.data.userId = decoded.userId;
      socket.data.clientId = null; // Client ID will be set when joining a room
      logger.info(`WS User authenticated: ${decoded.userId}`);
      next(); // Proceed to connection handler
    } catch (error) {
      logger.error('WS Authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  };

  /**
   * Handles new authenticated socket connections and sets up event listeners.
   */
  private handleConnection = (socket: IoSocket): void => {
    logger.info(`WS User connected: ${socket.data.userId} (Socket ID: ${socket.id})`);

    // --- Standard Event Listeners ---
    socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));

    // --- Custom Event Listeners ---
    socket.on(ClientToServerEvents.JOIN_ROOM, (payload, ack) => this.handleJoinRoom(socket, payload, ack));
    socket.on(ClientToServerEvents.LEAVE_ROOM, (payload, ack) => this.handleLeaveRoom(socket, payload, ack));
    // Add listeners for other ClientToServerEvents (e.g., COLLABORATIVE_ACTION) here

    // --- Initial Actions ---
    // Optionally emit something to the client upon successful connection
    // socket.emit('welcome', { message: 'Welcome!' });
  };

  /**
   * Handles socket disconnections.
   */
  private handleDisconnect = (socket: IoSocket, reason: string): void => {
    logger.info(`WS User disconnected: ${socket.data.userId} (Socket ID: ${socket.id}), Reason: ${reason}`);
    // Broadcast presence update if a client room was joined
    if (socket.data.clientId) {
       this.broadcastPresence(socket.data.userId, socket.data.clientId, 'offline');
    }
    // Perform cleanup if necessary (e.g., leave rooms automatically)
    // socket.rooms contains the rooms the socket was in, including its own ID room
  };

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
        this.broadcastPresence(userId, socket.data.clientId, 'offline'); // Broadcast offline for old client
    }


    socket.join(room);
    socket.data.clientId = clientId; // Store current client ID
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
