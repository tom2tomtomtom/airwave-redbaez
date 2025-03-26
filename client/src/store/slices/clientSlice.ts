import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import apiClient from '../../api/apiClient';
import { Client, ClientFormData } from '../../types/client';
import { supabase } from '../../lib/supabase';

/**
 * Interface for the client state in Redux store
 */
interface ClientState {
  clients: Client[];
  selectedClientId: string | null;
  loading: boolean;
  error: string | null;
  createStatus: 'idle' | 'pending' | 'succeeded' | 'failed' | null;
  createError: string | null;
}

// Debug helper function to log state changes
const logState = (action: string, state: ClientState) => {
  console.log(`[ClientSlice:${action}] State updated:`, {
    clientsCount: state.clients.length,
    clientIds: state.clients.map(c => c.id || c.slug).join(', '),
    selectedClientId: state.selectedClientId,
    loading: state.loading
  });
};

/**
 * Initial state for the client slice
 */
const initialState: ClientState = {
  clients: [],
  // Load selected client from localStorage on startup
  selectedClientId: localStorage.getItem('airwave_selected_client'),
  loading: false,
  error: null,
  createStatus: null,
  createError: null
};

/**
 * Fetch all clients from the API
 */
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      // Check for development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true';
      
      let token;
      
      if (isDevelopment) {
        console.log('[DEV] Bypassing authentication check in development mode for client fetch');
        token = localStorage.getItem('airwave_auth_token') || 'dev_token';
      } else {
        // Normal authentication flow for production
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          return rejectWithValue('No active session found. Please log in again.');
        }
        token = session.access_token;
      }
      
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
      console.log('Fetching clients from:', `${serverUrl}/api/clients`);
      console.log('Using auth token:', token ? `${token.substring(0, 10)}...` : 'none');
      
      // Main API request try block
      try {
        console.log('Making API request to fetch clients');
        const response = await apiClient.get(`/api/clients`);
        console.log('Clients API response received:', {
          status: response.status,
          hasData: Boolean(response.data),
          dataType: typeof response.data
        });
        
        // Process the response data carefully
        let clientData = [];
        
        if (Array.isArray(response.data)) {
          console.log('✅ API returned direct array with', response.data.length, 'clients');
          clientData = response.data;
          // Log the first few clients to verify structure
          if (response.data.length > 0) {
            console.log('First client in array:', response.data[0]);
          }
        } else if (response.data && typeof response.data === 'object') {
          // Check if the data is wrapped in a data property
          if (Array.isArray(response.data.data)) {
            console.log('✅ API returned nested data.data array with', response.data.data.length, 'clients');
            clientData = response.data.data;
            if (response.data.data.length > 0) {
              console.log('First client in nested array:', response.data.data[0]);
            }
          } else if (response.data.clients && Array.isArray(response.data.clients)) {
            console.log('✅ API returned clients property with', response.data.clients.length, 'clients');
            clientData = response.data.clients;
          } else {
            console.log('⚠️ Unexpected API response structure:', Object.keys(response.data));
            // Attempt to extract any potential client data
            for (const key in response.data) {
              if (Array.isArray(response.data[key])) {
                console.log(`Found array in key '${key}' with ${response.data[key].length} items`);
                if (response.data[key].length > 0 && response.data[key][0].id && response.data[key][0].name) {
                  console.log(`Array in key '${key}' appears to contain clients, using it`);
                  clientData = response.data[key];
                }
              }
            }
          }
        }
        
        // Final validation of client data
        if (clientData.length > 0) {
          console.log(`Found ${clientData.length} clients, processing data`);
          
          // Map server-side field names to client-side format
          const mappedClientData = clientData.map((client: any) => ({
            id: client.id,
            slug: client.client_slug || client.slug || '',
            name: client.name || '',
            description: client.description || '',
            // Explicitly map logo_url to logoUrl
            logoUrl: client.logo_url || client.logoUrl || null,
            // Handle both UK and US spelling variants
            brandColour: client.primary_color || client.brand_colour || client.brandColour || '',
            secondaryColour: client.secondary_color || client.secondary_colour || client.secondaryColour || '',
            isActive: client.is_active !== undefined ? client.is_active : true,
            createdAt: client.created_at || client.createdAt || new Date().toISOString(),
            updatedAt: client.updated_at || client.updatedAt || new Date().toISOString()
          }));
          
          // Log the mapped client data
          if (mappedClientData.length > 0) {
            console.log('First client after mapping:', mappedClientData[0]);
            console.log('Logo URL after mapping:', mappedClientData[0].logoUrl);
          }
          
          // Return the mapped data
          console.log(`Transformed ${mappedClientData.length} clients to client-side format`);
          return mappedClientData;
        }
        
        // If no clients found, run this validation
        // Validate that they have the expected structure
        const hasValidStructure = clientData.every((client: any) => 
          client && typeof client === 'object' && 'id' in client && 'name' in client);
        
        if (!hasValidStructure) {
          console.warn('⚠️ Some clients are missing required id or name properties!');
        }
        
        console.log('Returning client data:', clientData);
        return clientData;
      } catch (apiError) {
        // Handle API call errors within this nested catch
        console.log('Error during API call:', apiError);
        console.log('No valid client data found in response, returning empty array');
        throw apiError; // Re-throw to be caught by outer catch
      }
    } catch (requestError: any) {
      // This is the outer catch block that handles all errors
      console.log('Caught error in outer catch:', requestError);
      
      // If we get a 401, try refreshing the token once more
      if (requestError.response?.status === 401) {
        console.log('Auth error when fetching clients, attempting token refresh and retry');
        
        // Force a token refresh
        try {
          const { data: refreshResult } = await supabase.auth.refreshSession();
          
          if (refreshResult.session) {
            // Retry the request with the fresh token
            const retryResponse = await apiClient.get(`/api/clients`);
            return retryResponse.data || [];
          }
        } catch (refreshError) {
          console.error('Token refresh failed during client fetch retry:', refreshError);
        }
      }
      
      console.error('Error fetching clients:', requestError);
      console.log('Error response:', requestError.response?.data);
      
      // Return a structured error with auth flag
      if (requestError.response?.status === 401) {
        return rejectWithValue({
          message: 'Authentication required. Please log in again.',
          isAuthError: true
        });
      }
      
      // No mock data - if server returns no clients, we should handle this in the UI
      console.log('⚠️ API request for clients failed, returning empty array');
      console.log('Error details:', requestError.message);
      
      // Return an empty array instead of rejecting, so the app can continue to function
      // The UI should handle empty states appropriately
      return rejectWithValue({
        message: requestError.response?.data?.message || requestError.message || 'Failed to fetch clients',
        isAuthError: false
      });
    }
  }
);

