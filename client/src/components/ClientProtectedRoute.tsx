import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface ClientProtectedRouteProps {
  children: React.ReactElement;
}

/**
 * Client protected route component that redirects to client selection page if no client is selected
 */
const ClientProtectedRoute: React.FC<ClientProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { selectedClientId, clients, loading } = useSelector((state: RootState) => state.clients);
  
  // Important debugging info
  console.log('ClientProtectedRoute check at', new Date().toISOString());
  console.log('- Path:', location.pathname);
  console.log('- SelectedClientId:', selectedClientId);
  console.log('- Clients loaded:', clients.length);
  console.log('- Client state loading:', loading);
  console.log('- State from location:', location.state);
  
  // Always allow access to client selection page
  if (location.pathname === '/client-selection') {
    console.log('- On client selection page, allowing access');
    return children;
  }
  
  // Special case for Generate page to ensure it works
  if (location.pathname === '/generate') {
    console.log('- On Generate page, checking client requirements');
    if (!selectedClientId && clients.length > 0) {
      console.log('- No client selected on Generate page, selecting first client');
      return <div>Initializing client for Generate page...</div>;
    }
  }
  
  // Only show loading if clients are actually loading and we have no clients yet
  // This prevents unnecessary loading screens when clients are already in state
  if (loading && clients.length === 0) {
    console.log('- Clients still loading and none cached, showing loading indicator');
    return <div>Loading client data...</div>;
  }
  
  // If no client is selected but clients are available, select the first one
  if (!selectedClientId && clients.length > 0) {
    console.log('- No client selected but clients available, selecting first client');
    // Instead of redirecting, we'll handle this in ClientProvider by selecting the first client
    // This prevents unnecessary redirects when clients are available
    return <div>Initializing client...</div>;
  }
  
  // If no client is selected and no clients are available, redirect to client selection page
  if (!selectedClientId) {
    console.log('- No client selected, redirecting to client selection page');
    // Redirect to client selection page, but save the location they were trying to access
    return <Navigate to="/client-selection" state={{ from: location }} replace />;
  }
  
  // Verify the client actually exists (extra safety check)
  const clientExists = clients.some(client => client.id === selectedClientId);
  if (!clientExists) {
    console.log('- Selected client ID not found in client list, redirecting');
    return <Navigate to="/client-selection" state={{ from: location }} replace />;
  }
  
  // Client is selected and valid, allow access to the route
  console.log('- Client validation passed, allowing access to protected route');
  return children;
};

export default ClientProtectedRoute;
