import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import TextsmsIcon from '@mui/icons-material/Textsms';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { RootState } from '../../store';
import { fetchTemplates } from '../../store/slices/templatesSlice';
import { fetchCampaigns } from '../../store/slices/campaignsSlice';
import PageHeader from '../../components/layout/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';

const steps = ['Select Template', 'Choose Campaign', 'Configure & Generate'];

const GeneratePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { templates, loading: templatesLoading } = useSelector((state: RootState) => state.templates);
  const { campaigns, loading: campaignsLoading } = useSelector((state: RootState) => state.campaigns);
  
  useEffect(() => {
    // @ts-ignore
    dispatch(fetchTemplates());
    // @ts-ignore
    dispatch(fetchCampaigns());
  }, [dispatch]);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedTemplateId(null);
    setSelectedCampaignId(null);
    setSuccess(false);
    setError(null);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    handleNext();
  };

  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    handleNext();
  };

  const handleGenerate = () => {
    setGenerating(true);
    setError(null);
    
    // Simulate generation process
    setTimeout(() => {
      setGenerating(false);
      setSuccess(true);
    }, 3000);
  };
  
  const handleNavigateToStrategy = () => {
    navigate('/generate/strategy');
  };
  
  const handleNavigateToMatrix = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`, { state: { tab: 1 } });
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select a Template
            </Typography>
            
            {templatesLoading ? (
              <LoadingScreen message="Loading templates..." />
            ) : templates.length === 0 ? (
              <Typography>No templates available. Please create a template first.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {templates.map(template => (
                  <Card 
                    key={template.id} 
                    sx={{ 
                      width: 280,
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardMedia
                      component="img"
                      height="160"
                      image={template.thumbnailUrl || 'https://via.placeholder.com/300x160?text=No+Preview'}
                      alt={template.name}
                    />
                    <CardContent>
                      <Typography variant="h6" component="div">
                        {template.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {template.description || 'No description available'}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose a Campaign
            </Typography>
            
            {campaignsLoading ? (
              <LoadingScreen message="Loading campaigns..." />
            ) : campaigns.length === 0 ? (
              <Typography>No campaigns available. Please create a campaign first.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {campaigns.map(campaign => (
                  <Card 
                    key={campaign.id} 
                    sx={{ 
                      width: 280,
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => handleCampaignSelect(campaign.id)}
                  >
                    <CardContent>
                      <Typography variant="h6" component="div">
                        {campaign.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Client: {campaign.client || 'Not specified'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {campaign.description || 'No description available'}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        );
      
      case 2:
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
        
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review and Generate
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ my: 2 }}>
                {error}
              </Alert>
            )}
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Selected Template
              </Typography>
              <Typography variant="body1">
                {selectedTemplate ? selectedTemplate.name : 'No template selected'}
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Selected Campaign
              </Typography>
              <Typography variant="body1">
                {selectedCampaign ? selectedCampaign.name : 'No campaign selected'}
              </Typography>
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerate}
                disabled={generating || !selectedTemplateId || !selectedCampaignId}
                startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
              >
                {generating ? 'Generating...' : 'Generate Now'}
              </Button>
            </Box>
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      <PageHeader 
        title="Generate Content"
        description="Create content by combining templates with campaign assets"
      />
      
      {/* New workflow boxes */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextsmsIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
              <Typography variant="h6">
                Strategy & Copy Generation
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              Generate strategic motivations and ad copy based on a client brief. This AI-assisted workflow helps create compelling messaging to use in your ads.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleNavigateToStrategy}
              startIcon={<EditIcon />}
            >
              Create Strategy & Copy
            </Button>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ViewModuleIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
              <Typography variant="h6">
                Visual Asset Matrix
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              Create combinations of visual and copy assets to generate multiple ad variations. This matrix view allows you to mix and match assets efficiently.
            </Typography>
            {campaigns.length > 0 ? (
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => handleNavigateToMatrix(campaigns[0].id)}
                startIcon={<ViewModuleIcon />}
              >
                Go to Asset Matrix
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="primary"
                disabled
                startIcon={<ViewModuleIcon />}
              >
                No Campaigns Available
              </Button>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Divider sx={{ mb: 4 }} />
      
      {/* Traditional generation flow */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Traditional Ad Generation
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {activeStep === steps.length ? (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              Content generated successfully!
            </Alert>
            <Typography variant="h6" gutterBottom>
              Next Steps
            </Typography>
            <Typography paragraph>
              Your content has been generated and is now available in the campaign executions. 
              You can view and manage these in the campaign details page.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button 
                variant="contained" 
                onClick={handleReset}
              >
                Generate More Content
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            {renderStepContent(activeStep)}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                color="inherit"
                disabled={activeStep === 0}
                onClick={handleBack}
                startIcon={<ArrowBackIcon />}
              >
                Back
              </Button>
              
              {activeStep < steps.length - 1 && (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={
                    (activeStep === 0 && !selectedTemplateId) ||
                    (activeStep === 1 && !selectedCampaignId)
                  }
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default GeneratePage;
