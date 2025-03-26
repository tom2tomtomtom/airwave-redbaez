import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

interface ApprovalVersion {
  id: string;
  version: number;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  content: {
    motivations: Array<{
      id: string;
      title: string;
      description: string;
      reasoning: string;
    }>;
    copyVariations: Array<{
      id: string;
      content: string[];
      tone: string;
      style: string;
    }>;
  };
}

interface ApprovalRequest {
  id: string;
  campaignId: string;
  campaignName: string;
  versionNumber: number;
  clientEmail: string;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  feedback?: string;
  content: {
    motivations: Array<{
      id: string;
      title: string;
      selected: boolean;
    }>;
    copyVariations: Array<{
      id: string;
      selected: boolean;
    }>;
  };
}

interface ApprovalState {
  requests: ApprovalRequest[];
  versions: ApprovalVersion[];
  currentVersionId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: ApprovalState = {
  requests: [],
  versions: [],
  currentVersionId: null,
  loading: false,
  error: null,
};

// Async Thunks
export const fetchApprovalRequests = createAsyncThunk(
  'approval/fetchRequests',
  async (campaignId: string) => {
    const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ApprovalRequest[];
  }
);

export const fetchApprovalVersions = createAsyncThunk(
  'approval/fetchVersions',
  async (requestId: string) => {
    const { data, error } = await supabase
      .from('approval_versions')
      .select('*')
      .eq('request_id', requestId)
      .order('version', { ascending: false });

    if (error) throw error;
    return data as ApprovalVersion[];
  }
);

export const createApprovalRequest = createAsyncThunk(
  'approval/createRequest',
  async ({ campaignId, clientEmail }: { campaignId: string; clientEmail: string }) => {
    const { data, error } = await supabase
      .from('approval_requests')
      .insert([
        {
          campaign_id: campaignId,
          client_email: clientEmail,
          status: 'draft',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as ApprovalRequest;
  }
);

export const sendApprovalRequest = createAsyncThunk(
  'approval/sendRequest',
  async (requestId: string) => {
    const { data, error } = await supabase
      .from('approval_requests')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data as ApprovalRequest;
  }
);

export const updateApprovalVersion = createAsyncThunk(
  'approval/updateVersion',
  async ({
    versionId,
    status,
    feedback,
  }: {
    versionId: string;
    status: 'approved' | 'rejected';
    feedback?: string;
  }) => {
    const { data, error } = await supabase
      .from('approval_versions')
      .update({
        status,
        feedback,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', versionId)
      .select()
      .single();

    if (error) throw error;
    return data as ApprovalVersion;
  }
);

const approvalSlice = createSlice({
  name: 'approval',
  initialState,
  reducers: {
    setCurrentVersion: (state, action: PayloadAction<string>) => {
      state.currentVersionId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Requests
      .addCase(fetchApprovalRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApprovalRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchApprovalRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch approval requests';
      })

      // Fetch Versions
      .addCase(fetchApprovalVersions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApprovalVersions.fulfilled, (state, action) => {
        state.loading = false;
        state.versions = action.payload;
      })
      .addCase(fetchApprovalVersions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch approval versions';
      })

      // Create Request
      .addCase(createApprovalRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createApprovalRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.requests.unshift(action.payload);
      })
      .addCase(createApprovalRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create approval request';
      })

      // Send Request
      .addCase(sendApprovalRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendApprovalRequest.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.requests.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.requests[index] = action.payload;
        }
      })
      .addCase(sendApprovalRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to send approval request';
      })

      // Update Version
      .addCase(updateApprovalVersion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateApprovalVersion.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.versions.findIndex((v) => v.id === action.payload.id);
        if (index !== -1) {
          state.versions[index] = action.payload;
        }
      })
      .addCase(updateApprovalVersion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update approval version';
      });
  },
});

export const { setCurrentVersion, clearError } = approvalSlice.actions;

export default approvalSlice.reducer;
