import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Send as SendIcon,
  History as HistoryIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

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

interface ApprovalManagementProps {
  campaignId: string;
  campaignName: string;
  requests: ApprovalRequest[];
  onCreateRequest: (clientEmail: string) => Promise<void>;
  onSendRequest: (requestId: string) => Promise<void>;
  onDeleteRequest: (requestId: string) => Promise<void>;
  onCopyRequest: (requestId: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const ApprovalManagement: React.FC<ApprovalManagementProps> = ({
  campaignId,
  campaignName,
  requests,
  onCreateRequest,
  onSendRequest,
  onDeleteRequest,
  onCopyRequest,
  isLoading = false,
  error,
}) => {
  const [newClientEmail, setNewClientEmail] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  const handleCreateRequest = async () => {
    if (!newClientEmail) return;
    await onCreateRequest(newClientEmail);
    setNewClientEmail('');
    setCreateDialogOpen(false);
  };

  const getStatusColor = (status: ApprovalRequest['status']) => {
    const colors: Record<ApprovalRequest['status'], 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
      draft: 'default',
      sent: 'primary',
      viewed: 'warning',
      approved: 'success',
      rejected: 'error',
    };
    return colors[status];
  };

  const getStatusLabel = (status: ApprovalRequest['status']) => {
    const labels: Record<ApprovalRequest['status'], string> = {
      draft: 'Draft',
      sent: 'Sent',
      viewed: 'Viewed',
      approved: 'Approved',
      rejected: 'Changes Requested',
    };
    return labels[status];
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Approval Requests
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setHistoryDialogOpen(true)}
          >
            View History
          </Button>
          <Button
            variant="contained"
            onClick={() => setCreateDialogOpen(true)}
          >
            New Request
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {requests.map((request) => (
        <StyledCard key={request.id}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1">
                  Version {request.versionNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {request.clientEmail}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    size="small"
                    label={getStatusLabel(request.status)}
                    color={getStatusColor(request.status)}
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {new Date(request.updatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  {request.status === 'draft' && (
                    <>
                      <Tooltip title="Send request">
                        <IconButton
                          onClick={() => onSendRequest(request.id)}
                          disabled={isLoading}
                        >
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit request">
                        <IconButton
                          onClick={() => setSelectedRequest(request)}
                          disabled={isLoading}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete request">
                        <IconButton
                          onClick={() => onDeleteRequest(request.id)}
                          disabled={isLoading}
                          aria-label="Cancel"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {request.status !== 'draft' && (
                    <Tooltip title="Copy request">
                      <IconButton
                        onClick={() => onCopyRequest(request.id)}
                        disabled={isLoading}
                        aria-label="Copy request"
                      >
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                {request.feedback && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Feedback:
                    </Typography>
                    <Typography variant="body2">
                      {request.feedback}
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </StyledCard>
      ))}

      {/* Create Request Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Approval Request</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Client Email"
            type="email"
            value={newClientEmail}
            onChange={(e) => setNewClientEmail(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateRequest}
            disabled={!newClientEmail || isLoading}
          >
            Create Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Approval History</DialogTitle>
        <DialogContent>
          <List>
            {requests
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((request) => (
                <ListItem key={request.id}>
                  <ListItemText
                    primary={`Version ${request.versionNumber}`}
                    secondary={
                      <>
                        <Typography variant="body2">
                          {request.clientEmail}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(request.updatedAt).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      size="small"
                      label={getStatusLabel(request.status)}
                      color={getStatusColor(request.status)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalManagement;
