/**
 * WebSocket connection monitor
 * This utility logs events from the WebSocketClient to help debug connection issues
 */

import getWebSocketClient from './websocketClient';

// Enable/disable based on development or production environment
const MONITOR_WEBSOCKETS = process.env.NODE_ENV === 'development';

// Store original WebSocket constructor
const OriginalWebSocket = window.WebSocket;

// Override WebSocket constructor to add logging
window.WebSocket = function(url, protocols) {
  console.log('WebSocket connection attempt to:', url);
  
  // Create the actual WebSocket
  const socket = new OriginalWebSocket(url, protocols);
  
  // Log socket events
  socket.addEventListener('open', () => {
    console.log('WebSocket connected successfully to:', url);
  });
  
  socket.addEventListener('error', (error) => {
    console.error('WebSocket connection error to:', url, error);
  });
  
  socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', url, event.code, event.reason);
  });
  
  return socket;
};

let initialized = false;

export const initSocketMonitor = () => {
  if (initialized || !MONITOR_WEBSOCKETS) return;
  
  console.log('Socket Monitor initialized');
  
  // Get the WebSocket client instance
  const wsClient = getWebSocketClient();
  
  // Add event listeners for monitoring
  wsClient.onConnect(() => {
    console.log('SocketMonitor: Connection established');
  });
  
  wsClient.onClose((event) => {
    console.log(`SocketMonitor: Connection closed - Code: ${event.code}, Reason: ${event.reason || 'None'}`);
  });
  
  wsClient.onError((error) => {
    console.error('SocketMonitor: Connection error', error);
  });
  
  // Monitor render status updates
  wsClient.on('renderStatus', (payload) => {
    console.log('SocketMonitor: Render status update:', payload);
  });
  
  // Set up periodic connection checks
  setInterval(() => {
    if (!wsClient.isConnected()) {
      console.log('SocketMonitor: Connection check failed, attempting reconnect...');
      wsClient.connect();
    }
  }, 60000); // Check every minute
  
  // Set up status reporting
  if (process.env.NODE_ENV === 'development') {
    window._socketDebug = {
      getStatus: () => ({
        connected: wsClient.isConnected(),
        reconnect: () => wsClient.connect(),
        disconnect: () => wsClient.disconnect(),
      }),
    };
    
    console.log('SocketMonitor: Debug interface available at window._socketDebug');
  }
  
  initialized = true;
};

export default initSocketMonitor;