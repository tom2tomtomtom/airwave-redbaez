/**
 * EventBus
 * 
 * A simple implementation of the publish/subscribe pattern
 * to facilitate communication between components without tight coupling.
 */
export class EventBus {
  private static instance: EventBus;
  private subscribers: Record<string, Array<(data: any) => void>> = {};
  
  private constructor() {
    // Private constructor to enforce singleton pattern
  }
  
  /**
   * Get the singleton instance of EventBus
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  /**
   * Subscribe to an event
   * 
   * @param eventName - Name of the event to subscribe to
   * @param callback - Function to call when event is published
   * @returns Unsubscribe function
   */
  public subscribe(eventName: string, callback: (data: any) => void): () => void {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = [];
    }
    
    this.subscribers[eventName].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers[eventName] = this.subscribers[eventName]
        .filter(sub => sub !== callback);
    };
  }
  
  /**
   * Publish an event with data
   * 
   * @param eventName - Name of the event to publish
   * @param data - Data to pass to subscribers
   */
  public publish(eventName: string, data: any): void {
    if (!this.subscribers[eventName]) {
      return;
    }
    
    this.subscribers[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event subscriber for ${eventName}:`, error);
      }
    });
  }
  
  /**
   * Check if an event has subscribers
   * 
   * @param eventName - Name of the event to check
   * @returns True if the event has subscribers
   */
  public hasSubscribers(eventName: string): boolean {
    return !!this.subscribers[eventName] && this.subscribers[eventName].length > 0;
  }
  
  /**
   * Clear all subscribers for an event
   * 
   * @param eventName - Name of the event to clear subscribers for
   */
  public clearSubscribers(eventName: string): void {
    this.subscribers[eventName] = [];
  }
  
  /**
   * Clear all subscribers for all events
   */
  public clearAllSubscribers(): void {
    this.subscribers = {};
  }
}

export default EventBus;
