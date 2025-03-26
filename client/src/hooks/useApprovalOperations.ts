import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchApprovalRequests,
  fetchApprovalVersions,
  createApprovalRequest,
  sendApprovalRequest,
  updateApprovalVersion,
  setCurrentVersion,
  clearError,
} from '../features/approval/approvalSlice';
import { approvalApi } from '../api/approvalApi';

export const useApprovalOperations = (campaignId: string) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    requests,
    versions,
    currentVersionId,
    loading,
    error,
  } = useSelector((state: RootState) => state.approval);

  const loadRequests = useCallback(async () => {
    try {
      await dispatch(fetchApprovalRequests(campaignId)).unwrap();
    } catch (error) {
      console.error('Failed to load approval requests:', error);
    }
  }, [dispatch, campaignId]);

  const loadVersions = useCallback(async (requestId: string) => {
    try {
      await dispatch(fetchApprovalVersions(requestId)).unwrap();
    } catch (error) {
      console.error('Failed to load approval versions:', error);
    }
  }, [dispatch]);

  const createRequest = useCallback(async (clientEmail: string, content: any) => {
    try {
      const request = await approvalApi.createRequest({
        campaignId,
        clientEmail,
        content,
      });
      await loadRequests();
      return request;
    } catch (error) {
      console.error('Failed to create approval request:', error);
      throw error;
    }
  }, [campaignId, loadRequests]);

  const sendRequest = useCallback(async (requestId: string) => {
    try {
      await dispatch(sendApprovalRequest(requestId)).unwrap();
      // Optionally trigger email notification here
    } catch (error) {
      console.error('Failed to send approval request:', error);
      throw error;
    }
  }, [dispatch]);

  const approveVersion = useCallback(async (versionId: string, feedback?: string) => {
    try {
      await dispatch(updateApprovalVersion({
        versionId,
        status: 'approved',
        feedback,
      })).unwrap();
    } catch (error) {
      console.error('Failed to approve version:', error);
      throw error;
    }
  }, [dispatch]);

  const rejectVersion = useCallback(async (versionId: string, feedback: string) => {
    try {
      await dispatch(updateApprovalVersion({
        versionId,
        status: 'rejected',
        feedback,
      })).unwrap();
    } catch (error) {
      console.error('Failed to reject version:', error);
      throw error;
    }
  }, [dispatch]);

  const createVersion = useCallback(async (requestId: string, content: any) => {
    try {
      const version = await approvalApi.createVersion({
        requestId,
        content,
      });
      await loadVersions(requestId);
      return version;
    } catch (error) {
      console.error('Failed to create version:', error);
      throw error;
    }
  }, [loadVersions]);

  const deleteRequest = useCallback(async (requestId: string) => {
    try {
      await approvalApi.deleteRequest(requestId);
      await loadRequests();
    } catch (error) {
      console.error('Failed to delete request:', error);
      throw error;
    }
  }, [loadRequests]);

  const copyRequest = useCallback(async (requestId: string) => {
    try {
      const newRequest = await approvalApi.copyRequest(requestId);
      await loadRequests();
      return newRequest;
    } catch (error) {
      console.error('Failed to copy request:', error);
      throw error;
    }
  }, [loadRequests]);

  const selectVersion = useCallback((versionId: string) => {
    dispatch(setCurrentVersion(versionId));
  }, [dispatch]);

  const clearApprovalError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const getCurrentVersion = useCallback(() => {
    return versions.find((v: { id: string }) => v.id === currentVersionId);
  }, [versions, currentVersionId]);

  return {
    // State
    requests,
    versions,
    currentVersion: getCurrentVersion(),
    loading,
    error,

    // Operations
    loadRequests,
    loadVersions,
    createRequest,
    sendRequest,
    approveVersion,
    rejectVersion,
    createVersion,
    deleteRequest,
    copyRequest,
    selectVersion,
    clearApprovalError,
  };
};

export type ApprovalOperations = ReturnType<typeof useApprovalOperations>;
