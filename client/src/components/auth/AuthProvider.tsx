import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CircularProgress, Box, Typography } from '@mui/material';
import axios from 'axios';

// Define the auth context type
interface AuthContextType {
  session: any | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true';

// Create a stable mock session for development
const createDevSession = () => {
  const currentTime = Math.floor(Date.now() / 1000);
  const thirtyDaysLater = currentTime + (30 * 24 * 60 * 60);
  
  return {
    access_token: `dev_mock_token_${currentTime}`,
    expires_at: thirtyDaysLater,
    refresh_token: `dev_mock_refresh_${currentTime}`,
    user: {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'admin@airwave.dev',
      user_metadata: {
        name: 'Development Admin',
        role: 'admin',
        organisationId: null
      }
    }
  };
};

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Function to refresh the session
  const refreshSession = async () => {
    try {
      // In development mode, always return a valid session
      if (isDevelopment) {
        console.log('[DEV] Using mock session instead of refreshing');
        const devSession = createDevSession();
        setSession(devSession);
        return;
      }
      
      console.log('Refreshing auth session...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing session:', error.message);
        throw error;
      }
      
      if (data?.session) {
        console.log('Session refreshed successfully', {
          userId: data.session.user.id,
          expires: data.session.expires_at ? new Date(data.session.expires_at * 1000).toLocaleString() : 'unknown',
        });
        setSession(data.session);
        
        // Store the refreshed session in localStorage for backup
        localStorage.setItem('airwave_auth_token', data.session.access_token);
        if (data.session.expires_at) {
          localStorage.setItem('airwave_token_expires', data.session.expires_at.toString());
        }
      } else {
        console.warn('No valid session found during refresh');
        setSession(null);
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      setSession(null);
    }
  };

  // Function to sign out
  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    localStorage.removeItem('airwave_auth_token');
    localStorage.removeItem('airwave_token_expires');
    setSession(null);
    setIsLoading(false);
    navigate('/login');
  };

  // Effect to set up session listener
  useEffect(() => {
    // Get initial session
    const checkSession = async () => {
      setIsLoading(true);
      try {
        // In development mode, always use a mock session
        if (isDevelopment) {
          console.log('[DEV] Authentication bypass active - using mock session');
          const devSession = createDevSession();
          
          // Store token in localStorage
          localStorage.setItem('airwave_auth_token', devSession.access_token);
          
          // Set up axios headers - use the imported axios
          axios.defaults.headers.common['Authorization'] = `Bearer ${devSession.access_token}`;
          
          // Also set the Juniper client ID for testing
          localStorage.setItem('selectedClientId', 'fd790d19-6610-4cd5-b90f-214808e94a19');
          
          setSession(devSession);
          setIsLoading(false);
          return;
        }
        
        // Normal authentication flow for production
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data?.session) {
          console.log('Auth session found', { 
            userId: data.session.user.id,
            expires: data.session.expires_at ? new Date(data.session.expires_at * 1000).toLocaleString() : 'unknown'
          });
          setSession(data.session);
          
          // Check if token will expire soon (within 1 hour)
          if (data.session.expires_at) {
            const expiresAt = data.session.expires_at * 1000;
            const now = Date.now();
            const oneHour = 60 * 60 * 1000;
            
            if (expiresAt - now < oneHour) {
            console.log('Token expires soon, refreshing...');
            // Use refresh token to get a new session
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData?.session) {
              setSession(refreshData.session);
              localStorage.setItem('airwave_auth_token', refreshData.session.access_token);
              if (refreshData.session.expires_at) {
                localStorage.setItem('airwave_token_expires', refreshData.session.expires_at.toString());
              }
            }
            }
          }
        } else {
          console.warn('No active session found, redirecting to login');
          setSession(null);
          
          // Only redirect to login if on a protected route
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/reset-password') {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        setSession(null);
        
        // Redirect to login if not already there
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/reset-password') {
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('airwave_auth_token');
          localStorage.removeItem('airwave_token_expires');
          navigate('/login');
        } else if (event === 'SIGNED_IN' && session) {
          localStorage.setItem('airwave_auth_token', session.access_token);
          if (session.expires_at) {
            localStorage.setItem('airwave_token_expires', session.expires_at.toString());
          }
        }
      }
    );

    // Clean up the listener
    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [navigate]);

  // Provide loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Checking authentication status...
        </Typography>
      </Box>
    );
  }

  // Provide auth context value
  const value = {
    session,
    isLoading,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// HOC to require authentication for a component
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props) => {
    const { session, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!isLoading && !session) {
        navigate('/login');
      }
    }, [session, isLoading, navigate]);

    if (isLoading) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Authenticating...
          </Typography>
        </Box>
      );
    }

    if (!session) {
      return null;
    }

    return <Component {...props} />;
  };
};

export default AuthProvider;
