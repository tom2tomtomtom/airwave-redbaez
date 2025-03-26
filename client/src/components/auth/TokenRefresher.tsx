import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { refreshToken, setCredentials } from '../../store/slices/authSlice';
import { supabase } from '../../lib/supabase';

// Development mode detection
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true';

/**
 * TokenRefresher - A simplified component that periodically checks and refreshes the auth token
 * This runs in the background and prevents token expiration issues
 */
const TokenRefresher: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // In development mode, create a stable mock token and skip all refresh logic
    if (isDevelopment) {
      console.log('[DEV] TokenRefresher: Development mode detected, skipping token refresh');
      
      // Set up a fake development token if needed
      const currentToken = localStorage.getItem('airwave_auth_token');
      if (!currentToken) {
        console.log('[DEV] TokenRefresher: Creating development token');
        const devToken = 'dev_mock_token_stable_' + Date.now();
        localStorage.setItem('airwave_auth_token', devToken);
        
        // Update axios headers
        const axios = require('axios').default;
        axios.defaults.headers.common['Authorization'] = `Bearer ${devToken}`;
      }
      
      return; // Exit early in development mode
    }
    
    console.log('TokenRefresher: Setting up token refresh');
    
    // Get the current token from localStorage
    const currentToken = localStorage.getItem('airwave_auth_token');
    
    // If no token in localStorage but we're considered authenticated, fix this inconsistency
    if (!currentToken) {
      console.warn('TokenRefresher: No token in localStorage but user is authenticated');
      // We'll continue anyway as getSession below will check if we have a valid session
    }
    
    // Do an immediate check of the session to ensure it's valid
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (!data?.session) {
          console.warn('TokenRefresher: No active session found, but we are authenticated');
          
          // Try to get a new session via refreshToken
          const refreshResult = await dispatch(refreshToken()).unwrap();
          
          if (!refreshResult?.session) {
            console.error('TokenRefresher: Failed to refresh token, redirecting to login');
            // Clear localStorage and return
            localStorage.removeItem('airwave_auth_token');
            window.location.href = '/login';
            return;
          }
          
          // Success! We have a new session
          console.log('TokenRefresher: Successfully refreshed token');
          return;
        }
        
        // Store the valid token (in case localStorage was cleared)
        localStorage.setItem('airwave_auth_token', data.session.access_token);
        
        // Update Redux with the latest session
        if (user) {
          dispatch(setCredentials({
            user,
            session: data.session
          }));
        }
      } catch (error) {
        console.error('TokenRefresher: Error checking session:', error);
      }
    };
    
    // Check immediately and set up refresh interval
    checkSession();
    
    // Set up a refresh interval (every 15 minutes)
    const refreshInterval = 15 * 60 * 1000; // 15 minutes
    
    refreshTimerRef.current = setInterval(() => {
      // Simply dispatch the refresh action which handles token refresh logic
      dispatch(refreshToken());
    }, refreshInterval);
    
    // Clean up on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [isAuthenticated, dispatch, user]);

  // This component doesn't render anything
  return null;
};

export default TokenRefresher;
