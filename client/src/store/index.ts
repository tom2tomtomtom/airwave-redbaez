import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import assetsReducer from './slices/assetsSlice';
import templatesReducer from './slices/templatesSlice';
import campaignsReducer from './slices/campaignsSlice';
import exportsReducer from './slices/exportsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assets: assetsReducer,
    templates: templatesReducer,
    campaigns: campaignsReducer,
    exports: exportsReducer,
  },
  // Add middleware or other config here if needed
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in specific action types
        ignoredActions: ['assets/uploadAsset/fulfilled'],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;