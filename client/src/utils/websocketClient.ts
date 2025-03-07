/**
 * WebSocket client for real-time communication with the AIrWAVE server
 * Handles automatic reconnection, message parsing, and event listeners.
 */

// Event types
type MessageCallback = (type: string, data: any) => void;
type TypedMessageCallback = (data: any) => void;
type ConnectCallback = () => void;
type ErrorCallback = (error: Event) => void;
type CloseCallback = (event: CloseEvent) => void;

interface MessageHandlerMap {
  [key: string]: TypedMessageCallback[];
}

class WebSocketClient {
  private socket: WebSocket | null = null;
  private clientId: string | null = null;
  private userId: string | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  
  // Event handlers
  private messageHandlers: MessageCallback[] = [];
  private typedMessageHandlers: MessageHandlerMap = {};
  private connectHandlers: ConnectCallback[] = [];
  private errorHandlers: ErrorCallback[] = [];
  private closeHandlers: CloseCallback[] = [];
  
  constructor(url?: string) {
    // Default WebSocket URL, using server URL from environment variable
    const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
    const wsUrl = serverUrl.replace(/^http/, 'ws');
    this.url = url || `${wsUrl}/ws`;
    
    // Automatically connect on initialization
    this.connect();
  }
  
  public connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) return;
    
    this.isConnecting = true;
    console.log(`Connecting to WebSocket server at ${this.url}`);
    
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }
  
  public disconnect(): void {
    if (!this.socket) return;
    
    this.socket.close(1000, 'Client disconnecting');
    this.socket = null;
    this.clientId = null;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.reconnectAttempts = 0;
  }
  
  public send(type: string, payload: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message, socket not connected');
      return false;
    }
    
    const message = JSON.stringify({ type, payload });
    this.socket.send(message);
    return true;
  }
  
  // Send a ping to keep the connection alive
  public ping(): void {
    this.send('ping', { timestamp: Date.now() });
  }
  
  // Identify the user to the server
  public identify(userId: string): void {
    this.userId = userId;
    this.send('identify', { userId });
  }
  
  // Subscribe to specific updates
  public subscribe(channel: string): void {
    this.send('subscribe', { channel });
  }
  
  // Check if the socket is connected
  public isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
  
  // Register generic message handler for all message types
  public onMessage(callback: MessageCallback): void {
    this.messageHandlers.push(callback);
  }
  
  // Register handler for specific message type
  public on(type: string, callback: TypedMessageCallback): void {
    if (!this.typedMessageHandlers[type]) {
      this.typedMessageHandlers[type] = [];
    }
    this.typedMessageHandlers[type].push(callback);
  }
  
  // Register connection handler
  public onConnect(callback: ConnectCallback): void {
    this.connectHandlers.push(callback);
    
    // If already connected, call the handler immediately
    if (this.isConnected()) {
      callback();
    }
  }
  
  // Register error handler
  public onError(callback: ErrorCallback): void {
    this.errorHandlers.push(callback);
  }
  
  // Register close handler
  public onClose(callback: CloseCallback): void {
    this.closeHandlers.push(callback);
  }
  
  // Event handlers
  private handleOpen(event: Event): void {
    console.log('WebSocket connection established');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Notify all connect handlers
    this.connectHandlers.forEach(handler => handler());
    
    // Start a ping interval to keep the connection alive
    this.pingInterval = setInterval(() => this.ping(), 30000);
    
    // Re-identify if we have a user ID
    if (this.userId) {
      this.identify(this.userId);
    }
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const { type, payload } = JSON.parse(event.data);
      
      // Handle connection message to store client ID
      if (type === 'connection' && payload?.clientId) {
        this.clientId = payload.clientId;
        console.log(`WebSocket client ID: ${this.clientId}`);
      }
      
      // Handle pong response from ping
      if (type === 'pong') {
        const latency = Date.now() - (payload?.timestamp || 0);
        console.debug(`WebSocket latency: ${latency}ms`);
      }
      
      // Notify typed message handlers
      if (type && this.typedMessageHandlers[type]) {
        this.typedMessageHandlers[type].forEach(handler => handler(payload));
      }
      
      // Notify generic message handlers
      this.messageHandlers.forEach(handler => handler(type, payload));
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    
    // Notify all error handlers
    this.errorHandlers.forEach(handler => handler(event));
    
    this.isConnecting = false;
  }
  
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    
    // Notify all close handlers
    this.closeHandlers.forEach(handler => handler(event));
    
    this.socket = null;
    this.isConnecting = false;
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached, giving up');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
}

// Singleton instance
let instance: WebSocketClient | null = null;

export const getWebSocketClient = (): WebSocketClient => {
  if (!instance) {
    instance = new WebSocketClient();
  }
  return instance;
};

export default getWebSocketClient;