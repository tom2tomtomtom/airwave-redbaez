import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../../store';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Slider,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { RootState } from '../../store';
import { generateCopy, selectCopyVariation, resetCopyVariations } from '../../store/slices/llmSlice';
import PageHeader from '../../components/layout/PageHeader';
import type { Motivation, CopyVariation, CopyGenerationRequest } from '../../store/slices/llmSlice';

const toneOptions = [
  'Professional', 'Casual', 'Friendly', 'Authoritative', 
  'Humorous', 'Inspirational', 'Conversational', 'Urgent',
  'Informative', 'Enthusiastic', 'Compassionate', 'Bold'
];

const styleOptions = [
  'Storytelling', 'Direct', 'Question-based', 'Problem-solution',
  'Testimonial', 'Fact-based', 'Emotional', 'Feature-focused',
  'Benefit-focused', 'Comparison', 'How-to', 'Provocative'
];

const CopyGenerationPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  // Get state from Redux
  const {
    brief,
    motivations,
    selectedMotivations,
    copyVariations,
    selectedCopyVariation,
    loading,
    error: reduxError
  } = useSelector((state: RootState) => state.llm);

  // Local state
  const [copyRequest, setCopyRequest] = useState<CopyGenerationRequest>({
    motivationIds: selectedMotivations.map(m => m.id),
    tone: 'Professional',
    style: 'Direct',
    frameCount: 3,
    length: 'medium',
    includeCallToAction: true,
    callToActionText: 'Learn More'
  });
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  
  // Handle navigation back to strategy page
  const handleBackToStrategy = () => {
    navigate('/generate/strategy');
  };
  
  // Handle form changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCopyRequest(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle select changes
  const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setCopyRequest(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle slider change
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    setCopyRequest(prev => ({
      ...prev,
      frameCount: newValue as number
    }));
  };
  
  // Handle switch change
  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setCopyRequest(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Generate copy
  const handleGenerateCopy = () => {
    setError(null);
    if (selectedMotivations.length < 1) {
      setError('Please select at least one motivation');
      return;
    }
    
    // Ensure motivationIds are up to date
    const request = {
      ...copyRequest,
      motivationIds: selectedMotivations.map(m => m.id)
    };
    
    if (!brief) {
      setError('Brief data is missing');
      return;
    }
    
    dispatch(generateCopy({ 
      copyRequest: request, 
      briefData: brief, 
      motivations 
    }));
  };
  
  // Select a copy variation
  const handleSelectCopy = (variationId: string) => {
    dispatch(selectCopyVariation(variationId));
  };
  
  // Reset copy variations
  const handleResetCopy = () => {
    dispatch(resetCopyVariations());
  };
  
  // Send to client for sign-off
  const handleSendForSignOff = () => {
    if (!selectedCopyVariation) {
      setError('Please select a copy variation to send for sign-off');
      return;
    }
    
    // Navigate to sign-off page or open sign-off dialog
    setActiveStep(1);
  };
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Redirect to strategy page if no brief or motivations
  useEffect(() => {
    if (!brief || selectedMotivations.length < 1) {
      navigate('/generate/strategy');
    }
  }, [brief, selectedMotivations, navigate]);
  
  // Steps for the copywriting process
  const steps = ['Generate Copy', 'Client Sign-Off', 'Ready for Matrix'];
  
  // Render frame content
  const renderFrameContent = (frame: string, index: number) => {
    return (
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
    );
  };
  
  // Render content for each step
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Generate Copy
        return (
          <Box>
            <Grid container spacing={4}>
              {/* Copy Generation Settings */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Copy Settings
                  </Typography>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="tone-label">Tone</InputLabel>
                    <Select
                      labelId="tone-label"
                      id="tone"
                      name="tone"
                      value={copyRequest.tone}
                      label="Tone"
                      onChange={handleSelectChange as any}
                    >
                      {toneOptions.map(tone => (
                        <MenuItem key={tone} value={tone}>{tone}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="style-label">Style</InputLabel>
                    <Select
                      labelId="style-label"
                      id="style"
                      name="style"
                      value={copyRequest.style}
                      label="Style"
                      onChange={handleSelectChange as any}
                    >
                      {styleOptions.map(style => (
                        <MenuItem key={style} value={style}>{style}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography id="frame-count-slider" gutterBottom>
                      Frame Count: {copyRequest.frameCount}
                    </Typography>
                    <Slider
                      aria-labelledby="frame-count-slider"
                      value={copyRequest.frameCount}
                      onChange={handleSliderChange}
                      step={1}
                      marks
                      min={1}
                      max={6}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="length-label">Length</InputLabel>
                    <Select
                      labelId="length-label"
                      id="length"
                      name="length"
                      value={copyRequest.length}
                      label="Length"
                      onChange={handleSelectChange as any}
                    >
                      <MenuItem value="short">Short (1-2 sentences)</MenuItem>
                      <MenuItem value="medium">Medium (2-3 sentences)</MenuItem>
                      <MenuItem value="long">Long (3-5 sentences)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={copyRequest.includeCallToAction}
                        onChange={handleSwitchChange}
                        name="includeCallToAction"
                      />
                    }
                    label="Include Call to Action"
                    sx={{ mt: 2 }}
                  />
                  
                  {copyRequest.includeCallToAction && (
                    <TextField
                      fullWidth
                      label="Call to Action Text"
                      name="callToActionText"
                      value={copyRequest.callToActionText}
                      onChange={handleInputChange}
                      margin="normal"
                    />
                  )}
                  
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handleGenerateCopy}
                      disabled={loading.generatingCopy}
                      startIcon={loading.generatingCopy ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                      {loading.generatingCopy ? 'Generating...' : 'Generate Copy'}
                    </Button>
                  </Box>
                </Paper>
              </Grid>
              
              {/* Selected Motivations */}
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Selected Motivations ({selectedMotivations.length})
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {selectedMotivations.map(motivation => (
                      <Chip 
                        key={motivation.id}
                        label={motivation.title.replace('Motivation: ', '')}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>View Motivation Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {selectedMotivations.map(motivation => (
                          <Grid item xs={12} key={motivation.id}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                              <Typography variant="subtitle1" gutterBottom>
                                {motivation.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {motivation.description}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Paper>
                
                {/* Copy Variations */}
                {copyVariations.length > 0 && (
                  <Paper sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Copy Variations
                      </Typography>
                      <Box>
                        <Button
                          startIcon={<RefreshIcon />}
                          onClick={handleResetCopy}
                          sx={{ mr: 1 }}
                        >
                          Reset
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<SendIcon />}
                          onClick={handleSendForSignOff}
                          disabled={!selectedCopyVariation}
                        >
                          {selectedCopyVariation ? 'Send Selected Copy for Sign-Off' : 'Select a Copy Variation First'}
                        </Button>
                      </Box>
                    </Box>
                    
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                      <Tabs value={tabValue} onChange={handleTabChange} aria-label="copy variations tabs">
                        {copyVariations.map((variation, index) => (
                          <Tab 
                            key={variation.id} 
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {variation.selected && <ThumbUpIcon fontSize="small" sx={{ mr: 0.5, color: 'success.main' }} />}
                                {`Variation ${index + 1}`}
                              </Box>
                            } 
                            id={`copy-tab-${index}`}
                            aria-controls={`copy-tabpanel-${index}`}
                            sx={variation.selected ? { color: 'success.main' } : {}}
                          />
                        ))}
                      </Tabs>
                    </Box>
                    
                    {copyVariations.map((variation, index) => (
                      <Box
                        key={variation.id}
                        role="tabpanel"
                        hidden={tabValue !== index}
                        id={`copy-tabpanel-${index}`}
                        aria-labelledby={`copy-tab-${index}`}
                        sx={{ mt: 2 }}
                      >
                        {tabValue === index && (
                          <Box>
                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                              <Chip label={`Tone: ${variation.tone}`} size="small" />
                              <Chip label={`Style: ${variation.style}`} size="small" />
                              {variation.selected && 
                                <Chip 
                                  label="Selected for Matrix" 
                                  color="success" 
                                  size="small"
                                  icon={<ThumbUpIcon fontSize="small" />}
                                />
                              }
                            </Box>
                            
                            <Typography variant="subtitle1" gutterBottom>
                              Ad Frame Copy
                            </Typography>
                            
                            {variation.frames.map((frame, frameIndex) => (
                              renderFrameContent(frame, frameIndex)
                            ))}
                            
                            {variation.callToAction && (
                              <Box sx={{ mt: 3 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                  Call to Action
                                </Typography>
                                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                  <Typography variant="body1">
                                    {variation.callToAction}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                            
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                            borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                              <Typography variant="body2" color={variation.selected ? "success.main" : "text.secondary"}>
                                {variation.selected ? "✓ This variation will be stored in the matrix" : "Select this variation to store in the matrix"}
                              </Typography>
                              <Button
                                variant={variation.selected ? "contained" : "outlined"}
                                color={variation.selected ? "success" : "primary"}
                                onClick={() => handleSelectCopy(variation.id)}
                                startIcon={variation.selected ? <ThumbUpIcon /> : null}
                                sx={{ minWidth: '200px' }}
                              >
                                {variation.selected ? "Selected for Matrix" : "Select for Matrix"}
                              </Button>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Paper>
                )}
              </Grid>
            </Grid>
          </Box>
        );
      
      case 1: // Client Sign-Off
        return (
          <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Send for Client Sign-Off
              </Typography>
              
              <Typography variant="body1" paragraph>
                You are about to send the selected copy and motivations for client review and approval.
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="clientEmail"
                    placeholder="client@example.com"
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Client Name"
                    name="clientName"
                    defaultValue={brief?.clientName || ''}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Message to Client"
                    name="clientMessage"
                    multiline
                    rows={3}
                    margin="normal"
                    defaultValue={`Please review and approve the copy for the ${brief?.projectName || 'project'}.`}
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => setActiveStep(0)} 
                  sx={{ mr: 2 }}
                >
                  Back to Copy
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => setActiveStep(2)}
                >
                  Send for Review
                </Button>
              </Box>
            </Paper>
          </Box>
        );
      
      case 2: // Confirmation
        return (
          <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                Copy has been sent for client sign-off!
              </Alert>
              
              <Typography variant="body1" paragraph>
                The selected copy and motivations have been sent to the client for review.
                You will receive notifications when the client reviews or approves the content.
              </Typography>
              
              <Typography variant="body1" paragraph>
                Once approved, the copy will be available for use in the Campaign Matrix.
              </Typography>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/campaigns')}
                >
                  Go to Campaigns
                </Button>
              </Box>
            </Paper>
          </Box>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <PageHeader 
        title="Copy Generation" 
        description="Create compelling ad copy based on selected motivations"
      />
      
      {/* Error Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {reduxError.generateCopy && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {reduxError.generateCopy}
        </Alert>
      )}
      
      {/* Back to Strategy Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToStrategy}
        >
          Back to Strategy
        </Button>
      </Box>
      
      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {renderStepContent()}
      </Paper>
    </Box>
  );
};

export default CopyGenerationPage;