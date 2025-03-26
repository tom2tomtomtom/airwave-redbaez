import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { supabase } from '../../lib/supabase';

// Set default base URL for API requests
axios.defaults.baseURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organisationId?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Initialize auth state - check if we have an active Supabase session
const getInitialState = (): AuthState => {
  const storedToken = localStorage.getItem('airwave_auth_token');
  const isDev = process.env.NODE_ENV === 'development';
  const useDevLogin = process.env.REACT_APP_USE_DEV_LOGIN === 'true';
  
  // In development mode with dev login, we can pre-populate with a mock user
  if (isDev && useDevLogin && storedToken) {
    console.log('Development mode: Using mock user in initial state');
    return {
      isAuthenticated: true,
      user: {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'dev@example.com',
        name: 'Development User',
        role: 'admin'
      },
      token: storedToken,
      loading: false, // Don't need to check auth state
      error: null,
    };
  }
  
  // Normal flow
  return {
    isAuthenticated: !!storedToken,
    user: null,
    token: storedToken,
    loading: true, // Start with loading true to check auth state
    error: null,
  };
};

const initialState: AuthState = getInitialState();

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // Check for development mode flag
      if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true') {
        console.log('Using development login endpoint');
        
        try {
          // Try to use the dev-login endpoint
          const response = await axios.post('/api/auth/dev-login');
          
          if (response.data && response.data.success && response.data.data) {
            console.log('Development login successful', response.data.data.user.id);
            return {
              user: response.data.data.user,
              session: response.data.data.session
            };
          }
        } catch (devLoginError) {
          console.log('Development login failed, falling back to standard auth');
          // If dev login fails, continue to standard login
        }
      }
      
      console.log('Attempting login with Supabase, email:', email);
      
      // Standard Supabase sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Supabase login error:', error.message);
        return rejectWithValue(error.message);
      }
      
      if (!data || !data.user || !data.session) {
        console.error('No user or session returned from Supabase');
        return rejectWithValue('Authentication failed');
      }
      
      console.log('Supabase login successful', data.user.id);
      
      // Also notify our server about successful login to sync any custom data
      await axios.post('/api/auth/session', { 
        session: data.session, 
        user: data.user 
      });
      
      // Return user and session
      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || 'User',
          role: data.user.user_metadata?.role || 'user'
        },
        session: data.session
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      console.log('Attempting registration with Supabase, email:', email);
      
      // Use Supabase auth directly with standard flow
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'user'
          },
          emailRedirectTo: window.location.origin + '/auth/callback'
        }
      });
      
      // Handle any errors
      if (error) {
        console.error('Supabase registration error:', error.message);
        return rejectWithValue(error.message);
      }
      
      if (!data || !data.user) {
        console.error('No user returned from Supabase');
        return rejectWithValue('Registration failed');
      }
      
      console.log('Supabase registration successful', data.user.id);
      
      // Also notify our server about new user to set up any custom data
      await axios.post('/api/auth/register-complete', { 
        user: data.user 
      });
      
      // Return user and session
      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name,
          role: 'user'
        },
        session: data.session
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Logging out from Supabase');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out from Supabase:', error.message);
        return rejectWithValue(error.message);
      }
      
      console.log('Successfully logged out from Supabase');
      return null;
    } catch (error: any) {
      console.error('Logout error:', error);
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      // Check for development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true';
      
      // In development mode, create and return a mock session
      if (isDevelopment) {
        console.log('[DEV] Bypassing token refresh with mock session');
        
        // Create a stable dev token
        const devToken = localStorage.getItem('airwave_auth_token') || `dev_token_${Date.now()}`;
        
        // Store it if it doesn't exist
        if (!localStorage.getItem('airwave_auth_token')) {
          localStorage.setItem('airwave_auth_token', devToken);
        }
        
        // Set a client ID if needed
        if (!localStorage.getItem('selectedClientId')) {
          localStorage.setItem('selectedClientId', 'fd790d19-6610-4cd5-b90f-214808e94a19');
        }
        
        // Update axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${devToken}`;
        
        // Return a mock user and session
        return {
          user: {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'admin@airwave.dev',
            name: 'Development Admin',
            role: 'admin',
            organisationId: null
          },
          session: {
            access_token: devToken,
            expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
            refresh_token: `dev_refresh_${Date.now()}`
          }
        };
      }
      
      console.log('Attempting to refresh authentication token...');
      
      // Try to refresh the session with Supabase
      console.log('Calling supabase.auth.refreshSession()');
      const { data, error } = await supabase.auth.refreshSession();
      console.log('Refresh result:', data ? 'Success' : 'No data', error ? `Error: ${error.message}` : 'No error');
      
      if (error) {
        console.error('Token refresh error:', error.message);
        return rejectWithValue(error.message);
      }
      
      if (!data || !data.session) {
        console.error('No session returned when refreshing token');
        return rejectWithValue('Failed to refresh token');
      }
      
      console.log('Token refreshed successfully');
      
      // Store the refreshed token in localStorage
      localStorage.setItem('airwave_auth_token', data.session.access_token);
      
      // Update axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.session.access_token}`;
      
      // Get user data from our API
      try {
        const response = await axios.get('/api/auth/me');
        return {
          user: response.data.data,
          session: data.session
        };
      } catch (apiError) {
        // If our API call fails, still return the Supabase user data
        return {
          user: {
            id: data.user?.id || '',
            email: data.user?.email || '',
            name: data.user?.user_metadata?.name || 'User',
            role: data.user?.user_metadata?.role || 'user',
            organisationId: data.user?.user_metadata?.organisationId
          },
          session: data.session
        };
      }
    } catch (error: any) {
      console.error('Token refresh error:', error);
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue, dispatch, getState }) => {
    try {
      // Check for development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true';
      
      // In development mode, bypass Supabase authentication completely
      if (isDevelopment) {
        console.log('[DEV] Bypassing authentication check in development mode');
        
        // Get or create a development token
        const devToken = localStorage.getItem('airwave_auth_token') || `dev_token_${Date.now()}`;
        
        // Set the token if it doesn't exist
        if (!localStorage.getItem('airwave_auth_token')) {
          localStorage.setItem('airwave_auth_token', devToken);
        }
        
        // Set client ID if needed
        if (!localStorage.getItem('selectedClientId')) {
          localStorage.setItem('selectedClientId', 'fd790d19-6610-4cd5-b90f-214808e94a19');
        }
        
        // Set axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${devToken}`;
        
        // Return a mock user and session
        return {
          user: {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'admin@airwave.dev',
            name: 'Development Admin',
            role: 'admin',
            organisationId: null
          },
          session: {
            access_token: devToken,
            expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
            refresh_token: `dev_refresh_${Date.now()}`
          }
        };
      }
      
      console.log('checkAuth: Starting authentication check');
      // Try to get the active Supabase session first
      console.log('checkAuth: Getting Supabase session...');
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('checkAuth: Session data received:', sessionData ? 'has session data' : 'no session data');
      
      if (sessionData?.session?.access_token) {
        console.log('checkAuth: Found active Supabase session with token');
        
        // Check if token is close to expiration (within 5 minutes)
        const expiresAt = sessionData.session.expires_at; // In seconds since epoch
        console.log('checkAuth: Token expires at:', expiresAt ? new Date(expiresAt * 1000).toISOString() : 'unknown');
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000); // Current time in seconds
          const expiresInSeconds = expiresAt - now;
          
          console.log(`Token expires in ${expiresInSeconds} seconds`);
        
          // If token is about to expire (less than 5 minutes), refresh it
          if (expiresInSeconds < 300) {
            console.log('checkAuth: Token expires soon, initiating refresh');
            console.log('Token is about to expire, refreshing...');
            const refreshResult = await dispatch(refreshToken());
            
            if (refreshToken.fulfilled.match(refreshResult)) {
              return refreshResult.payload;
            }
          }
        }
        
        // If we have a valid Supabase session, use that token
        const token = sessionData.session.access_token;
        
        // Store it in our state management
        localStorage.setItem('airwave_auth_token', token);
        
        // Configure axios to include token in headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Get user data from our server
        const response = await axios.get('/api/auth/me');
        return response.data.data; // Return the user data
      }
      
      // If no active Supabase session, try with stored token
      const state = getState() as { auth: AuthState };
      const token = state.auth.token || localStorage.getItem('airwave_auth_token');
      
      if (!token) {
        console.log('No token found in state or localStorage');
        return rejectWithValue('No token found');
      }
      
      // If we have a stored token, try to refresh it
      console.log('Using stored token, attempting refresh...');
      const refreshResult = await dispatch(refreshToken());
      
      if (refreshToken.fulfilled.match(refreshResult)) {
        return refreshResult.payload;
      }
      
      // If refresh fails, try using the existing token
      console.log('Token refresh failed, trying with existing token...');
      
      // Configure axios to include token in headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user data from our server
      try {
        console.log('checkAuth: Fetching user data from API...');
        const response = await axios.get('/api/auth/me');
        console.log('checkAuth: User data received successfully');
        return response.data.data; // Return the user data
      } catch (apiError) {
        console.error('checkAuth: Error fetching user data:', apiError);
        // If this also fails, we have an invalid token
        throw new Error('Invalid token');
      }
    } catch (error: any) {
      console.error('Auth check failed:', error);
      // Clean up invalid token
      localStorage.removeItem('airwave_auth_token');
      return rejectWithValue(error.response?.data?.message || 'Authentication failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; session: any }>) => {
      state.user = action.payload.user;
      state.token = action.payload.session?.access_token || null;
      state.isAuthenticated = true;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.session?.access_token || null;
      
      // Store the token in localStorage for persistence
      if (action.payload.session?.access_token) {
        localStorage.setItem('airwave_auth_token', action.payload.session.access_token);
        // Set the token in axios defaults for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${action.payload.session.access_token}`;
      }
      
      console.log('Setting user in state:', state.user);
      console.log('Supabase session is active:', !!action.payload.session);
      console.log('Token stored in localStorage:', !!action.payload.session?.access_token);
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      
      // Clear token from localStorage
      localStorage.removeItem('airwave_auth_token');
      
      // Clear axios default headers
      delete axios.defaults.headers.common['Authorization'];
      
      console.log('User logged out, cleared token from storage and state');
    });

    // Token Refresh
    builder.addCase(refreshToken.pending, (state) => {
      // Don't set loading to true here to avoid UI flickering during refresh
      state.error = null;
    });
    builder.addCase(refreshToken.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.session?.access_token || null;
      state.loading = false;
      state.error = null;
      console.log('Token refreshed successfully');
    });
    builder.addCase(refreshToken.rejected, (state, action) => {
      // Don't immediately set isAuthenticated to false on refresh failure
      // as we might still try the stored token in checkAuth
      state.error = action.payload as string;
      console.log('Token refresh failed:', action.payload);
    });

    // Check Auth
    builder.addCase(checkAuth.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(checkAuth.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
      // Token is already set from local storage or previous login
    });
    builder.addCase(checkAuth.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload as string;
      
      // Clean up storage
      localStorage.removeItem('airwave_auth_token');
      
      // Clear axios default headers
      delete axios.defaults.headers.common['Authorization'];
      
      console.log('Authentication check failed:', action.payload);
    });
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;

export default authSlice.reducer;