/**
 * Create a new client
 */
export const createClient = createAsyncThunk(
  'clients/createClient',
  async (clientData: ClientFormData, { rejectWithValue }) => {
    try {
      // Get the session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return rejectWithValue('No active session found. Please log in again.');
      }
      
      const token = session.access_token;
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
      
      // Ensure data format matches server expectations
      const validatedData = {
        slug: clientData.slug, // Required field
        name: clientData.name,
        logoUrl: clientData.logoUrl || null, // Send null instead of empty string
        brandColour: clientData.brandColour || '#FFFFFF',
        secondaryColour: clientData.secondaryColour || '#000000',
        description: clientData.description || '',
        isActive: true // Explicitly set isActive for new clients
      };
      
      console.log('Creating client with validated data:', validatedData);
      
      // Add retry mechanism for auth errors
      try {
        const response = await apiClient.post(`/api/clients`, validatedData);
        console.log('Create client response:', response.data);
        return response.data;
      } catch (requestError: any) {
        // Handle auth errors with retry
        if (requestError.response?.status === 401) {
          console.log('Auth error when creating client, attempting token refresh and retry');
          
          // Force a token refresh
          try {
            const { data: refreshResult } = await supabase.auth.refreshSession();
            
            if (refreshResult.session) {
              // Retry the request with the fresh token
              const retryResponse = await apiClient.post(`/api/clients`, validatedData);
              return retryResponse.data;
            }
          } catch (refreshError) {
            console.error('Token refresh failed during client creation:', refreshError);
          }
        }
        
        throw requestError;
      }
    } catch (error: any) {
      console.error('Error creating client:', error);
      console.log('Error response:', error.response?.data);
      console.log('Validation errors:', error.response?.data?.errors);
      
      // Log specific details of each validation error
      if (error.response?.data?.errors && Array.isArray(error.response?.data?.errors)) {
        error.response.data.errors.forEach((err: any, index: number) => {
          console.log(`Validation error ${index + 1}:`, JSON.stringify(err, null, 2));
        });
      }
      console.log('Client data sent:', clientData);
      
      // Structure the error response
      if (error.response?.status === 401) {
        return rejectWithValue({
          message: 'Authentication required. Please log in again.',
          isAuthError: true
        });
      }
      
      return rejectWithValue(error.response?.data || error.message || 'Failed to create client');
    }
  }
);

