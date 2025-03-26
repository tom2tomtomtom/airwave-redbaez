import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

// Development mode detection
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true';
console.log('[DEV] Development mode for auth bypass:', isDevelopment);

interface ProtectedRouteProps {
  children: React.ReactElement;
  adminOnly?: boolean;
}

/**
 * Protected route component that redirects to login page if user is not authenticated
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  adminOnly = false 
}) => {
  const location = useLocation();
  const { isAuthenticated, loading, user } = useSelector((state: RootState) => state.auth);
  
  // In development mode, always allow access
  if (isDevelopment) {
    console.log('[DEV] Authentication bypass active - allowing access to protected route');
    
    // Set a fake token if one doesn't exist
    if (!localStorage.getItem('airwave_auth_token')) {
      console.log('[DEV] Setting development auth token');
      localStorage.setItem('airwave_auth_token', 'dev_token_' + Date.now());
      
      // Set client ID for testing
      localStorage.setItem('selectedClientId', 'fd790d19-6610-4cd5-b90f-214808e94a19');
    }
    
    return children;
  }
  
  // If auth state is still loading, return null or a loading indicator
  if (loading) {
    return null;
  }
  
  // Check if user is authenticated
  if (!isAuthenticated) {
    // Redirect to login page, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If route requires admin privileges, check user role
  if (adminOnly && user?.role !== 'admin') {
    // Redirect to dashboard with unauthorized message
    return <Navigate to="/dashboard" replace />;
  }
  
  // If authenticated and authorized, render the children
  return children;
};

export default ProtectedRoute;