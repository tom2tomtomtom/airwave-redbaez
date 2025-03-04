import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

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