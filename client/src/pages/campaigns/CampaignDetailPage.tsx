import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { RootState } from '../../store';
import { fetchCampaignById, updateCampaign } from '../../store/slices/campaignsSlice';
import PageHeader from '../../components/layout/PageHeader';
import CampaignInfoForm from '../../components/campaigns/CampaignInfoForm';
import ExecutionsList from '../../components/campaigns/ExecutionsList';
import LoadingScreen from '../../components/common/LoadingScreen';
import CampaignMatrix from '../../components/campaign/CampaignMatrix';

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
      id={`campaign-tabpanel-${index}`}
      aria-labelledby={`campaign-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { campaigns, loading, error } = useSelector((state: RootState) => state.campaigns);
  const campaign = campaigns.find(c => c.id === id) || null;
  
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    client: '',
    description: '',
    platforms: [] as string[],
    status: 'draft',
    startDate: null as Date | null,
    endDate: null as Date | null
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [matrixId, setMatrixId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (id && (!campaign || Object.keys(campaign).length === 0)) {
      // @ts-ignore
      dispatch(fetchCampaignById(id));
    }
  }, [dispatch, id, campaign]);

  useEffect(() => {
    if (campaign) {
      setEditFormData({
        name: campaign.name || '',
        client: campaign.client || '',
        description: campaign.description || '',
        platforms: campaign.platforms || [],
        status: campaign.status || 'draft',
        startDate: campaign.startDate ? new Date(campaign.startDate) : null,
        endDate: campaign.endDate ? new Date(campaign.endDate) : null
      });
      
      if (campaign.matrixId) {
        setMatrixId(campaign.matrixId);
      }
    }
  }, [campaign]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBackClick = () => {
    navigate('/campaigns');
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (campaign) {
      setEditFormData({
        name: campaign.name || '',
        client: campaign.client || '',
        description: campaign.description || '',
        platforms: campaign.platforms || [],
        status: campaign.status || 'draft',
        startDate: campaign.startDate ? new Date(campaign.startDate) : null,
        endDate: campaign.endDate ? new Date(campaign.endDate) : null
      });
    }
    setIsEditing(false);
    setUpdateError(null);
    setUpdateSuccess(false);
  };

  const handleFormChange = (values: Partial<typeof editFormData>) => {
    setEditFormData(prev => ({
      ...prev,
      ...values
    }));
  };

  const handlePlatformsChange = (platforms: string[]) => {
    setEditFormData(prev => ({
      ...prev,
      platforms: platforms
    }));
  };

  const handleStatusChange = (status: string) => {
    setEditFormData(prev => ({
      ...prev,
      status: status
    }));
  };

  const handleSaveChanges = async () => {
    if (!id) return;
    
    setUpdateLoading(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    
    try {
      // @ts-ignore
      await dispatch(updateCampaign({ 
        id, 
        ...editFormData 
      })).unwrap();
      
      setIsEditing(false);
      setUpdateSuccess(true);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update campaign');
    } finally {
      setUpdateLoading(false);
    }
  };
  
  const handleMatrixSave = (savedMatrixId: string) => {
    setMatrixId(savedMatrixId);
    
    // Update campaign with matrix ID if it doesn't already have it
    if (id && savedMatrixId && (!campaign?.matrixId || campaign.matrixId !== savedMatrixId)) {
      // @ts-ignore
      dispatch(updateCampaign({
        id,
        matrixId: savedMatrixId
      }));
    }
  };

  const handleNavigateToStrategy = () => {
    navigate('/generate/strategy');
  };

  if (loading && !campaign) {
    return <LoadingScreen message="Loading campaign details..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          Error loading campaign: {error}
        </Typography>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBackClick}
          sx={{ mt: 2 }}
        >
          Back to Campaigns
        </Button>
      </Box>
    );
  }

  if (!campaign) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">
          Campaign not found
        </Typography>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBackClick}
          sx={{ mt: 2 }}
        >
          Back to Campaigns
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <PageHeader 
        title={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              sx={{ mr: 2 }}
              onClick={handleBackClick}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
            <Typography variant="h5" component="div">
              {campaign.name}
            </Typography>
          </Box>
        }
        description={`Client: ${campaign.client || 'Not specified'}`}
        actionButton={
          !isEditing && (
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />}
              onClick={handleEditClick}
            >
              Edit Campaign
            </Button>
          )
        }
      />

      {/* Status chip */}
      <Box sx={{ mb: 3 }}>
        <Chip 
          label={campaign.status || 'draft'} 
          color={campaign.status === 'active' ? 'success' : 'default'}
        />
      </Box>

      {updateSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Campaign updated successfully
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="campaign tabs"
        >
          <Tab label="Details" id="campaign-tab-0" aria-controls="campaign-tabpanel-0" />
          <Tab label="Asset Matrix" id="campaign-tab-1" aria-controls="campaign-tabpanel-1" />
          <Tab label="Executions" id="campaign-tab-2" aria-controls="campaign-tabpanel-2" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {isEditing ? (
            <Box>
              {updateError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {updateError}
                </Alert>
              )}
              
              <CampaignInfoForm 
                campaignInfo={editFormData}
                onChange={handleFormChange}
                onPlatformsChange={handlePlatformsChange}
                onStatusChange={handleStatusChange}
                errors={{}}
              />
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={handleCancelEdit}
                  disabled={updateLoading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleSaveChanges}
                  disabled={updateLoading}
                  startIcon={updateLoading ? <CircularProgress size={20} /> : undefined}
                >
                  {updateLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Client
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {campaign.client || 'Not specified'}
                </Typography>
                
                <Typography variant="subtitle1" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {campaign.description || 'No description'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Target Platforms
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {campaign.platforms && campaign.platforms.length > 0 ? (
                    campaign.platforms.map(platform => (
                      <Chip key={platform} label={platform} />
                    ))
                  ) : (
                    <Typography variant="body1">No platforms specified</Typography>
                  )}
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Created
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : 'Unknown date'}
                </Typography>
                
                <Typography variant="subtitle1" gutterBottom>
                  Last Updated
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {campaign.updatedAt ? new Date(campaign.updatedAt).toLocaleString() : 'Unknown date'}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleNavigateToStrategy}
                  >
                    Generate Copy & Strategy
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <CampaignMatrix 
            campaignId={id || ''} 
            matrixId={matrixId}
            onSave={handleMatrixSave}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <ExecutionsList campaignId={id || ''} />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default CampaignDetailPage;
