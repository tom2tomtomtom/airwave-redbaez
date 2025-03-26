import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import { fetchClients, setSelectedClient } from '../store/slices/clientSlice';
import { Client } from '../types/client';
import axios from 'axios';

// Import client service to directly communicate with the API
import { clientService } from '../api/services/clients/client.service';
import { ClientFilters } from '../api/types/client.types';

// Type for API client to differentiate from application Client
type ApiClient = {
  id?: string;
  name: string;
  slug: string;
  logoUrl?: string;
  brandColour?: string;
  status?: string;
};

// Define our context shape with enhanced functionality
interface ClientContextType {
  // Core client data
  selectedClientId: string | null;
  selectedClient: Client | null;
  clients: Client[];
  loading: boolean;
  error: string | null;
  
  // Client selection
  setClient: (clientId: string) => void;
  clearSelectedClient: () => void;
  isClientRequired: (path: string) => boolean;
  
  // Client data operations
  refreshClients: (filters?: ClientFilters) => Promise<void>;
  createClient: (client: Partial<Client>) => Promise<Client>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<Client>;
  deleteClient: (clientId: string) => Promise<boolean>;
  
  // Client data access
  getClientBySlug: (slug: string) => Client | null;
  getClientById: (id: string) => Client | null;
  getFilteredClients: (filters: ClientFilters) => Client[];
  
  // Client data caching
  clientsLastUpdated: number | null;
  isCacheValid: boolean;
  invalidateCache: () => void;
  
  // Metadata and analytics
  getClientStatistics: (clientId: string) => Promise<any>;
  getRecentClientActivity: (clientId: string, limit?: number) => Promise<any[]>;
}

// Create context with default values
const ClientContext = createContext<ClientContextType | null>(null);

// List of paths that require a client to be selected
const clientRequiredPaths = [
  '/generate',
  '/strategy',
  '/briefs',
  '/campaigns',
  '/assets',
  '/templates',
  '/matrix',
  '/exports',
  '/analytics'
];

