import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
// import assetsReducer from './slices/assetsSlice'; // Removed old assets reducer
import templatesReducer from './slices/templatesSlice';
import campaignsReducer from './slices/campaignsSlice';
import exportsReducer from './slices/exportsSlice';
import llmReducer from './slices/llmSlice';
import briefsReducer from './slices/briefsSlice';
import approvalReducer from '../features/approval/approvalSlice';
import clientReducer from './slices/clientSlice';
import { assetsApi } from './api/assetsApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // assets: assetsReducer, // Removed old assets reducer
    templates: templatesReducer,
    campaigns: campaignsReducer,
    exports: exportsReducer,
    llm: llmReducer,
    briefs: briefsReducer,
    approval: approvalReducer,
    clients: clientReducer,
    [assetsApi.reducerPath]: assetsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Removed 'assets/uploadAsset/fulfilled' from ignoredActions
        ignoredActions: ['assetsApi/executeQuery/fulfilled'], 
      },
    }).concat(assetsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;