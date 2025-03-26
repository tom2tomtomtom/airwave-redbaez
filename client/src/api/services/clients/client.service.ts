import httpClient from '../../http-client';
import {
  Client,
  ClientFilters,
  ClientResponse,
  ClientsListResponse,
  CreateClientRequest,
  UpdateClientRequest
} from '../../types/client.types';

/**
 * Client Service - encapsulates all client-related API calls
 */
class ClientService {
  private static instance: ClientService;
  private baseUrl = '/clients';
  private selectedClientId: string | null = null;
  
  // Known working client ID from debug tools
  private FALLBACK_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

  private constructor() {
    // Initialize the selected client from localStorage
    this.selectedClientId = localStorage.getItem('selectedClientId');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ClientService {
    if (!ClientService.instance) {
      ClientService.instance = new ClientService();
    }
    return ClientService.instance;
  }
  
  // These methods are defined later in the class, so we'll remove them from here

  /**
   * Get clients with filtering, sorting and pagination
   */
  public async getClients(filters: ClientFilters = {}): Promise<Client[]> {
    try {
      // Make API request
      const response = await httpClient.get<Client[] | ClientsListResponse>(
        this.baseUrl, 
        filters
      );
      
      // Handle various response formats
      let clients: Client[] = [];
      
      if (Array.isArray(response)) {
        clients = response;
      } else if (response && typeof response === 'object' && 'clients' in response && Array.isArray(response.clients)) {
        clients = response.clients;
      } else if (response && typeof response === 'object' && 'data' in response) {
        // Handle case where response has a data property
        const data = response.data;
        if (Array.isArray(data)) {
          clients = data;
        } else if (typeof data === 'object' && data && 'clients' in data && Array.isArray(data.clients)) {
          clients = data.clients;
        }
      }
      
      return clients;
    } catch (error) {
      console.error('❌ ClientService: Error getting clients:', error);
      throw error;
    }
  }

  /**
   * Get a single client by ID
   */
  public async getClient(id: string): Promise<Client> {
    try {
      const client = await httpClient.get<Client>(`${this.baseUrl}/${id}`);
      return client;
    } catch (error) {
      console.error(`❌ ClientService: Error getting client ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new client
   */
  public async createClient(request: CreateClientRequest): Promise<Client> {
    try {
      const response = await httpClient.post<Client | ClientResponse>(
        this.baseUrl,
        request
      );
      
      // Handle response format
      if ('client' in response && response.client) {
        return response.client;
      }
      
      return response as Client;
    } catch (error) {
      console.error('❌ ClientService: Error creating client:', error);
      throw error;
    }
  }

  /**
   * Create or update a client based on whether it has an ID
   */
  public async createOrUpdateClient(client: Client): Promise<Client> {
    if (client.id) {
      return this.updateClient(client.id, client);
    } else {
      return this.createClient(client);
    }
  }

  /**
   * Update an existing client
   */
  public async updateClient(id: string, request: UpdateClientRequest): Promise<Client> {
    try {
      const response = await httpClient.put<Client | ClientResponse>(
        `${this.baseUrl}/${id}`,
        request
      );
      
      // Handle response format
      if ('client' in response && response.client) {
        return response.client;
      }
      
      return response as Client;
    } catch (error) {
      console.error(`❌ ClientService: Error updating client ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a client
   */
  public async deleteClient(id: string): Promise<boolean> {
    try {
      const response = await httpClient.delete<ClientResponse>(`${this.baseUrl}/${id}`);
      return response.success || false;
    } catch (error) {
      console.error(`❌ ClientService: Error deleting client ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get the currently selected client ID or fallback to known working ID
   */
  public getSelectedClientId(): string | null {
    return this.selectedClientId || this.FALLBACK_CLIENT_ID;
  }

  /**
   * Set the selected client ID
   */
  public setSelectedClientId(clientId: string): void {
    this.selectedClientId = clientId;
    localStorage.setItem('selectedClientId', clientId);
    
    // Dispatch a custom event so components can react to client changes
    window.dispatchEvent(new CustomEvent('clientChanged', { 
      detail: { clientId } 
    }));
  }

  /**
   * Clear the selected client
   */
  public clearSelectedClient(): void {
    this.selectedClientId = null;
    localStorage.removeItem('selectedClientId');
    
    window.dispatchEvent(new CustomEvent('clientChanged', { 
      detail: { clientId: null } 
    }));
  }
}

// Export singleton instance
export const clientService = ClientService.getInstance();

// Export default for convenience
export default clientService;
