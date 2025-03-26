import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel, 
  Button,
  StepContent,
  Stack
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import TargetAudienceForm from './TargetAudienceForm';
import BrandVoiceForm from './BrandVoiceForm';
import CampaignGoalsForm from './CampaignGoalsForm';
import CompetitiveContextForm from './CompetitiveContextForm';
import ContentParametersForm from './ContentParametersForm';
import StrategyValidator from './StrategyValidator';

import { MarketingStrategy, StrategyAnalysis } from '../../../services/copyGeneration/types';

interface StrategyInputSectionProps {
  initialStrategy?: MarketingStrategy;
  onComplete: (strategy: MarketingStrategy, analysis: StrategyAnalysis) => void;
  onBack?: () => void;
}

/**
 * Strategy Input Section Component
 * 
 * Main component for the strategy input system that guides users
 * through structured input of marketing strategy elements.
 */
const StrategyInputSection: React.FC<StrategyInputSectionProps> = ({
  initialStrategy,
  onComplete,
  onBack
}) => {
  // Initialize with default strategy if not provided
  const [strategy, setStrategy] = useState<MarketingStrategy>(
    initialStrategy || {
      targetAudience: {
        demographics: '',
        psychographics: '',
        painPoints: [],
        goals: []
      },
      brandVoice: {
        tone: 'Professional',
        values: [],
        personality: '',
        uniqueSellingProposition: ''
      },
      campaignGoals: {
        primary: '',
        secondary: [],
        kpis: [],
        conversionAction: ''
      },
      competitiveContext: {
        mainCompetitors: [],
        differentiators: [],
        marketPositioning: ''
      },
      contentParameters: {
        maxLength: 300,
        requiredKeywords: [],
        forbiddenWords: [],
        mustIncludePhrases: []
      }
    }
  );
  
  const [activeStep, setActiveStep] = useState(0);
  const [strategyAnalysis, setStrategyAnalysis] = useState<StrategyAnalysis | null>(null);
  
  // Steps for the stepper
  const steps = [
    { label: 'Target Audience', component: TargetAudienceForm },
    { label: 'Brand Voice', component: BrandVoiceForm },
    { label: 'Campaign Goals', component: CampaignGoalsForm },
    { label: 'Competitive Context', component: CompetitiveContextForm },
    { label: 'Content Parameters', component: ContentParametersForm },
    { label: 'Review & Validate', component: StrategyValidator }
  ];
  
  // Handler for strategy changes
  const handleStrategyChange = (updatedStrategy: MarketingStrategy) => {
    setStrategy(updatedStrategy);
  };
  
  // Handler for analysis completion
  const handleAnalysisComplete = (analysis: StrategyAnalysis) => {
    setStrategyAnalysis(analysis);
  };
  
  // Handler for next step
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  // Handler for back step
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  // Handler for strategy completion
  const handleComplete = () => {
    if (strategyAnalysis) {
      onComplete(strategy, strategyAnalysis);
    }
  };
  
  // Render current step component
  const renderStepContent = (step: number) => {
    const CurrentComponent = steps[step].component;
    
    if (step === 5) { // Review & Validate step
      return (
        <CurrentComponent
          strategy={strategy}
          onAnalysisComplete={handleAnalysisComplete}
        />
      );
    }
    
    return (
      <CurrentComponent
        strategy={strategy}
        onStrategyChange={handleStrategyChange}
      />
    );
  };
  
  // Get disabled state for Next button based on step validation
  const isNextDisabled = () => {
    const { targetAudience, brandVoice, campaignGoals } = strategy;
    
    switch (activeStep) {
      case 0: // Target Audience
        return !targetAudience.demographics || !targetAudience.psychographics;
      case 1: // Brand Voice
        return !brandVoice.tone || !brandVoice.personality || !brandVoice.uniqueSellingProposition;
      case 2: // Campaign Goals
        return !campaignGoals.primary || !campaignGoals.conversionAction;
      case 5: // Review & Validate
        return !strategyAnalysis || strategyAnalysis.completeness < 0.5;
      default:
        return false;
    }
  };
  
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Marketing Strategy
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Develop a comprehensive marketing strategy to guide the copy generation process.
          Fill out each section to create a strategy that will produce the most effective copy.
        </Typography>
        
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={index}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Stack direction="row" spacing={2}>
                    {index === 0 && onBack ? (
                      <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={onBack}
                      >
                        Back to Dashboard
                      </Button>
                    ) : index > 0 ? (
                      <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBack}
                      >
                        Back
                      </Button>
                    ) : null}
                    
                    {index === steps.length - 1 ? (
                      <Button
                        variant="contained"
                        endIcon={<CheckCircleIcon />}
                        onClick={handleComplete}
                        disabled={isNextDisabled()}
                        color="success"
                      >
                        Complete Strategy
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        endIcon={<ArrowForwardIcon />}
                        onClick={handleNext}
                        disabled={isNextDisabled()}
                      >
                        Next
                      </Button>
                    )}
                  </Stack>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
};

export default StrategyInputSection;
