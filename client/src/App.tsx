import React, { useEffect } from 'react';
import { initSocketMonitor } from './utils/socketMonitor';
import getWebSocketClient from './utils/websocketClient';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import ClientSignOffPortal from './components/signoff/ClientSignOffPortal';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AssetsPage from './pages/assets/AssetsPage';
import TemplatesPage from './pages/templates/TemplatesPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import CampaignDetailPage from './pages/campaigns/CampaignDetailPage';
import CreateCampaignPage from './pages/campaigns/CreateCampaignPage';
import GeneratePage from './pages/generate/GeneratePage';
import StrategyPage from './pages/generate/StrategyPage';
import CopyGenerationPage from './pages/generate/CopyGenerationPage';
import ExportsPage from './pages/exports/ExportsPage';
import AnalyticsPage from './pages/exports/AnalyticsPage';

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
    
    dispatch(checkAuth());
  }, [dispatch]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
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
        
        {/* Export routes */}
        <Route path="exports" element={<ExportsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;