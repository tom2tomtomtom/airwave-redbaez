import { useState, useEffect, useRef } from 'react';
import getWebSocketClient, { WebSocketClient } from '../utils/websocketClient';

interface WebSocketMessage {
  data: string;
  type: string;
  target: string;
}

/**
 * A hook for connecting to WebSockets and handling messages
 * 
 * @param channel The WebSocket channel to connect to
 * @returns An object with the last message received and a function to send messages
 */
export const useWebSocket = (channel: string) => {
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketClient = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const client = getWebSocketClient();
    socketClient.current = client;

    // Handle messages from the socket
    const messageHandler = (type: string, data: any) => {
      try {
        // Filter messages by channel if specified
        const message = typeof data === 'string' ? JSON.parse(data) : data;
        
        if (!channel || (message.target && message.target === channel)) {
          setLastMessage({
            data: typeof message === 'string' ? message : JSON.stringify(message),
            type: type,
            target: message.target || channel
          });
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    // Register message handler
    if (socketClient.current) {
      socketClient.current.onMessage(messageHandler);
    }

    // Clean up
    return () => {
      if (socketClient.current) {
        socketClient.current.offMessage(messageHandler);
      }
    };
  }, [channel]);

  // Function to send messages through the WebSocket
  const sendMessage = (message: any) => {
    if (socketClient.current) {
      const payload = typeof message === 'string' 
        ? message 
        : {
            ...message,
            target: channel // Add the channel to the message
          };
      
      socketClient.current.send('message', payload);
    } else {
      console.error('WebSocket client is not initialized');
    }
  };

  return { lastMessage, sendMessage };
};
