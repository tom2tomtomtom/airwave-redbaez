import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

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

interface ClientApprovalPortalProps {
  campaignName: string;
  clientName: string;
  versions: ApprovalVersion[];
  currentVersion: number;
  onApprove: (versionId: string, feedback?: string) => Promise<void>;
  onReject: (versionId: string, feedback: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const VersionCard = styled(Card)<{ selected?: boolean }>(({ theme, selected }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: selected ? theme.palette.primary.light : theme.palette.background.paper,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const ClientApprovalPortal: React.FC<ClientApprovalPortalProps> = ({
  campaignName,
  clientName,
  versions,
  currentVersion,
  onApprove,
  onReject,
  isLoading = false,
  error,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string>(
    versions.find(v => v.version === currentVersion)?.id || ''
  );
  const [feedback, setFeedback] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleApprove = async () => {
    if (!selectedVersion) return;
    await onApprove(selectedVersion, feedback);
    setFeedback('');
  };

  const handleReject = async () => {
    if (!selectedVersion || !feedback) return;
    await onReject(selectedVersion, feedback);
    setFeedback('');
  };

  const getCurrentVersion = () => {
    return versions.find(v => v.id === selectedVersion);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Campaign Review Portal
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {clientName} • {campaignName}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" gutterBottom>
              Versions
            </Typography>
            <List>
              {versions.map((version) => (
                <ListItem
                  key={version.id}
                  disablePadding
                  sx={{ mb: 2 }}
                >
                  <VersionCard
                    selected={version.id === selectedVersion}
                    onClick={() => setSelectedVersion(version.id)}
                    sx={{ width: '100%' }}
                  >
                    <CardContent>
                      <Typography variant="subtitle1">
                        Version {version.version}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          label={version.status}
                          color={
                            version.status === 'approved'
                              ? 'success'
                              : version.status === 'rejected'
                              ? 'error'
                              : 'default'
                          }
                        />
                      </Box>
                    </CardContent>
                  </VersionCard>
                </ListItem>
              ))}
            </List>
          </Grid>

          <Grid item xs={12} md={9}>
            {getCurrentVersion() ? (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Strategic Motivations
                  </Typography>
                  <Grid container spacing={2}>
                    {getCurrentVersion()?.content?.motivations?.map((motivation) => (
                      <Grid item xs={12} md={6} key={motivation.id}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                              {motivation.title}
                            </Typography>
                            <Typography variant="body2" paragraph>
                              {motivation.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Why it works: {motivation.reasoning}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Copy Variations
                  </Typography>
                  <Grid container spacing={2}>
                    {getCurrentVersion()?.content?.copyVariations?.map((variation) => (
                      <Grid item xs={12} key={variation.id}>
                        <Card>
                          <CardContent>
                            <Box sx={{ mb: 2 }}>
                              <Chip
                                label={`Tone: ${variation.tone}`}
                                size="small"
                                sx={{ mr: 1 }}
                              />
                              <Chip
                                label={`Style: ${variation.style}`}
                                size="small"
                              />
                            </Box>
                            {variation.content.map((line, index) => (
                              <Typography key={index} variant="body2" paragraph>
                                Frame {index + 1}: {line}
                              </Typography>
                            ))}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Box>
                  <Typography variant="h6" gutterBottom>
                    Feedback
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter your feedback here..."
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<ApproveIcon />}
                      onClick={handleApprove}
                      disabled={isLoading}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={handleReject}
                      disabled={isLoading || !feedback}
                    >
                      Request Changes
                    </Button>
                  </Box>
                </Box>
              </>
            ) : (
              <Alert severity="info">
                Please select a version to review
              </Alert>
            )}
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ClientApprovalPortal;
