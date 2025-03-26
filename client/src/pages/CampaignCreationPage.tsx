import React, { useState } from 'react';
import {
  Box,
  Container,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Typography,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BriefAnalysis from '../components/strategy/BriefAnalysis';
import MotivationGrid from '../components/strategy/MotivationGrid';
import CopyGenerator, { CopyGenerationParams } from '../components/strategy/CopyGenerator';
import CopyVariationList from '../components/strategy/CopyVariationList';
import { useStrategyOperations } from '../hooks/useStrategyOperations';
import type { BriefAnalysisRequest, CopyGenerationRequest } from '../types/api';

const steps = [
  'Brief Analysis',
  'Strategic Motivations',
  'Copy Generation',
  'Matrix Setup',
];

const StyledContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(8),
}));

const CampaignCreationPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const {
    motivations,
    selectedMotivationIds,
    copyVariations,
    selectedVariationIds,
    status,
    error,
    isLoading,
    analyseBrief,
    regenerateMotivations,
    generateCopyVariations,
    toggleMotivation,
    toggleVariation,
  } = useStrategyOperations();

  const handleBriefAnalysis = async (request: BriefAnalysisRequest) => {
    try {
      await analyseBrief(request);
      setActiveStep(1);
    } catch (err) {
      // Error handling is managed by the hook
    }
  };

  const handleCopyGeneration = async (params: CopyGenerationParams) => {
    try {
      // Convert CopyGenerationParams to CopyGenerationRequest
      const request = {
        motivationIds: selectedMotivationIds,
        tone: params.tone,
        style: params.style,
        frameCount: params.frameCount,
        includeCta: params.includeCta,
        ctaText: params.ctaText,
      };
      
      await generateCopyVariations(request);
      setActiveStep(3);
    } catch (err) {
      // Error handling is managed by the hook
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return true; // Handled by BriefAnalysis component
      case 1:
        return selectedMotivationIds.length >= 6;
      case 2:
        return true; // Handled by CopyGenerator component
      case 3:
        return selectedVariationIds.length > 0;
      default:
        return false;
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <BriefAnalysis
            onAnalyse={handleBriefAnalysis}
            isLoading={isLoading}
            error={error?.processBrief || ''}
          />
        );
      case 1:
        return (
          <MotivationGrid
            motivations={motivations.map(m => ({
              id: m.id,
              title: m.title,
              description: m.description,
              reasoning: m.explanation || ''
            }))}
            selectedMotivations={selectedMotivationIds}
            onSelectMotivation={toggleMotivation}
            onRegenerateMotivations={() => regenerateMotivations('', '')} // TODO: Add brief ID and feedback
            isLoading={isLoading}
            error={error?.regenerateMotivations || ''}
          />
        );
      case 2:
        return (
          <CopyGenerator
            selectedMotivations={selectedMotivationIds}
            onGenerateCopy={handleCopyGeneration}
            isLoading={isLoading}
          />
        );
      case 3:
        return (
          <CopyVariationList
            variations={copyVariations.map(v => ({
              id: v.id,
              content: v.frames || [],
              tone: v.tone,
              style: v.style,
              motivation: 'Strategic Motivation' // Add a default motivation
            }))}
            selectedVariations={selectedVariationIds}
            onSelectVariation={toggleVariation}
          />
        );
      default:
        return null;
    }
  };

  return (
    <StyledContainer maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Campaign
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Follow the steps below to create your campaign using AI-powered strategic insights.
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3, mb: 3 }}>
        {getStepContent(activeStep)}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={activeStep === 0 || isLoading}
        >
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              // TODO: Handle campaign creation completion
            }}
            disabled={!canProceed() || isLoading}
          >
            Create Campaign
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
          >
            Next
          </Button>
        )}
      </Box>
    </StyledContainer>
  );
};

export default CampaignCreationPage;
