import React, { useEffect, createContext, useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchClients, setSelectedClient } from '../store/slices/clientSlice';

interface ClientContextType {
  selectedClientId: string | null;
  clientRequired: (path: string) => boolean;
  checkClientSelected: (path: string) => boolean;
}

const ClientContext = createContext<ClientContextType | null>(null);

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
};

// List of routes that require a client to be selected
const clientRequiredPaths = [
  '/generate',
  '/briefs/strategy-development', // Corrected from '/strategy'
  '/briefs',
  '/campaigns',
  '/assets',
  '/templates',
  '/matrix',
  '/exports',
  '/analytics',
  '/client-dashboard' // Added this to ensure it requires a client
];

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  
  const { selectedClientId, clients } = useSelector((state: RootState) => state.clients);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  // Check if a path requires client selection
  const clientRequired = (path: string): boolean => {
    // First check for exact matches
    if (clientRequiredPaths.includes(path)) return true;
    
    // Then check for child paths
    return clientRequiredPaths.some(requiredPath => 
      path.startsWith(`${requiredPath}/`));
  };
  
  // Check if client is selected, return true if selected or path doesn't require client
  const checkClientSelected = (path: string): boolean => {
    if (!clientRequired(path)) return true;
    return !!selectedClientId;
  };
  
  // Initialize client selection on mount
  useEffect(() => {
    if (isAuthenticated) {
      // Load saved client ID from localStorage
      const savedClientId = localStorage.getItem('airwave_selected_client');
      
      // Ensure the selected client exists in our client list
      if (savedClientId && clients.some(client => client.id === savedClientId)) {
        // Client exists, ensure it's selected in Redux
        if (selectedClientId !== savedClientId) {
          dispatch(setSelectedClient(savedClientId));
        }
      } else if (clients.length > 0 && !selectedClientId) {
        // No valid selected client, default to first available
        // Always use client ID for consistency
        if (clients[0]?.id) {
          console.log('Selecting first client by ID:', clients[0].id);
          dispatch(setSelectedClient(clients[0].id));
          localStorage.setItem('airwave_selected_client', clients[0].id);
        } else {
          console.warn('Cannot select first client - ID is undefined');
        }
      }
      
      // Fetch clients if we don't have any
      if (clients.length === 0) {
        dispatch(fetchClients());
      }
    }
  }, [isAuthenticated, clients, selectedClientId, dispatch]);
  
  // Enforce client selection for protected paths
  useEffect(() => {
    const currentPath = location.pathname;
    console.log('ClientProvider path check:', currentPath, 'Client required:', clientRequired(currentPath));
    console.log('Clients available:', clients.length, 'Selected client ID:', selectedClientId);
    
    if (isAuthenticated) {
          // Always allow navigation to client selection page
      if (currentPath === '/client-selection') {
        console.log('Allowing navigation to client selection page');
        return; // Don't interfere with client selection page navigation
      }
      else {
        // Only handle client selection if on a protected path
        if (clientRequired(currentPath)) {
          // Case 1: No client selected but clients are available - select first one
          if (!selectedClientId && clients.length > 0) {
            const firstClientId = clients[0]?.id;
            if (firstClientId) {
              console.log('Auto-selecting first client by ID:', firstClientId);
              dispatch(setSelectedClient(firstClientId));
              localStorage.setItem('airwave_selected_client', firstClientId);
              // No redirection needed - the component will re-render with selected client
            } else {
              console.warn('Cannot select first client - ID is undefined');
              navigate('/client-selection', { state: { from: location } });
            }
          }
          // Case 2: No clients available at all - redirect to client selection
          else if (!selectedClientId && clients.length === 0) {
            console.log('No clients available and path requires client, redirecting to client selection');
            navigate('/client-selection', { state: { from: location } });
          }
          // Case 3: Client is selected but not in the list - select first available
          else if (selectedClientId && !clients.some(client => client.id === selectedClientId) && clients.length > 0) {
            console.log('Selected client not in list, selecting first available client');
            const firstClientId = clients[0]?.id;
            if (firstClientId) {
              dispatch(setSelectedClient(firstClientId));
              localStorage.setItem('airwave_selected_client', firstClientId);
            } else {
              navigate('/client-selection', { state: { from: location } });
            }
          }
        }
      }
    }
  }, [location.pathname, selectedClientId, clients, isAuthenticated, dispatch, navigate]);

  
  const value = {
    selectedClientId,
    clientRequired,
    checkClientSelected
  };
  
  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
};

export default ClientProvider;
