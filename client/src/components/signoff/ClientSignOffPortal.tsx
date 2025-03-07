import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Divider,
  Container,
  AppBar,
  Toolbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { apiClient } from '../../utils/api';

// Types for sign-off data
interface SignOffItem {
  id: string;
  title: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'revised';
  createdBy: {
    name: string;
    email: string;
  };
  content: {
    motivations: Array<{
      id: string;
      title: string;
      description: string;
    }>;
    copy: {
      id: string;
      frames: string[];
      callToAction?: string;
      tone: string;
      style: string;
    };
    brief: {
      clientName: string;
      projectName: string;
      productDescription: string;
    };
  };
  comments?: string;
  versions: SignOffVersion[];
}

interface SignOffVersion {
  id: string;
  createdAt: string;
  title: string;
  content: any;
  isLatest: boolean;
}

const ClientSignOffPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [signOffItem, setSignOffItem] = useState<SignOffItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeVersion, setActiveVersion] = useState<string | null>(null);
  
  // Fetch sign-off data using the token
  useEffect(() => {
    const fetchSignOffData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.signoff.getClientItem(token || '');
        const data = response.data.data;
        setSignOffItem(data);
        
        // Set the active version to the latest version
        const latestVersion = data.versions.find((v: SignOffVersion) => v.isLatest);
        if (latestVersion) {
          setActiveVersion(latestVersion.id);
        }
      } catch (err: any) {
        console.error('Error fetching sign-off data:', err);
        setError(err.response?.data?.message || 'Failed to load sign-off data. The link may be invalid or expired.');
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchSignOffData();
    } else {
      setError('Invalid sign-off link. Please check the URL and try again.');
      setLoading(false);
    }
  }, [token]);
  
  // Open confirmation dialog
  const handleOpenDialog = (action: 'approve' | 'reject') => {
    setDialogAction(action);
    setDialogOpen(true);
  };
  
  // Close confirmation dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  // Handle sign-off response (approve or reject)
  const handleSubmitResponse = async () => {
    if (!signOffItem || !dialogAction) return;
    
    try {
      setSubmitting(true);
      const status = dialogAction === 'approve' ? 'approved' : 'rejected';
      
      await apiClient.signoff.clientRespond(token || '', status, comment);
      
      setSubmitted(true);
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Error submitting response:', err);
      setError(err.response?.data?.message || 'Failed to submit your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Switch between versions
  const handleVersionChange = (versionId: string) => {
    setActiveVersion(versionId);
  };
  
  // Get active version data
  const getActiveVersionContent = () => {
    if (!signOffItem || !activeVersion) return null;
    
    const version = signOffItem.versions.find(v => v.id === activeVersion);
    if (!version) return signOffItem.content;
    
    return version.content;
  };
  
  // Render loading state
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading sign-off request...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 5 }}>
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        </Box>
      </Container>
    );
  }
  
  // Render success state (after submission)
  if (submitted) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 5 }}>
          <Alert severity={dialogAction === 'approve' ? 'success' : 'info'}>
            <AlertTitle>
              {dialogAction === 'approve' ? 'Content Approved!' : 'Feedback Sent'}
            </AlertTitle>
            <Typography>
              {dialogAction === 'approve' 
                ? 'Thank you for your approval. The team will now proceed with the next steps.' 
                : 'Thank you for your feedback. The team will review your comments and make necessary revisions.'}
            </Typography>
          </Alert>
        </Box>
      </Container>
    );
  }
  
  // If no sign-off item found
  if (!signOffItem) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 5 }}>
          <Alert severity="warning">
            <AlertTitle>Content Not Found</AlertTitle>
            The requested content could not be found. The link may be invalid or expired.
          </Alert>
        </Box>
      </Container>
    );
  }
  
  // Get active content
  const activeContent = getActiveVersionContent();
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <AppBar position="static" color="default">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Client Review Portal
          </Typography>
          <Chip 
            label={signOffItem.status === 'pending' ? 'Awaiting Review' : 
                  signOffItem.status === 'approved' ? 'Approved' : 
                  signOffItem.status === 'rejected' ? 'Changes Requested' : 'Revised'}
            color={signOffItem.status === 'approved' ? 'success' : 
                 signOffItem.status === 'rejected' ? 'error' : 'default'}
          />
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Project Info */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            {signOffItem.title}
          </Typography>
          
          <Typography variant="body1" paragraph>
            <strong>Client:</strong> {signOffItem.content.brief.clientName}
          </Typography>
          
          <Typography variant="body1" paragraph>
            <strong>Project:</strong> {signOffItem.content.brief.projectName}
          </Typography>
          
          {signOffItem.versions.length > 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Versions:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {signOffItem.versions.map((version) => (
                  <Chip
                    key={version.id}
                    label={version.title || `Version ${new Date(version.createdAt).toLocaleDateString()}`}
                    onClick={() => handleVersionChange(version.id)}
                    color={version.id === activeVersion ? 'primary' : 'default'}
                    variant={version.id === activeVersion ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Paper>
        
        {/* Content for Review */}
        <Grid container spacing={4}>
          {/* Motivations */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Strategic Motivations
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {activeContent?.motivations.map((motivation: any) => (
                <Card key={motivation.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {motivation.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {motivation.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>
          
          {/* Copy */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Ad Copy
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Chip label={`Tone: ${activeContent?.copy.tone}`} size="small" sx={{ mr: 1 }} />
                <Chip label={`Style: ${activeContent?.copy.style}`} size="small" />
              </Box>
              
              {activeContent?.copy.frames.map((frame: string, index: number) => (
                <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Frame {index + 1}
                  </Typography>
                  <Typography variant="body1">
                    <FormatQuoteIcon fontSize="small" sx={{ opacity: 0.5, mr: 0.5, transform: 'scaleX(-1)' }} />
                    {frame}
                    <FormatQuoteIcon fontSize="small" sx={{ opacity: 0.5, ml: 0.5 }} />
                  </Typography>
                </Box>
              ))}
              
              {activeContent?.copy.callToAction && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Call to Action
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body1">
                      {activeContent.copy.callToAction}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
        
        {/* Feedback Section */}
        {signOffItem.status === 'pending' && (
          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Your Feedback
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Comments (optional)"
              placeholder="Add any feedback or comments here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              margin="normal"
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelOutlinedIcon />}
                onClick={() => handleOpenDialog('reject')}
              >
                Request Changes
              </Button>
              
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={() => handleOpenDialog('approve')}
              >
                Approve
              </Button>
            </Box>
          </Paper>
        )}
        
        {/* Previous comments */}
        {signOffItem.comments && (
          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Previous Feedback
            </Typography>
            
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body1">
                <ChatBubbleOutlineIcon fontSize="small" sx={{ opacity: 0.5, mr: 0.5 }} />
                {signOffItem.comments}
              </Typography>
            </Box>
          </Paper>
        )}
        
        {/* Confirmation Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
        >
          <DialogTitle>
            {dialogAction === 'approve' ? 'Confirm Approval' : 'Confirm Feedback'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {dialogAction === 'approve'
                ? 'Are you sure you want to approve this content? This will allow the team to proceed to the next stage.'
                : 'Are you sure you want to request changes? The team will receive your feedback and make revisions.'}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmitResponse} 
              color={dialogAction === 'approve' ? 'success' : 'primary'}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : dialogAction === 'approve' ? 'Approve' : 'Send Feedback'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default ClientSignOffPortal;