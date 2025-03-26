import { useState, useEffect, useCallback } from 'react';
import { clientService } from '../api/services/clients/client.service';
import { Client, ClientFilters } from '../api/types/client.types';

/**
 * Custom hook for client selection and management
 * 
 * @param initialFilters - Optional initial filters to apply
 */
export function useClients(initialFilters?: ClientFilters) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    clientService.getSelectedClientId()
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClientFilters>(initialFilters || {});

  /**
   * Load clients with filters
   * @param customFilters - Optional custom filters to apply for this request only
   */
  const loadClients = useCallback(async (customFilters?: ClientFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use custom filters or current state
      const filtersToUse = customFilters || filters;
      
      // Log for debugging
      console.log('🔄 useClients: Loading clients with filters:', filtersToUse);
      
      const fetchedClients = await clientService.getClients(filtersToUse);
      setClients(fetchedClients);
      
      console.log(`✅ useClients: Loaded ${fetchedClients.length} clients`);
      
      // Update stored filters if custom filters were provided
      if (customFilters) {
        setFilters(filtersToUse);
      }
      
      // If we don't have a selected client yet, select the first one from the list
      if (!selectedClientId && fetchedClients.length > 0) {
        selectClient(fetchedClients[0].id);
      }
    } catch (err) {
      console.error('❌ useClients: Error loading clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [filters, selectedClientId]);

  /**
   * Select a client and persist the selection
   * @param clientId - ID of the client to select
   */
  const selectClient = useCallback((clientId: string) => {
    clientService.setSelectedClientId(clientId);
    setSelectedClientId(clientId);
  }, []);

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  /**
   * Get the currently selected client object
   */
  const getSelectedClient = useCallback(() => {
    return clients.find(client => client.id === selectedClientId) || null;
  }, [clients, selectedClientId]);
  
  /**
   * Clear the selected client
   */
  const clearSelectedClient = useCallback(() => {
    clientService.clearSelectedClient();
    setSelectedClientId(null);
  }, []);
  
  /**
   * Create or update a client
   */
  const createOrUpdateClient = useCallback(async (client: Client) => {
    try {
      setLoading(true);
      setError(null);
      const result = await clientService.createOrUpdateClient(client);
      
      // Refresh the client list
      await loadClients();
      
      return result;
    } catch (err) {
      console.error('❌ useClients: Error creating/updating client:', err);
      setError(err instanceof Error ? err.message : 'Failed to save client');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadClients]);

  return {
    // State
    clients,
    loading,
    error,
    selectedClientId,
    selectedClient: getSelectedClient(),
    
    // Actions
    selectClient,
    clearSelectedClient,
    loadClients,
    getSelectedClient,
    createOrUpdateClient
  };
}
