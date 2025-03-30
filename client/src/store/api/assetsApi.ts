import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Asset, AssetFilters } from '../../types/assets';
import { RootState } from '../index'; // Assuming store index is one level up

// Helper to get the auth token from state or localStorage (adjust based on actual auth state location)
const getAuthToken = (state: RootState): string | null => {
  // Example: Accessing auth slice state. Adjust if your auth state is structured differently.
  // return state.auth.token;
  // Fallback or alternative: Check localStorage
  return localStorage.getItem('airwave_auth_token');
};

// Define a service using a base URL and expected endpoints
export const assetsApi = createApi({
  reducerPath: 'assetsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v2/', // Assuming /api/v2 is the correct base path
    prepareHeaders: (headers, { getState }) => {
      const token = getAuthToken(getState() as RootState);
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      // Potentially add other default headers
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Asset'], // Define tags for cache invalidation
  endpoints: (builder) => ({
    // Endpoint to get assets by client slug, supporting filters
    getAssetsByClientSlug: builder.query<Asset[], { slug: string; filters?: Omit<AssetFilters, 'clientSlug' | 'clientId'> }>({      
      query: ({ slug, filters }) => ({
        url: `assets/by-client/${encodeURIComponent(slug)}`,
        params: { ...filters, _timestamp: new Date().getTime() }, // Add timestamp for cache busting if needed
      }),
      // Transform the response if the API wraps assets in an object like { assets: [...] }
      transformResponse: (response: { assets: Asset[] }, meta, arg) => response.assets || [],
      providesTags: (result) => 
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Asset' as const, id })),
              { type: 'Asset', id: 'LIST' },
            ]
          : [{ type: 'Asset', id: 'LIST' }],
    }),

    // Endpoint to upload an asset (expects FormData)
    uploadAsset: builder.mutation<Asset, FormData>({
      // Note: fetchBaseQuery might need adjustment for FormData. 
      // Consider an axios-based baseQuery if issues arise.
      query: (formData) => ({
        url: '/assets/upload', // Adjusted path relative to baseUrl? Check API structure
        method: 'POST',
        body: formData,
        // headers: { 'Content-Type': 'multipart/form-data' } // fetchBaseQuery usually handles this
      }),
      invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
    }),

    // Endpoint to update an asset
    updateAsset: builder.mutation<Asset, Partial<Asset> & Pick<Asset, 'id'>>({
      query: ({ id, ...patch }) => ({
        url: `/assets/${id}`, // Adjusted path relative to baseUrl? Check API structure
        method: 'PUT', 
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Asset', id }],
    }),

    // Endpoint to delete an asset
    deleteAsset: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/assets/${id}`, // Adjusted path relative to baseUrl? Check API structure
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Asset', id }],
    }),

    // Add other endpoints as needed (e.g., getAssetById)

  }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const {
  useGetAssetsByClientSlugQuery,
  useUploadAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
} = assetsApi;
