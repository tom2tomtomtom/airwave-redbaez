import React, { useEffect } from 'react';
import { initSocketMonitor } from './utils/socketMonitor';
import getWebSocketClient from './utils/websocketClient';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/common/LoadingScreen';
import ClientSignOffPortal from './components/signoff/ClientSignOffPortal';
import TokenRefresher from './components/auth/TokenRefresher';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AssetsPage from './pages/assets/AssetsPage';
import TemplatesPage from './pages/templates/TemplatesPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import ClientDashboardPage from './pages/clients/ClientDashboardPage';
import ClientSelectionPage from './pages/clients/ClientSelectionPage';
import CampaignDetailPage from './pages/campaigns/CampaignDetailPage';
import CreateCampaignPage from './pages/campaigns/CreateCampaignPage';
import GeneratePage from './pages/generate/GeneratePage';
import StrategyPage from './pages/generate/StrategyPage';
import CopyGenerationPage from './pages/generate/CopyGenerationPage';
import MatrixPage from './pages/matrix/MatrixPage';
import ExportsPage from './pages/exports/ExportsPage';
import AnalyticsPage from './pages/exports/AnalyticsPage';
import BriefList from './pages/briefs/BriefList';
import BriefForm from './pages/briefs/BriefForm';
import BriefDetail from './pages/briefs/BriefDetail';

// Redux
import { RootState } from './store';
import { checkAuth } from './store/slices/authSlice';
import { AppDispatch } from './store';

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Monitor WebSocket connections
    initSocketMonitor();
    
    // Initialize WebSocket client
    const wsClient = getWebSocketClient();
    wsClient.onConnect(() => {
      console.log('WebSocket client connected successfully');
    });
    
    // Check if we have a stored token
    const storedToken = localStorage.getItem('airwave_auth_token');
    console.log('Stored token exists:', !!storedToken);
    
    // If we're in development mode and prototype mode is enabled, we can try to do development login
    const isDevMode = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true';
    
    if (isDevMode && !storedToken) {
      console.log('Development mode detected, attempting development login flow');
      // Try to reach the dev-login endpoint directly
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
      axios.post(`${serverUrl}/api/auth/dev-login`)
        .then(response => {
          if (response.data?.success && response.data?.data?.session?.access_token) {
            console.log('Auto dev login successful');
            // Store the token and dispatch set credentials
            const token = response.data.data.session.access_token;
            localStorage.setItem('airwave_auth_token', token);
            
            // Update axios defaults
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Update Redux store
            dispatch({
              type: 'auth/setCredentials',
              payload: {
                user: response.data.data.user,
                session: response.data.data.session
              }
            });
          } else {
            // If auto dev login fails, continue with regular auth check
            dispatch(checkAuth());
          }
        })
        .catch(error => {
          console.log('Auto dev login failed, falling back to auth check:', error.message);
          dispatch(checkAuth());
        });
    } else {
      // For production or when we already have a token, use regular auth check
      dispatch(checkAuth());
    }
  }, [dispatch]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {/* Token Refresher runs in the background when the user is authenticated */}
      {isAuthenticated && <TokenRefresher />}
      
      <Routes>
        {/* Public routes */}
        <Route path="/auth/login" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />
        } />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        
        <Route path="/auth/register" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />
        } />
        
        {/* Client sign-off portal (publicly accessible with token) */}
        <Route path="/client-review/:token" element={<ClientSignOffPortal />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/client-selection" replace />} />
        <Route path="client-selection" element={<ClientSelectionPage />} />
        <Route path="client-dashboard" element={<ClientDashboardPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        
        {/* Campaign routes */}
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/new" element={<CreateCampaignPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        
        {/* Generate routes */}
        <Route path="generate" element={<GeneratePage />} />
        <Route path="generate/strategy" element={<StrategyPage />} />
        <Route path="generate/copy" element={<CopyGenerationPage />} />
        <Route path="matrix" element={<MatrixPage />} />
        
        {/* Strategic Content Development routes */}
        <Route path="briefs" element={<BriefList />} />
        <Route path="briefs/create" element={<BriefForm />} />
        <Route path="briefs/:id" element={<BriefDetail />} />
        <Route path="briefs/:id/edit" element={<BriefForm />} />

        {/* Export routes */}
        <Route path="exports" element={<ExportsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
};

export default App;