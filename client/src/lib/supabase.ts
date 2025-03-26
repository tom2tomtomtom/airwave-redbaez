import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true';

// Default options for Supabase client
const supabaseOptions = {
  auth: {
    persistSession: true,
    storageKey: 'airwave_auth',
    storage: window.localStorage,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {}
  }
};

// If in development mode, add authentication bypass headers
if (isDevelopment) {
  console.log('📌 Development mode detected - Adding bypass headers to Supabase client');
  // Add development auth header
  supabaseOptions.global.headers = {
    'X-Development-Auth': 'true',
    'Authorization': `Bearer ${localStorage.getItem('airwave_dev_token') || 'dev-token-123'}`
  };
}

// Create a modified Supabase client with proper options
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Add development mode warning/info
if (isDevelopment) {
  // Set consistent development token
  const DEV_USER_ID = '00000000-0000-0000-0000-000000000000'; // Must match server-side
  const DEV_TOKEN = 'dev-token-fixed-airwave'; // Use a fixed token for consistency
  
  // Always store the token for development mode
  localStorage.setItem('airwave_dev_token', DEV_TOKEN);
  
  // Intercept auth calls
  const originalAuthGetSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = async () => {
    if (isDevelopment) {
      console.log('🔑 DEV MODE: Bypassing getSession() and returning mock session');
      // Return a mock session with consistent user ID
      const mockUser = {
        id: DEV_USER_ID, // Valid UUID for the development user
        email: 'dev@example.com',
        app_metadata: {
          provider: 'email'
        },
        user_metadata: {
          name: 'Development User'
        },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      };
      
      return {
        data: {
          session: {
            access_token: DEV_TOKEN,
            refresh_token: 'dev-refresh-token',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).getTime(),
            expires_in: 24 * 60 * 60,
            token_type: 'bearer',
            user: mockUser
          }
        },
        error: null
      };
    }
    
    // Call original in production
    return originalAuthGetSession();
  };
  
  // Also override getUser to ensure consistent behavior
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
  supabase.auth.getUser = async (token?: string) => {
    if (isDevelopment) {
      console.log('🔑 DEV MODE: Bypassing getUser() and returning mock user');
      return {
        data: {
          user: {
            id: DEV_USER_ID,
            email: 'dev@example.com',
            app_metadata: {
              provider: 'email'
            },
            user_metadata: {
              name: 'Development User'
            },
            aud: 'authenticated',
            created_at: new Date().toISOString()
          }
        },
        error: null
      };
    }
    
    // Call original in production
    return originalGetUser(token);
  };
}
