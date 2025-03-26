import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import axios from 'axios';

import App from './App';
import { store } from './store';
import theme from './theme';

// Make store available globally for debugging
// @ts-ignore
window.store = store;

// Setup development helpers
if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true') {
  // Make store accessible globally for debugging
  // @ts-ignore
  window.store = store;
  
  // Create development bypass for authentication
  console.log('[DEV] Setting up global auth bypass');
  
  // Create a development token
  const token = 'dev_token_' + Date.now();
  localStorage.setItem('airwave_auth_token', token);
  
  // Set client ID for testing
  localStorage.setItem('airwave_selected_client', 'fd790d19-6610-4cd5-b90f-214808e94a19');
  console.log('[DEV] Set test client ID in localStorage with key airwave_selected_client');
  
  // Set up a global test function
  // @ts-ignore
  window.setupJuniperTest = () => {
    localStorage.setItem('airwave_auth_token', 'dev_token_' + Date.now());
    localStorage.setItem('selectedClientId', 'fd790d19-6610-4cd5-b90f-214808e94a19');
    console.log('[DEV] Test environment configured');
    window.location.reload();
  };
  
  // Add axios interceptor to add auth token to all requests
  axios.interceptors.request.use((config: any) => {
    const token = localStorage.getItem('airwave_auth_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  
  console.log('[DEV] Added axios interceptor to automatically add auth token');
  
  // Import the bypassAuth utility for development mode
  import('./utils/bypassAuth').then(() => {
    console.log('[DEV] Authentication bypass utility loaded');
    
    // Auto-setup if configured in environment
    if (process.env.REACT_APP_USE_DEV_LOGIN === 'true') {
      // Auto-run the auth bypass to prevent errors on page load
      setTimeout(() => {
        // Only apply if we need auth
        if (!localStorage.getItem('airwave_auth_token')) {
          console.log('[DEV] Auto-applying authentication bypass...');
          // @ts-ignore
          if (window.setupJuniperTest) {
            // @ts-ignore
            window.setupJuniperTest();
          }
        }
      }, 1000);
    }
  }).catch(err => {
    console.error('[DEV] Failed to load authentication bypass utility:', err);
  });
  
  console.log('[DEV] Development mode active. Run window.setupJuniperTest() in console for complete setup.');
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);