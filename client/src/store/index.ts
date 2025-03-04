import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import assetsReducer from './slices/assetsSlice';
import templatesReducer from './slices/templatesSlice';
import campaignsReducer from './slices/campaignsSlice';
import generateReducer from './slices/generateSlice';
import exportsReducer from './slices/exportsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assets: assetsReducer,
    templates: templatesReducer,
    campaigns: campaignsReducer,
    generate: generateReducer,
    exports: exportsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // for non-serializable data like File objects
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;