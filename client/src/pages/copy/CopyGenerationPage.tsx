import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Container, 
  Typography, 
  Stepper, 
  Step, 
  StepLabel, 
  Button,
  Paper,
  IconButton,
  Alert,
  Backdrop,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import { useNavigate } from 'react-router-dom';

import StrategyInputSection from '../../components/copyGeneration/StrategyInput/StrategyInputSection';
import CopyGenerationSection from '../../components/copyGeneration/CopyGeneration/CopyGenerationSection';
import CopyFinalizeSection from '../../components/copyGeneration/CopyRefinement/CopyFinalizeSection';

import { 
  analyzeStrategy, 
  generateCopy, 
  finalizeCopy, 
  setActiveStep,
  setSelectedVariation,
  resetState
} from '../../store/slices/copyGenerationSlice';
import { RootState, AppDispatch } from '../../store';
import { 
  MarketingStrategy, 
  CopyVariation, 
  StrategyAnalysis
} from '../../services/copyGeneration/types';

// Tab panel interface for copy generation steps
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * Tab Panel Component
 * 
 * Displays the content for each tab of the copy generation process
 */
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`copy-generation-tabpanel-${index}`}
      aria-labelledby={`copy-generation-tab-${index}`}
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

/**
 * Copy Generation Page
 * 
 * Main page component for the copy generation pipeline that
 * orchestrates the flow between strategy input, copy generation,
 * and copy refinement.
 */
const CopyGenerationPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  // Redux state
  const { 
    strategy, 
    strategyAnalysis, 
    variations, 
    selectedVariationId, 
    activeStep,
    loading,
    error
  } = useSelector((state: RootState) => state.copyGeneration);
  
  // Local state
  const [tabValue, setTabValue] = useState<number>(activeStep);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Effect to update tabs when active step changes
  useEffect(() => {
    setTabValue(activeStep);
  }, [activeStep]);
  
  // Selected variation
  const selectedVariation = variations.find(v => v.id === selectedVariationId);
  
  // Handler for strategy completion
  const handleStrategyComplete = (
    completedStrategy: MarketingStrategy, 
    analysis: StrategyAnalysis
  ) => {
    dispatch(analyzeStrategy({ strategy: completedStrategy, analysis }));
    dispatch(setActiveStep(1));
  };
  
  // Handler for generation completion
  const handleGenerationComplete = (newVariations: CopyVariation[]) => {
    dispatch(generateCopy(newVariations));
    
    // Select first variation if none is selected
    if (!selectedVariationId && newVariations.length > 0) {
      dispatch(setSelectedVariation(newVariations[0].id));
    }
  };
  
  // Handler for variation selection
  const handleSelectVariation = (variationId: string) => {
    dispatch(setSelectedVariation(variationId));
  };
  
  // Handler for variation editing
  const handleEditVariation = (variation: CopyVariation) => {
    setIsEditing(true);
  };
  
  // Handler for finalizing copy
  const handleFinalizeCopy = (variation: CopyVariation, comment: string, status: 'approved' | 'rejected') => {
    dispatch(finalizeCopy({ 
      variation: {
        ...variation,
        status
      }, 
      comment 
    }));
    
    // If approved, move to next step or finish
    if (status === 'approved') {
      // In a real app, you might save to database and redirect
      alert('Copy has been approved and saved!');
    }
  };
  
  // Handler for tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    dispatch(setActiveStep(newValue));
  };
  
  // Handler for back to dashboard
  const handleBackToDashboard = () => {
    // Ask for confirmation if there are unsaved changes
    if (variations.length > 0) {
      const confirm = window.confirm('You have unsaved copy variations. Are you sure you want to leave?');
      if (!confirm) return;
    }
    
    dispatch(resetState());
    navigate('/dashboard');
  };
  
  // Check if tabs should be disabled
  const isTabDisabled = (tabIndex: number): boolean => {
    switch (tabIndex) {
      case 0: // Strategy Input
        return false;
      case 1: // Copy Generation
        return !strategyAnalysis || strategyAnalysis.completeness < 0.5;
      case 2: // Copy Finalize
        return !selectedVariation;
      default:
        return false;
    }
  };
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton 
            onClick={handleBackToDashboard}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h4" component="h1">
            Copy Generation Pipeline
          </Typography>
          
          {activeStep > 0 && selectedVariation && (
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              sx={{ ml: 'auto' }}
              onClick={() => alert('Project saved!')} // Replace with actual save logic
            >
              Save Project
            </Button>
          )}
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Paper sx={{ mb: 4 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="copy generation steps"
          >
            <Tab 
              label="Strategy Input" 
              id="copy-generation-tab-0"
              aria-controls="copy-generation-tabpanel-0"
              disabled={isTabDisabled(0)} 
            />
            <Tab 
              label="Copy Generation" 
              id="copy-generation-tab-1"
              aria-controls="copy-generation-tabpanel-1"
              disabled={isTabDisabled(1)} 
            />
            <Tab 
              label="Copy Refinement" 
              id="copy-generation-tab-2"
              aria-controls="copy-generation-tabpanel-2"
              disabled={isTabDisabled(2)} 
            />
          </Tabs>
        </Paper>
        
        <TabPanel value={tabValue} index={0}>
          <StrategyInputSection
            initialStrategy={strategy}
            onComplete={handleStrategyComplete}
            onBack={handleBackToDashboard}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {strategyAnalysis ? (
            <CopyGenerationSection
              strategy={strategy}
              analysis={strategyAnalysis}
              onGenerationComplete={handleGenerationComplete}
            />
          ) : (
            <Alert severity="info">
              Please complete the strategy input step first.
            </Alert>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          {selectedVariation ? (
            <CopyFinalizeSection
              variation={selectedVariation}
              onApprove={(variation, comment) => 
                handleFinalizeCopy(variation, comment, 'approved')
              }
              onReject={(variation, reason) => 
                handleFinalizeCopy(variation, reason, 'rejected')
              }
              onEdit={handleEditVariation}
            />
          ) : (
            <Alert severity="info">
              Please select a copy variation to refine.
            </Alert>
          )}
        </TabPanel>
        
        {/* Loading indicator */}
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </Box>
    </Container>
  );
};

export default CopyGenerationPage;
