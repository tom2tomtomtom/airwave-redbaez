import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Container,
  Divider,
  useTheme,
  Chip
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Save as SaveIcon,
  Campaign as CampaignIcon,
  Collections as CollectionsIcon,
  VideoLibrary as VideoLibraryIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

import CampaignInfoForm from '../../components/campaigns/CampaignInfoForm';
import AssetSelectionStep from '../../components/campaigns/AssetSelectionStep';
import TemplateSelectionStep from '../../components/campaigns/TemplateSelectionStep';
import ExecutionSettingsStep from '../../components/campaigns/ExecutionSettingsStep';
import { createCampaign } from '../../store/slices/campaignsSlice';
import { AppDispatch } from '../../store';

const steps = [
  {
    label: 'Campaign Info',
    icon: <CampaignIcon />,
    description: 'Set up your campaign details',
  },
  {
    label: 'Select Assets',
    icon: <CollectionsIcon />,
    description: 'Choose assets for your campaign',
  },
  {
    label: 'Choose Templates',
    icon: <VideoLibraryIcon />,
    description: 'Select templates for your ads',
  },
  {
    label: 'Configure Executions',
    icon: <SettingsIcon />,
    description: 'Set up your ad executions',
  },
];

const CreateCampaignPage: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
  const [skipped, setSkipped] = useState(new Set<number>());
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    client: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    platforms: [] as string[],
    assets: [] as string[],
    templates: [] as string[],
    executions: [] as any[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isStepOptional = (step: number) => {
    return step === 1; // Make the assets step optional
  };

  const isStepSkipped = (step: number) => {
    return skipped.has(step);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return validateCampaignInfo();
      case 1:
        return true; // Asset selection is optional
      case 2:
        return campaignData.templates.length > 0;
      case 3:
        return campaignData.executions.length > 0;
      default:
        return true;
    }
  };

  const validateCampaignInfo = () => {
    const errors: Record<string, string> = {};
    
    if (!campaignData.name) {
      errors.name = 'Campaign name is required';
    }
    
    if (!campaignData.client) {
      errors.client = 'Client name is required';
    }
    
    if (campaignData.platforms.length === 0) {
      errors.platforms = 'At least one platform is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!isStepValid(activeStep)) {
      return;
    }
    
    let newSkipped = skipped;
    if (isStepSkipped(activeStep)) {
      newSkipped = new Set(newSkipped.values());
      newSkipped.delete(activeStep);
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped(newSkipped);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSkip = () => {
    if (!isStepOptional(activeStep)) {
      throw new Error("You can't skip a step that isn't optional.");
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped((prevSkipped) => {
      const newSkipped = new Set(prevSkipped.values());
      newSkipped.add(activeStep);
      return newSkipped;
    });
  };

  const handleReset = () => {
    setActiveStep(0);
    setCampaignData({
      name: '',
      description: '',
      client: '',
      startDate: null,
      endDate: null,
      platforms: [],
      assets: [],
      templates: [],
      executions: [],
    });
  };

  const handleCreateCampaign = async () => {
    try {
      await dispatch(createCampaign(campaignData)).unwrap();
      navigate('/campaigns');
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const handleCampaignInfoChange = (info: Partial<typeof campaignData>) => {
    setCampaignData(prev => ({
      ...prev,
      ...info
    }));
  };

  const handleAssetSelectionChange = (selectedAssets: string[]) => {
    setCampaignData(prev => ({
      ...prev,
      assets: selectedAssets
    }));
  };

  const handleTemplateSelectionChange = (selectedTemplates: string[]) => {
    setCampaignData(prev => ({
      ...prev,
      templates: selectedTemplates
    }));
  };

  const handleExecutionSettingsChange = (executions: any[]) => {
    setCampaignData(prev => ({
      ...prev,
      executions
    }));
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <CampaignInfoForm 
            campaignInfo={campaignData}
            onChange={handleCampaignInfoChange}
            errors={formErrors}
          />
        );
      case 1:
        return (
          <AssetSelectionStep 
            selectedAssets={campaignData.assets}
            onChange={handleAssetSelectionChange}
          />
        );
      case 2:
        return (
          <TemplateSelectionStep 
            selectedTemplates={campaignData.templates}
            platforms={campaignData.platforms}
            onChange={handleTemplateSelectionChange}
          />
        );
      case 3:
        return (
          <ExecutionSettingsStep 
            executions={campaignData.executions}
            templates={campaignData.templates}
            assets={campaignData.assets}
            onChange={handleExecutionSettingsChange}
          />
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CampaignIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Create New Campaign
          </Typography>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((step, index) => {
            const stepProps: { completed?: boolean } = {};
            const labelProps: { optional?: React.ReactNode } = {};
            
            if (isStepOptional(index)) {
              labelProps.optional = (
                <Typography variant="caption">Optional</Typography>
              );
            }
            
            if (isStepSkipped(index)) {
              stepProps.completed = false;
            }
            
            return (
              <Step key={step.label} {...stepProps}>
                <StepLabel 
                  StepIconProps={{
                    icon: step.icon
                  }}
                  {...labelProps}
                >
                  {step.label}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>

        {activeStep === steps.length ? (
          <Box sx={{ mt: 4, mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              Campaign Setup Complete
            </Typography>
            <Typography variant="subtitle1" paragraph>
              You have successfully set up your campaign. Review the details below and create the campaign when ready.
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 3, mt: 2, mb: 4 }}>
              <Typography variant="h6" gutterBottom>Campaign Summary</Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Name</Typography>
                <Typography variant="body1">{campaignData.name}</Typography>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Client</Typography>
                <Typography variant="body1">{campaignData.client}</Typography>
              </Box>
              
              {campaignData.description && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Description</Typography>
                  <Typography variant="body1">{campaignData.description}</Typography>
                </Box>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Platforms</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {campaignData.platforms.map(platform => (
                    <Chip key={platform} label={platform} size="small" />
                  ))}
                </Box>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Assets</Typography>
                <Typography variant="body1">
                  {campaignData.assets.length} assets selected
                </Typography>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Templates</Typography>
                <Typography variant="body1">
                  {campaignData.templates.length} templates selected
                </Typography>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Executions</Typography>
                <Typography variant="body1">
                  {campaignData.executions.length} executions configured
                </Typography>
              </Box>
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={handleReset}>
                Reset
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateCampaign}
                startIcon={<SaveIcon />}
              >
                Create Campaign
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            <Box sx={{ p: 3, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {steps[activeStep].label}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {steps[activeStep].description}
              </Typography>
              
              <Divider sx={{ mb: 3 }} />
              
              {getStepContent(activeStep)}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={activeStep === 0}
                startIcon={<BackIcon />}
              >
                Back
              </Button>
              
              <Box>
                {isStepOptional(activeStep) && (
                  <Button
                    variant="text"
                    onClick={handleSkip}
                    sx={{ mr: 1 }}
                  >
                    Skip
                  </Button>
                )}
                
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={activeStep === steps.length - 1 ? undefined : <NextIcon />}
                >
                  {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default CreateCampaignPage;