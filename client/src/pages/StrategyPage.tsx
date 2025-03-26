import React, { useState } from 'react';
import { Container, Box, Stepper, Step, StepLabel, Paper, Button } from '@mui/material';
import MotivationGrid, { Motivation } from '../components/strategy/MotivationGrid';
import CopyGenerator, { CopyGenerationParams } from '../components/strategy/CopyGenerator';
import CopyVariationList, { CopyVariation } from '../components/strategy/CopyVariationList';

const steps = ['Select Motivations', 'Generate Copy', 'Review & Select'];

const StrategyPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedMotivations, setSelectedMotivations] = useState<string[]>([]);
  const [motivations, setMotivations] = useState<Motivation[]>([]);
  const [copyVariations, setCopyVariations] = useState<CopyVariation[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleMotivationSelect = (id: string) => {
    setSelectedMotivations((prev) => {
      if (prev.includes(id)) {
        return prev.filter((m) => m !== id);
      }
      return [...prev, id];
    });
  };

  const handleRegenerateMotivations = async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      // TODO: Implement API call to regenerate motivations
      // const response = await api.regenerateMotivations();
      // setMotivations(response.motivations);
    } catch (err) {
      setError('Failed to regenerate motivations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCopy = async (params: CopyGenerationParams) => {
    setIsLoading(true);
    setError(undefined);
    try {
      // TODO: Implement API call to generate copy variations
      // const response = await api.generateCopyVariations({
      //   motivations: selectedMotivations,
      //   ...params,
      // });
      // setCopyVariations(response.variations);
      setActiveStep(2);
    } catch (err) {
      setError('Failed to generate copy variations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyVariationSelect = (id: string) => {
    setSelectedVariations((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id);
      }
      return [...prev, id];
    });
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <MotivationGrid
            motivations={motivations}
            selectedMotivations={selectedMotivations}
            onSelectMotivation={handleMotivationSelect}
            onRegenerateMotivations={handleRegenerateMotivations}
            isLoading={isLoading}
            error={error}
          />
        );
      case 1:
        return (
          <CopyGenerator
            selectedMotivations={selectedMotivations}
            onGenerateCopy={handleGenerateCopy}
            isLoading={isLoading}
          />
        );
      case 2:
        return (
          <CopyVariationList
            variations={copyVariations}
            selectedVariations={selectedVariations}
            onSelectVariation={handleCopyVariationSelect}
          />
        );
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return selectedMotivations.length >= 6;
      case 1:
        return true; // Validation handled in CopyGenerator
      case 2:
        return selectedVariations.length > 0;
      default:
        return false;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper sx={{ p: 3 }}>
          {getStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                disabled={!canProceed()}
                onClick={() => {
                  // TODO: Handle final submission
                }}
              >
                Finish
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                disabled={!canProceed()}
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default StrategyPage;
