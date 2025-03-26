/**
 * Authentication Bypass Utility
 * 
 * This module completely bypasses authentication for development purposes
 * while still allowing work with real data and APIs.
 */

import axios from 'axios';

// Define the standard development admin user
const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'admin@airwave.dev',
  name: 'Development Admin',
  role: 'admin',
  organisationId: null
};

// Mock session that never expires (30 days from now)
const createMockSession = () => {
  const currentTime = Math.floor(Date.now() / 1000);
  const thirtyDaysLater = currentTime + (30 * 24 * 60 * 60);
  
  return {
    access_token: `mock_dev_token_${currentTime}`,
    expires_at: thirtyDaysLater,
    refresh_token: `mock_refresh_${currentTime}`,
    user: {
      id: DEV_USER.id,
      email: DEV_USER.email,
      user_metadata: {
        name: DEV_USER.name,
        role: DEV_USER.role,
        organisationId: DEV_USER.organisationId
      }
    }
  };
};

/**
 * Completely bypasses authentication while enabling real API access
 */
export const setupDevBypass = () => {
  console.log('[DEV] Setting up complete authentication bypass');
  
  // Create a mock session
  const mockSession = createMockSession();
  
  // Store token in localStorage
  localStorage.setItem('airwave_auth_token', mockSession.access_token);
  
  // Set up mock authentication in axios
  axios.defaults.headers.common['Authorization'] = `Bearer ${mockSession.access_token}`;
  
  // If Supabase is available, patch its auth methods
  if (window.supabase && window.supabase.auth) {
    // Mock getSession
    window.supabase.auth.getSession = () => {
      console.log('[DEV] Bypassed auth.getSession');
      return Promise.resolve({
        data: { session: mockSession, user: mockSession.user },
        error: null
      });
    };
    
    // Mock refreshSession
    window.supabase.auth.refreshSession = () => {
      console.log('[DEV] Bypassed auth.refreshSession');
      return Promise.resolve({
        data: { session: mockSession, user: mockSession.user },
        error: null
      });
    };
    
    // Mock signOut - do nothing
    const originalSignOut = window.supabase.auth.signOut;
    window.supabase.auth.signOut = () => {
      console.log('[DEV] Bypassed auth.signOut - sign out disabled in bypass mode');
      return Promise.resolve({ error: null });
    };
    
    console.log('[DEV] Successfully patched Supabase auth methods');
  }
  
  return { user: DEV_USER, session: mockSession };
};

/**
 * Sets the current client ID for testing
 */
export const setClientId = (clientId: string) => {
  if (!clientId) {
    console.error('[DEV] Please provide a valid client ID');
    return;
  }
  
  localStorage.setItem('selectedClientId', clientId);
  console.log(`[DEV] Client ID set to: ${clientId}`);
};

/**
 * Sets up specifically for Juniper client testing
 */
export const setupJuniperTest = () => {
  // Set up auth bypass first
  const { user } = setupDevBypass();
  console.log('[DEV] Development user set up:', user);
  
  // Set Juniper client ID
  const JUNIPER_CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';
  setClientId(JUNIPER_CLIENT_ID);
  
  console.log('[DEV] Juniper test environment ready');
  return { user, clientId: JUNIPER_CLIENT_ID };
};

// Add to window global for console access
declare global {
  interface Window {
    bypassAuth: typeof setupDevBypass;
    setClientForTest: typeof setClientId;
    setupJuniperTest: typeof setupJuniperTest;
    supabase: any;
  }
}

// Export a window-based invocation
window.bypassAuth = setupDevBypass;
window.setClientForTest = setClientId;
window.setupJuniperTest = setupJuniperTest;

export default { setupDevBypass, setClientId, setupJuniperTest };
