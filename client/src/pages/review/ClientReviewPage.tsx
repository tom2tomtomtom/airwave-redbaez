// client/src/pages/review/ClientReviewPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  AlertTitle,
  Button,
  Chip,
  AppBar,
  Toolbar,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VideoCommenting from '../../components/signoff/VideoCommenting';
import RevisionCompare from '../../components/signoff/RevisionCompare';
import NotificationHub from '../../components/notifications/NotificationHub';
import axios from 'axios';
import { format } from 'date-fns';

// Import existing ClientSignOffPortal for the review content
import ClientSignOffPortal from '../../components/signoff/ClientSignOffPortal';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

interface Review {
  id: string;
  assetId: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected' | 'revised';
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  currentVersionId: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    createdAt: string;
    description: string;
    isLatest: boolean;
  }>;
  permissions: {
    canApprove: boolean;
    canComment: boolean;
    canEdit: boolean;
    canInviteReviewers: boolean;
    role: 'admin' | 'editor' | 'reviewer' | 'client';
  };
  timeBasedComments: Array<{
    id: string;
    timestamp: number;
    comment: string;
    createdAt: string;
    createdBy: {
      name: string;
      email: string;
      avatar?: string;
      role?: string;
    };
    resolved: boolean;
  }>;
  mediaUrls?: {
    video?: string;
    image?: string;
    audio?: string;
  };
}

const ClientReviewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/review/${token}`);
        const reviewData = response.data.data;
        setReview(reviewData);
        
        // Set the current version as default
        setSelectedVersionId(reviewData.currentVersionId);
      } catch (err: any) {
        console.error('Error fetching review data:', err);
        setError(err.response?.data?.message || 'Failed to load review data');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchReviewData();
    } else {
      setError('Invalid review token');
      setLoading(false);
    }
  }, [token]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionId(versionId);
    // Switch to the content tab
    setTabValue(0);
  };

  // Mock current user for demo purposes
  const currentUser = {
    id: 'user123',
    name: 'Client Reviewer',
    email: 'client@example.com',
    role: 'client',
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading review...
          </Typography>
        </Box>
      </Container>
    );
  }

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

  if (!review) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 5 }}>
          <Alert severity="warning">
            <AlertTitle>Review Not Found</AlertTitle>
            The requested review could not be found. The link may be invalid or expired.
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <AppBar position="static" color="default">
        <Toolbar>
          <Button 
            startIcon={<ArrowBackIcon />} 
            sx={{ mr: 2 }}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Client Review Portal
          </Typography>
          
          <Chip 
            label={review.status === 'pending' ? 'Awaiting Review' : 
                  review.status === 'approved' ? 'Approved' : 
                  review.status === 'rejected' ? 'Changes Requested' : 'Revised'}
            color={review.status === 'approved' ? 'success' : 
                 review.status === 'rejected' ? 'error' : 'default'}
            sx={{ mr: 2 }}
          />
          
          <NotificationHub userId={currentUser.id} />
        </Toolbar>
      </AppBar>
      
      {/* Review Info */}
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            {review.title}
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
            <Chip 
              icon={<CheckCircleIcon />}
              label={`Status: ${review.status === 'pending' ? 'Awaiting Review' : 
                    review.status === 'approved' ? 'Approved' : 
                    review.status === 'rejected' ? 'Changes Requested' : 'Revised'}`}
              color={review.status === 'approved' ? 'success' : 
                   review.status === 'rejected' ? 'error' : 'default'}
            />
            
            {selectedVersionId && review.versions.find(v => v.id === selectedVersionId) && (
              <Chip 
                icon={<HistoryIcon />}
                label={`Version ${review.versions.find(v => v.id === selectedVersionId)?.versionNumber}`}
                color="primary"
              />
            )}
            
            <Chip 
              label={`Created: ${format(new Date(review.createdAt), 'PPp')}`}
              variant="outlined"
            />
            
            <Chip 
              label={`By: ${review.createdBy.name}`}
              variant="outlined"
            />
          </Box>
        </Paper>
        
        {/* Tabs */}
        <Paper sx={{ width: '100%', mb: 4 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="review tabs"
            variant="fullWidth"
          >
            <Tab icon={<VisibilityIcon />} label="Content" id="tab-0" aria-controls="tabpanel-0" />
            
            {review.mediaUrls?.video && (
              <Tab icon={<ChatIcon />} label="Video Comments" id="tab-1" aria-controls="tabpanel-1" />
            )}
            
            <Tab icon={<HistoryIcon />} label="Revisions" id="tab-2" aria-controls="tabpanel-2" />
          </Tabs>
          
          <Divider />
          
          {/* Content Tab */}
          <TabPanel value={tabValue} index={0}>
            {/* 
              This is where we would normally render the ClientSignOffPortal
              with the selected version. For our plan, we'll modify the
              ClientSignOffPortal component later to accept a versionId prop.
            */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Content Preview</AlertTitle>
              Viewing {selectedVersionId === review.currentVersionId ? 'current' : 'previous'} version{' '}
              {review.versions.find(v => v.id === selectedVersionId)?.versionNumber}
            </Alert>
            
            {/* Here, we'd render the ClientSignOffPortal with the selected version */}
            <Box sx={{ border: 1, borderColor: 'divider', p: 3, borderRadius: 1, bgcolor: 'background.default' }}>
              <Typography variant="h6" gutterBottom>
                Content to be shown from ClientSignOffPortal component
              </Typography>
              <Typography variant="body2" paragraph>
                This will display the selected version's content from the ClientSignOffPortal component.
                The integration will be completed when we update that component to accept a versionId prop.
              </Typography>
            </Box>
          </TabPanel>
          
          {/* Video Comments Tab */}
          {review.mediaUrls?.video && (
            <TabPanel value={tabValue} index={1}>
              <VideoCommenting
                videoUrl={review.mediaUrls.video}
                assetId={review.assetId}
                reviewId={review.id}
                currentUser={currentUser}
                canComment={review.permissions.canComment}
                existingComments={review.timeBasedComments}
              />
            </TabPanel>
          )}
          
          {/* Revisions Tab */}
          <TabPanel value={tabValue} index={2}>
            <RevisionCompare
              assetId={review.assetId}
              revisions={review.versions.map(v => ({
                id: v.id,
                assetId: review.assetId,
                versionNumber: v.versionNumber,
                createdAt: v.createdAt,
                createdBy: review.createdBy,
                description: v.description,
                changeLog: [],
                previousVersionId: null,
                metadata: {},
                reviewStatus: review.status,
              }))}
              onVersionSelect={handleVersionSelect}
            />
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
};

export default ClientReviewPage;