// Hook for easy context consumption
export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
};

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get client data from Redux
  const { clients, selectedClientId, loading } = useSelector((state: RootState) => state.clients);
  
  // Get authentication state
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  // Additional state for enhanced functionality
  const [error, setError] = useState<string | null>(null);
  const [clientsLastUpdated, setClientsLastUpdated] = useState<number | null>(null);
  const [clientCache, setClientCache] = useState<Record<string, Client>>({});
  const [clientStatistics, setClientStatistics] = useState<Record<string, any>>({});
  const [clientActivity, setClientActivity] = useState<Record<string, any[]>>({});
  
  // Calculate cache validity - consider cache valid for 5 minutes
  const isCacheValid = useMemo(() => {
    if (!clientsLastUpdated) return false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return clientsLastUpdated > fiveMinutesAgo;
  }, [clientsLastUpdated]);
  
  // Update client cache when clients change
  useEffect(() => {
    if (clients.length > 0) {
      const cache: Record<string, Client> = {};
      clients.forEach((client: Client) => {
        if (client.id) cache[client.id] = client;
        if (client.slug) cache[client.slug] = client;
      });
      setClientCache(cache);
      setClientsLastUpdated(Date.now());
    }
  }, [clients]);
  
  // Find the selected client object with optimized lookup
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clientCache[selectedClientId] || null;
  }, [selectedClientId, clientCache]);
  
  // Check if the current path requires a client
  const isClientRequired = (path: string): boolean => {
    return clientRequiredPaths.some(requiredPath => 
      path === requiredPath || path.startsWith(`${requiredPath}/`));
  };
  
  // Handle client selection
  const setClient = useCallback((clientId: string) => {
    console.log('Setting client:', clientId);
    dispatch(setSelectedClient(clientId));
    
    // Store in localStorage for persistence across sessions
    localStorage.setItem('airwave_selected_client', clientId);
    
    // Pre-fetch client statistics and activity for the selected client
    getClientStatistics(clientId).catch(err => console.error('Failed to load client statistics', err));
    getRecentClientActivity(clientId).catch(err => console.error('Failed to load client activity', err));
  }, [dispatch]);
  
  // Clear selected client
  const clearSelectedClient = useCallback(() => {
    dispatch(setSelectedClient(null));
    localStorage.removeItem('airwave_selected_client');
  }, [dispatch]);
  
  // Invalidate cache to force refresh
  const invalidateCache = useCallback(() => {
    setClientsLastUpdated(null);
  }, []);
  
  // Refresh clients with optional filters
  const refreshClients = useCallback(async (filters?: ClientFilters) => {
    try {
      setError(null);
      const refreshedClients = await clientService.getClients(filters || {});
      dispatch({ type: 'clients/setClients', payload: refreshedClients });
      setClientsLastUpdated(Date.now());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh clients';
      setError(errorMessage);
      console.error('Failed to refresh clients:', err);
      throw err;
    }
  }, [dispatch]);
  
  // Create a new client
  const createClient = useCallback(async (client: Partial<Client>) => {
    try {
      setError(null);
      // Ensure required fields are present
      if (!client.name) {
        throw new Error('Client name is required');
      }
      
      // Create client with API service and convert types as needed
      const apiClient: ApiClient = {
        ...client as any,
        // Map between different field names as needed
        status: client.isActive ? 'active' : 'inactive'
      };
      
      const newClient = await clientService.createClient(apiClient);
      await refreshClients();
      
      // Convert API client type to application Client type if needed
      const resultClient: Client = {
        ...newClient as any,
        // Ensure all required fields from Client interface are present
        id: newClient.id,
        slug: newClient.slug,
        name: newClient.name,
        // Map status to isActive boolean
        isActive: newClient.status === 'active',
        createdAt: newClient.createdAt || new Date().toISOString(),
        updatedAt: newClient.updatedAt || new Date().toISOString()
      };
      
      return resultClient;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create client';
      setError(errorMessage);
      console.error('Failed to create client:', err);
      throw err;
    }
  }, [refreshClients]);
  
  // Update an existing client
  const updateClient = useCallback(async (clientId: string, updates: Partial<Client>) => {
    try {
      setError(null);
      // Convert to API type if needed
      const apiUpdates: Partial<ApiClient> = { 
        ...updates as any,
        // Map isActive to status if present
        ...(updates.isActive !== undefined ? { status: updates.isActive ? 'active' : 'inactive' } : {})
      };
      
      const updatedApiClient = await clientService.updateClient(clientId, apiUpdates);
      await refreshClients();
      
      // Convert back to application Client type
      const resultClient: Client = {
        ...updatedApiClient as any,
        // Ensure all required fields from Client interface are present
        id: updatedApiClient.id,
        slug: updatedApiClient.slug,
        name: updatedApiClient.name,
        // Map status to isActive boolean
        isActive: updatedApiClient.status === 'active',
        createdAt: updatedApiClient.createdAt || new Date().toISOString(),
        updatedAt: updatedApiClient.updatedAt || new Date().toISOString()
      };
      
      return resultClient;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update client';
      setError(errorMessage);
      console.error(`Failed to update client ${clientId}:`, err);
      throw err;
    }
  }, [refreshClients]);
  
  // Delete a client
  const deleteClient = useCallback(async (clientId: string) => {
    try {
      setError(null);
      await clientService.deleteClient(clientId);
      
      // If we just deleted the selected client, clear the selection
      if (selectedClientId === clientId) {
        clearSelectedClient();
      }
      
      await refreshClients();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete client';
      setError(errorMessage);
      console.error(`Failed to delete client ${clientId}:`, err);
      throw err;
    }
  }, [selectedClientId, clearSelectedClient, refreshClients]);
  
  // Get client by slug
  const getClientBySlug = useCallback((slug: string) => {
    return clients.find((client: Client) => client.slug === slug) || null;
  }, [clients]);
  
  // Get client by ID
  const getClientById = useCallback((id: string) => {
    return clients.find((client: Client) => client.id === id) || null;
  }, [clients]);
  
  // Get filtered clients
  const getFilteredClients = useCallback((filters: ClientFilters) => {
    let filtered = [...clients];
    
    // Apply filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(search) ||
        client.slug.toLowerCase().includes(search) ||
        (client.description && client.description.toLowerCase().includes(search))
      );
    }
    
    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        const key = filters.sortBy as keyof Client;
        const aValue = a[key];
        const bValue = b[key];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return filters.sortDirection === 'desc' 
            ? bValue.localeCompare(aValue) 
            : aValue.localeCompare(bValue);
        }
        
        return 0;
      });
    }
    
    return filtered;
  }, [clients]);
  
  // Get client statistics
  const getClientStatistics = useCallback(async (clientId: string) => {
    try {
      // Check if we already have cached statistics for this client
      if (clientStatistics[clientId] && isCacheValid) {
        return clientStatistics[clientId];
      }
      
      // Fetch client statistics from API
      const response = await axios.get(`/api/clients/${clientId}/statistics`);
      const stats = response.data;
      
      // Update cache
      setClientStatistics(prev => ({
        ...prev,
        [clientId]: stats
      }));
      
      return stats;
    } catch (err) {
      console.error(`Failed to get statistics for client ${clientId}:`, err);
      throw err;
    }
  }, [clientStatistics, isCacheValid]);
  
  // Get recent client activity
  const getRecentClientActivity = useCallback(async (clientId: string, limit = 10) => {
    try {
      // Check if we already have cached activity for this client
      if (clientActivity[clientId] && isCacheValid) {
        return clientActivity[clientId].slice(0, limit);
      }
      
      // Fetch recent activity from API
      const response = await axios.get(`/api/clients/${clientId}/activity?limit=${limit}`);
      const activity = response.data;
      
      // Update cache
      setClientActivity(prev => ({
        ...prev,
        [clientId]: activity
      }));
      
      return activity;
    } catch (err) {
      console.error(`Failed to get activity for client ${clientId}:`, err);
      throw err;
    }
  }, [clientActivity, isCacheValid]);
  
  // Initial client loading
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Authenticated, checking for clients...');
      
      // Fetch clients if we don't have any
      if (clients.length === 0 && !loading) {
        console.log('No clients in state, fetching...');
        dispatch(fetchClients());
      }
      
      // Check for stored client ID
      const storedClientId = localStorage.getItem('airwave_selected_client');
      
      // If we have a stored ID and clients are loaded
      if (storedClientId && clients.length > 0) {
        // Check if stored client exists in our list
        const clientExists = clients.some((client: Client) => (client.id || client.slug) === storedClientId);
        
        if (clientExists && selectedClientId !== storedClientId) {
          // Stored client exists but isn't selected - select it
          console.log('Found stored client, selecting:', storedClientId);
          dispatch(setSelectedClient(storedClientId));
        } else if (!clientExists) {
          // Stored client doesn't exist, default to first available
          console.log('Stored client not found, defaulting to first client');
          const firstClientId = clients[0]?.id || clients[0]?.slug;
          if (firstClientId) {
            dispatch(setSelectedClient(firstClientId));
            localStorage.setItem('airwave_selected_client', firstClientId);
          }
        }
      } 
      // If no stored ID but we have clients and none selected
      else if (clients.length > 0 && !selectedClientId) {
        // Auto-select first client
        console.log('No selected client, selecting first client');
        const firstClientId = clients[0]?.id || clients[0]?.slug;
        if (firstClientId) {
          dispatch(setSelectedClient(firstClientId));
          localStorage.setItem('airwave_selected_client', firstClientId);
        }
      }
    }
  }, [isAuthenticated, clients.length, selectedClientId, dispatch]);
  
  // Handle routing based on client selection
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const currentPath = location.pathname;
    console.log('Current path:', currentPath, 'Client required:', isClientRequired(currentPath));
    
    // Skip redirections for client selection page
    if (currentPath === '/client-selection') return;
    
    // Only handle protected paths
    if (isClientRequired(currentPath)) {
      if (clients.length === 0 && !loading) {
        // No clients after loading finished, redirect to client selection
        console.log('No clients available, redirecting to client selection');
        navigate('/client-selection', { state: { from: location } });
        return;
      }
      
      if (!selectedClientId && clients.length > 0) {
        // We have clients but none selected - auto-select first
        console.log('Auto-selecting first client for protected route');
        const firstClientId = clients[0]?.id || clients[0]?.slug;
        if (firstClientId) {
          dispatch(setSelectedClient(firstClientId));
          localStorage.setItem('airwave_selected_client', firstClientId);
          // Don't redirect - component will re-render with client selected
        }
      }
    }
  }, [
    location, 
    selectedClientId, 
    clients, 
    loading, 
    isAuthenticated, 
    navigate, 
    dispatch
  ]);
  
  // Provide client context to children with enhanced functionality
  return (
    <ClientContext.Provider value={{
      // Core client data
      selectedClientId,
      selectedClient,
      clients: clients as Client[],
      loading,
      error,
      
      // Client selection
      setClient,
      clearSelectedClient,
      isClientRequired,
      
      // Client data operations
      refreshClients,
      createClient,
      updateClient,
      deleteClient,
      
      // Client data access
      getClientBySlug,
      getClientById,
      getFilteredClients,
      
      // Client data caching
      clientsLastUpdated,
      isCacheValid,
      invalidateCache,
      
      // Metadata and analytics
      getClientStatistics,
      getRecentClientActivity
    }}>
      {children}
    </ClientContext.Provider>
  );
};

export default ClientProvider;
