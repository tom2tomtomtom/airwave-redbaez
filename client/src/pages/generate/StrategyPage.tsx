import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store/index';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  Chip,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  InputAdornment,
  Tooltip,
  LinearProgress,
  TextField
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { RootState } from '../../store';
import { processBrief, regenerateMotivations, toggleMotivationSelection } from '../../store/slices/llmSlice';
import apiClient from '../../utils/api';
import PageHeader from '../../components/layout/PageHeader';
import type { Motivation } from '../../store/slices/llmSlice';

// Define properly typed dispatch hook
const useAppDispatch = () => useDispatch<AppDispatch>();

const StrategyPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // Local state for the simplified workflow
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showExplanation, setShowExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get state from Redux
  const { 
    motivations,
    selectedMotivations,
    loading,
    error: reduxError,
    brief
  } = useSelector((state: RootState) => state.llm);

  // Check if we can proceed to copy generation
  const canProceedToCopy = selectedMotivations.length >= 6;

  // Handle brief file upload and trigger processing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setBriefFile(file);
      
      // Clear any previous errors
      setError(null);
      
      // Show feedback that file was selected
      setSuccessMessage(`Brief "${file.name}" selected. Click 'Generate Motivations' to continue.`);
    }
  };

  // Process the uploaded brief file and directly generate motivations
  const processBriefFile = async () => {
    if (!briefFile) {
      setError('Please upload a brief document first');
      return;
    }
    
    setIsFileUploading(true);
    setIsProcessing(true);
    setError(null);
    setSuccessMessage('Processing your brief...');
    
    try {
      // Send the file to the API for processing
      const formData = new FormData();
      formData.append('brief', briefFile);
      
      const response = await apiClient.strategy.processBrief(formData);
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Failed to process brief');
      }
      
      console.log('Server response:', response.data);
      
      // Handle both the brief data and motivations
      if (response.data.data.briefData) {
        // If motivations were generated directly
        if (response.data.data.motivations) {
          dispatch(processBrief({
            briefData: response.data.data.briefData,
            motivations: response.data.data.motivations
          }) as any);
          setSuccessMessage('Motivations generated successfully!');
        } else {
          // If only brief data was returned, dispatch it to generate motivations
          dispatch(processBrief(response.data.data.briefData) as any);
          setSuccessMessage('Brief processed, generating motivations...');
        }
      } else {
        throw new Error('No brief data received from server');
      }
    } catch (err: any) {
      console.error('Error processing brief:', err);
      setError(`Failed to process brief: ${err.message || 'Unknown error'}`);
    } finally {
      setIsFileUploading(false);
      setIsProcessing(false);
    }
  };

  // We don't need a separate submit function now - brief upload directly generates motivations

  // Submit feedback to regenerate motivations
  const handleRegenerateMotivations = () => {
    if (!feedback.trim()) {
      setError('Please provide feedback for regeneration');
      return;
    }
    
    if (!brief) {
      setError('Cannot regenerate motivations: Brief data is missing');
      return;
    }
    
    setError(null);
    setIsProcessing(true);
    dispatch(regenerateMotivations({ briefData: brief, feedback }) as any);
    setFeedback('');
    setSuccessMessage('Regenerating motivations based on your feedback...');
  };

  // Toggle motivation selection
  const handleToggleSelection = (motivationId: string) => {
    dispatch(toggleMotivationSelection(motivationId));
  };

  // Navigate to copy generation page
  const handleProceedToCopy = () => {
    if (canProceedToCopy) {
      navigate('/generate/copy');
    } else {
      setError('Please select at least 6 motivations to proceed');
    }
  };
  
  // Reset isProcessing when loading state changes
  useEffect(() => {
    if (!loading.processingBrief && isProcessing) {
      setIsProcessing(false);
    }
  }, [loading.processingBrief, isProcessing]);

  return (
    <Box sx={{ padding: 3 }}>
      <PageHeader 
        title="Strategy Development" 
        description="Upload your brief document to generate strategic motivations"
      />
      
      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {reduxError.processBrief && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {reduxError.processBrief}
        </Alert>
      )}
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
      
      {/* Brief Upload Section */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2, textAlign: 'center' }}>
          Client Brief Upload
        </Typography>
        
        <Box sx={{ 
          border: '2px dashed #ccc', 
          borderRadius: 2, 
          p: 4, 
          mb: 3, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          backgroundColor: '#f9f9f9'
        }}>
          <CloudUploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          
          <Button
            component="label"
            variant="contained"
            color="primary"
            size="large"
            startIcon={<UploadFileIcon />}
            sx={{ 
              mb: 2,
              minWidth: 220,
              py: 1.5
            }}
            disabled={isFileUploading}
          >
            {isFileUploading ? 'Uploading...' : 'Select Brief File'}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              hidden
              onChange={handleFileChange}
              disabled={isFileUploading}
            />
          </Button>
          
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Upload a PDF, Word document or text file
          </Typography>
          
          {briefFile && (
            <Chip 
              label={briefFile.name} 
              onDelete={() => setBriefFile(null)}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        
        {briefFile && (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={processBriefFile}
              disabled={isFileUploading || isProcessing || loading.processingBrief}
              startIcon={isFileUploading || isProcessing || loading.processingBrief ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ minWidth: 220 }}
            >
              {isFileUploading || isProcessing || loading.processingBrief ? 'Processing...' : 'Generate Motivations'}
            </Button>
            
            {(isProcessing || loading.processingBrief) && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  Analysing your brief and generating motivations...
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>
      
      {/* Motivations Section */}
      {motivations.length > 0 ? (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Strategic Motivations
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                (Select at least 6)
              </Typography>
            </Typography>
            
            <Box>
              <TextField
                label="Feedback for regeneration"
                variant="outlined"
                size="small"
                value={feedback}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeedback(e.target.value)}
                sx={{ mr: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Provide specific feedback or ask questions to refine the motivations">
                        <IconButton edge="end" size="small">
                          <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRegenerateMotivations}
                disabled={!feedback.trim() || loading.regeneratingMotivations}
              >
                {loading.regeneratingMotivations ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </Box>
          </Box>
          
          <Grid container spacing={3}>
            {motivations.map((motivation: Motivation) => (
              <Grid item xs={12} sm={6} md={4} key={motivation.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    border: motivation.selected ? '2px solid #4caf50' : 'none',
                    position: 'relative'
                  }}
                >
                  {motivation.selected && (
                    <CheckCircleIcon 
                      color="success" 
                      sx={{ 
                        position: 'absolute', 
                        right: 8, 
                        top: 8,
                        backgroundColor: 'white',
                        borderRadius: '50%'
                      }} 
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="div" gutterBottom>
                      {motivation.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {motivation.description}
                    </Typography>
                    
                    {showExplanation === motivation.id && (
                      <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {motivation.explanation}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<VisibilityIcon />}
                      onClick={() => setShowExplanation(showExplanation === motivation.id ? null : motivation.id)}
                    >
                      {showExplanation === motivation.id ? 'Hide Explanation' : 'Show Explanation'}
                    </Button>
                    <Button 
                      size="small"
                      color={motivation.selected ? "success" : "primary"}
                      onClick={() => handleToggleSelection(motivation.id)}
                      sx={{ ml: 'auto' }}
                    >
                      {motivation.selected ? 'Selected' : 'Select'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>
              Selected: <strong>{selectedMotivations.length}</strong> of <strong>6 required</strong>
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleProceedToCopy}
              disabled={!canProceedToCopy}
            >
              Proceed to Copy Generation
            </Button>
          </Box>
        </Paper>
      ) : briefFile ? (
        <Paper sx={{ p: 4, mb: 4, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Motivations Available
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            We couldn't generate motivations from your brief. Please try uploading a different brief document.
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={() => setBriefFile(null)}
          >
            Upload a Different Brief
          </Button>
        </Paper>
      ) : null}
    </Box>
  );
};

export default StrategyPage;