/**
 * Update an existing client
 */
export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, clientData }: { id: string; clientData: ClientFormData }, { rejectWithValue }) => {
    try {
      console.log('Updating client with ID:', id);
      console.log('Update payload from form:', clientData);
      
      // Get the session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return rejectWithValue('No active session found. Please log in again.');
      }
      
      // Ensure data format matches server expectations, similar to createClient
      const validatedData = {
        slug: clientData.slug,
        name: clientData.name,
        // Explicitly handle logo URL (important fix for UI display)
        logoUrl: clientData.logoUrl || null, // Send null instead of empty string
        brandColour: clientData.brandColour || '',
        secondaryColour: clientData.secondaryColour || '',
        description: clientData.description || '',
        isActive: clientData.isActive !== undefined ? clientData.isActive : true
      };
      
      console.log('Sending validated update data to server:', validatedData);
      console.log('Logo URL being sent:', validatedData.logoUrl);
      
      const response = await apiClient.put(`/api/clients/${id}`, validatedData);
      console.log('Update client response from server:', response.data);
      
      // Map server response back to client format if needed
      const responseData = response.data.data || response.data;
      const clientFormatData = {
        id: responseData.id,
        slug: responseData.client_slug || responseData.slug || '',
        name: responseData.name || '',
        description: responseData.description || '',
        // Explicitly map logo_url to logoUrl - critical for UI display
        logoUrl: responseData.logo_url || responseData.logoUrl || null,
        // Handle both UK and US spelling variants
        brandColour: responseData.primary_color || responseData.brand_colour || responseData.brandColour || '',
        secondaryColour: responseData.secondary_color || responseData.secondary_colour || responseData.secondaryColour || '',
        isActive: responseData.is_active !== undefined ? responseData.is_active : true,
        createdAt: responseData.created_at || responseData.createdAt || '',
        updatedAt: responseData.updated_at || responseData.updatedAt || ''
      };
      
      console.log('Mapped client data for redux store:', clientFormatData);
      console.log('Logo URL after mapping:', clientFormatData.logoUrl);
      
      return clientFormatData;
    } catch (error: any) {
      console.error('Error updating client:', error);
      console.log('Error response:', error.response?.data);
      return rejectWithValue(error.response?.data?.message || 'Failed to update client');
    }
  }
);

/**
 * Delete a client
 */
export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (id: string, { rejectWithValue }) => {
    try {
      // Get the session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return rejectWithValue('No active session found. Please log in again.');
      }
      
      const token = session.access_token;
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
      
      await apiClient.delete(`/api/clients/${id}`);
      console.log('Client deleted successfully:', id);
      return id;
    } catch (error: any) {
      console.error('Error deleting client:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to delete client');
    }
  }
);

/**
 * Client slice for Redux store
 */
const clientSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    // Force set clients (for debugging)
    forceSetClients: (state, action: PayloadAction<Client[]>) => {
      console.log('Force setting clients:', action.payload.length);
      state.clients = action.payload;
      logState('forceSetClients', state);
    },
    setSelectedClient: (state, action: PayloadAction<string | null>) => {
      // Store the selected value (which could be a slug or ID)
      if (action.payload) {
        console.log('🔄 Setting selected client to:', action.payload);
        
        // ID format validation (basic UUID check)
        const isUuid = action.payload.includes('-') && action.payload.length >= 36;
        
        if (isUuid) {
          // The value looks like a UUID - check if it matches any client ID
          const clientById = state.clients.find(client => client.id === action.payload);
          if (clientById && clientById.id) {
            console.log('✅ Found client by UUID match:', clientById.name);
            state.selectedClientId = clientById.id;
          } else {
            console.warn('⚠️ Received UUID-like value but no matching client found:', action.payload);
            // Keep the UUID value anyway - it may be valid but not yet loaded
            state.selectedClientId = action.payload;
          }
        } else {
          // The value looks like a slug - resolve it to a UUID
          const payload = action.payload; // Capture in a local variable for type safety
          const clientBySlug = state.clients.find(client => 
            client.slug === payload || 
            (payload && client.slug === payload.toLowerCase())
          );
          
          if (clientBySlug && clientBySlug.id) {
            console.log('✅ Resolved client slug to UUID:', action.payload, '→', clientBySlug.id);
            state.selectedClientId = clientBySlug.id; // Always store the UUID
          } else {
            console.warn('⚠️ Could not resolve client slug to UUID:', action.payload);
            state.selectedClientId = action.payload; // Store anyway as fallback
          }
        }
      } else {
        state.selectedClientId = null;
      }
      
      // Persist selected client in localStorage using UUID format
      if (state.selectedClientId) {
        const clientIdToStore = state.selectedClientId;
        localStorage.setItem('airwave_selected_client', clientIdToStore);
        // Also log the selected client for debugging
        const selected = state.clients.find(c => c.id === clientIdToStore);
        console.log('📝 Selected client stored:', selected?.name || 'Unknown', '(UUID:', clientIdToStore + ')');
      } else {
        localStorage.removeItem('airwave_selected_client');
      }
    },
    initSelectedClient: (state) => {
      // Load selected client from localStorage on app initialization
      const savedValue = localStorage.getItem('airwave_selected_client');
      console.log('Initializing client selection, saved value:', savedValue);
      
      if (savedValue) {
        // First check if the saved value matches any client ID
        const clientById = state.clients.find(client => client.id === savedValue);
        if (clientById && clientById.id) {
          console.log('Found saved client by ID match:', clientById.name);
          state.selectedClientId = clientById.id;
          return;
        }
        
        // Then check if the saved value matches any client slug
        const clientBySlug = state.clients.find(client => client.slug === savedValue);
        if (clientBySlug && clientBySlug.id) {
          console.log('Found saved client by slug match:', clientBySlug.name);
          state.selectedClientId = clientBySlug.id; // Always store the ID for consistency
          return;
        }
      }
      
      // If we reach here, either no client was saved or the saved client wasn't found
      if (state.clients.length > 0 && state.clients[0].id) {
        // Default to first client if saved client not found
        console.log('No saved client found or it was invalid, defaulting to first client:', state.clients[0].name);
        state.selectedClientId = state.clients[0].id; // Always use ID for consistency
        localStorage.setItem('airwave_selected_client', state.clients[0].id);
      } else {
        console.log('No clients available to select');
        state.selectedClientId = null;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch clients cases
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        console.log('\n======== FETCH CLIENTS FULFILLED ========');
        console.log('Received payload:', {
          isArray: Array.isArray(action.payload),
          length: Array.isArray(action.payload) ? action.payload.length : 0,
          type: typeof action.payload
        });
        
        // The action.payload should already be a properly processed array from the thunk
        // We've added extensive validation there
        const clientsArray = Array.isArray(action.payload) ? action.payload : [];
        
        // Log all client data for debugging
        if (clientsArray.length > 0) {
          console.log(`Found ${clientsArray.length} clients in payload:`);
          clientsArray.forEach((client: Client, index: number) => {
            console.log(`Client ${index}: UUID=${client.id || 'missing'}, slug=${client.slug || 'missing'}, name=${client.name || 'missing'}`);
          });
          
          // CRITICAL FIX: Ensure we have valid client data before updating state
          // This includes enforcing that BOTH a UUID and a slug exist (and prefer the UUID as canonical)
          const validClients = clientsArray.filter(client => 
            client && typeof client === 'object' && client.id && client.name);
          
          // Normalize all clients to ensure both UUID and slug are set
          const normalizedClients = validClients.map(client => ({
            ...client,
            // Ensure ID is always valid
            id: client.id,
            // Generate slug from name if missing
            slug: client.slug || client.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          }));
          
          if (validClients.length !== clientsArray.length) {
            console.warn(`Filtered out ${clientsArray.length - validClients.length} invalid clients`);
          }
          
          // IMPORTANT: Always update the state with the new normalized clients
          console.log(`Updating Redux state with ${normalizedClients.length} valid clients`);
          state.clients = normalizedClients;
        } else {
          console.warn('No clients found in payload');
          // Keep existing clients if the payload is empty to prevent UI issues
          if (state.clients.length > 0) {
            console.log('Keeping existing clients in state to prevent UI issues');
          } else {
            state.clients = [];
          }
        }
        
        state.loading = false;
        logState('fetchClients.fulfilled', state);
        
        // Initialize selected client if none is selected yet
        if (!state.selectedClientId && clientsArray.length > 0) {
          const savedClientId = localStorage.getItem('airwave_selected_client');
          // Try to restore selected client by UUID
          if (savedClientId && clientsArray.some((client: Client) => client.id === savedClientId)) {
            console.log('🔄 Restoring previously selected client by UUID:', savedClientId);
            state.selectedClientId = savedClientId;
          } 
          // Try to restore by slug (backwards compatibility)
          else if (savedClientId && !savedClientId.includes('-')) {
            const clientBySlug = clientsArray.find((client: Client) => client.slug === savedClientId);
            if (clientBySlug) {
              console.log('🔄 Resolved saved client slug to UUID:', savedClientId, '→', clientBySlug.id);
              state.selectedClientId = clientBySlug.id;
              // Update localStorage with the UUID
              localStorage.setItem('airwave_selected_client', clientBySlug.id);
            } else {
              // Fall back to first client
              console.log('🔄 Setting default selected client UUID to first client:', clientsArray[0].id);
              state.selectedClientId = clientsArray[0].id;
              localStorage.setItem('airwave_selected_client', clientsArray[0].id);
            }
          } else {
            // No previous selection, use first client
            console.log('🔄 Setting default selected client UUID to first client:', clientsArray[0].id);
            state.selectedClientId = clientsArray[0].id;
            localStorage.setItem('airwave_selected_client', clientsArray[0].id);
          }
        }
        
        console.log('Final state after fetchClients.fulfilled:', {
          clientsCount: state.clients.length,
          selectedClientId: state.selectedClientId,
          loading: state.loading
        });
        console.log('======== FETCH CLIENTS COMPLETE ========\n');
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        
        // Handle structured error response
        if (action.payload && typeof action.payload === 'object' && 'message' in action.payload) {
          state.error = (action.payload as any).message || 'Failed to fetch clients';
          // If it's an auth error, we can set a flag that the UI can use
          if ((action.payload as any).isAuthError) {
            console.error('Auth error when fetching clients');
          }
        } else {
          state.error = action.payload as string || 'Failed to fetch clients';
        }
        
        console.error('Failed to fetch clients:', action.payload);
        // Even if clients fetch fails, we should still allow the user to create clients
        // So we'll set clients to an empty array rather than leaving it in a broken state
        state.clients = [];
      })
      
      // Create client cases
      .addCase(createClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.loading = false;
        state.createStatus = 'succeeded';
        
        // Handle both response formats (direct or nested in data property)
        const clientData = action.payload?.data || action.payload;
        
        console.log('Client created successfully:', clientData);
        
        if (clientData && clientData.id) {
          // Verify we have a valid client object
          if (!clientData.name) {
            console.error('Invalid client data received, missing name:', clientData);
            return;
          }
          
          // Check if client already exists in the array to avoid duplicates
          const existingIndex = state.clients.findIndex((c) => c.id === clientData.id);
          
          if (existingIndex >= 0) {
            // Update existing client
            console.log('Updating existing client in store');
            state.clients[existingIndex] = clientData;
          } else {
            // Add new client
            console.log('Adding new client to store:', clientData.name, 'with ID:', clientData.id);
            state.clients.push(clientData);
            console.log(`Client list now has ${state.clients.length} clients`);
          }
          
          // Always select the newly created/updated client
          console.log('Setting selected client ID to:', clientData.id);
          state.selectedClientId = clientData.id;
          localStorage.setItem('airwave_selected_client', clientData.id);
        } else {
          console.error('Invalid client data received from server:', clientData);
        }
      })
      .addCase(createClient.rejected, (state, action) => {
        state.loading = false;
        // Handle different error formats
        if (typeof action.payload === 'string') {
          state.error = action.payload;
        } else if (action.payload && typeof action.payload === 'object') {
          // For validation errors or other structured errors
          const errorObj = action.payload as any;
          state.error = errorObj.message || 'Failed to create client';
        } else {
          state.error = 'Failed to create client';
        }
      })
      
      // Update client cases
      .addCase(updateClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.loading = false;
        console.log('Client updated successfully:', action.payload);
        
        // The payload should already be properly processed from updateClient thunk
        const clientData = action.payload;
        
        // Check if we have valid client data with an ID
        if (clientData && clientData.id) {
          const index = state.clients.findIndex(client => client.id === clientData.id);
          if (index !== -1) {
            // Update the existing client in the array
            state.clients[index] = clientData;
            // Ensure the selected client is also updated if it's the same one
            if (state.selectedClientId === clientData.id) {
              // This will trigger UI updates for the selected client
              state.selectedClientId = clientData.id;
            }
          }
        } else {
          console.error('Invalid client data received in update:', clientData);
        }
      })
      .addCase(updateClient.rejected, (state, action) => {
        state.loading = false;
        // Handle different error formats
        if (typeof action.payload === 'string') {
          state.error = action.payload;
        } else if (action.payload && typeof action.payload === 'object') {
          // For validation errors or other structured errors
          const errorObj = action.payload as any;
          state.error = errorObj.message || 'Failed to update client';
        } else {
          state.error = 'Failed to update client';
        }
        console.error('Failed to update client:', action.payload);
      })
      
      // Delete client cases
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.clients = state.clients.filter(client => client.id !== action.payload);
        // If deleted client was selected, select first available client
        if (state.selectedClientId === action.payload) {
          if (state.clients.length > 0) {
            state.selectedClientId = state.clients[0].slug;
            localStorage.setItem('airwave_selected_client', state.clients[0].slug);
          } else {
            state.selectedClientId = null;
            localStorage.removeItem('airwave_selected_client');
          }
        }
      });
  }
});

export const { setSelectedClient, initSelectedClient, forceSetClients } = clientSlice.actions;

// Selectors for better performance
export const selectClients = (state: RootState) => state.clients.clients;
export const selectSelectedClientId = (state: RootState) => state.clients.selectedClientId;
export const selectClientLoading = (state: RootState) => state.clients.loading;
export const selectClientError = (state: RootState) => state.clients.error;

// Memoized selector to get the selected client object
export const selectSelectedClient = (state: RootState) => {
  const { clients, selectedClientId } = state.clients;
  if (!selectedClientId) return null;
  return clients.find(client => (client.id || client.slug) === selectedClientId) || null;
};

export default clientSlice.reducer;
