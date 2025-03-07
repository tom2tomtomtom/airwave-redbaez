import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  Divider, 
  Chip,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  InputAdornment,
  Tooltip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { RootState } from '../../store';
import { processBrief, regenerateMotivations, toggleMotivationSelection } from '../../store/slices/llmSlice';
import PageHeader from '../../components/layout/PageHeader';
import type { BriefData, Motivation } from '../../store/slices/llmSlice';

const StrategyPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Local state
  const [briefData, setBriefData] = useState<BriefData>({
    clientName: '',
    projectName: '',
    productDescription: '',
    targetAudience: '',
    competitiveContext: '',
    campaignObjectives: '',
    keyMessages: '',
    mandatories: '',
    additionalInfo: '',
    tonePreference: ''
  });
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showExplanation, setShowExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get state from Redux
  const { 
    motivations,
    selectedMotivations,
    loading,
    error: reduxError
  } = useSelector((state: RootState) => state.llm);

  // Check if we can proceed to copy generation
  const canProceedToCopy = selectedMotivations.length >= 6;

  // Handle brief form change
  const handleBriefChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBriefData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle brief file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBriefFile(e.target.files[0]);
    }
  };

  // Process the uploaded brief file
  const processBriefFile = async () => {
    if (!briefFile) return;
    
    setIsFileUploading(true);
    setError(null);
    
    try {
      // Simulate parsing the brief file
      // In a real implementation, you would parse the file contents here
      // For this prototype, we'll simulate a delay and fill the form with mock data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Populate the form with mock data from the file
      setBriefData({
        clientName: 'Client from File',
        projectName: 'Project from File',
        productDescription: 'This is a product description extracted from the uploaded brief file.',
        targetAudience: 'Target audience details extracted from the file.',
        competitiveContext: 'Competitive context extracted from the file.',
        campaignObjectives: 'Campaign objectives extracted from the file.',
        keyMessages: 'Key messages extracted from the file.',
        mandatories: 'Mandatories extracted from the file.',
        additionalInfo: 'Additional information extracted from the file.',
        tonePreference: 'Tone preference extracted from the file.'
      });
      
      setSuccessMessage('Brief file processed successfully!');
    } catch (err) {
      setError('Failed to process brief file. Please try again or fill the form manually.');
    } finally {
      setIsFileUploading(false);
    }
  };

  // Submit the brief to generate motivations
  const handleSubmitBrief = () => {
    // Validate required fields
    const requiredFields = [
      'clientName', 'projectName', 'productDescription', 
      'targetAudience', 'campaignObjectives'
    ];
    
    const missingFields = requiredFields.filter(field => !briefData[field as keyof BriefData]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    setError(null);
    dispatch(processBrief(briefData) as any);
  };

  // Submit feedback to regenerate motivations
  const handleRegenerateMotivations = () => {
    if (!feedback.trim()) {
      setError('Please provide feedback for regeneration');
      return;
    }
    
    setError(null);
    dispatch(regenerateMotivations({ briefData, feedback }) as any);
    setFeedback('');
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

  // Process the brief file when selected
  useEffect(() => {
    if (briefFile) {
      processBriefFile();
    }
  }, [briefFile]);

  return (
    <Box sx={{ padding: 3 }}>
      <PageHeader 
        title="Strategy Development" 
        description="Upload a brief or fill in the details to generate strategic motivations"
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
      
      {/* Brief Upload/Input Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Client Brief
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            sx={{ mr: 2 }}
            disabled={isFileUploading}
          >
            {isFileUploading ? 'Uploading...' : 'Upload Brief File'}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              hidden
              onChange={handleFileChange}
              disabled={isFileUploading}
            />
          </Button>
          
          {briefFile && (
            <Chip 
              label={briefFile.name} 
              onDelete={() => setBriefFile(null)}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        
        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            OR ENTER BRIEF DETAILS MANUALLY
          </Typography>
        </Divider>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Client Name*"
              name="clientName"
              value={briefData.clientName}
              onChange={handleBriefChange}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Project Name*"
              name="projectName"
              value={briefData.projectName}
              onChange={handleBriefChange}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Product Description*"
              name="productDescription"
              value={briefData.productDescription}
              onChange={handleBriefChange}
              required
              multiline
              rows={3}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Target Audience*"
              name="targetAudience"
              value={briefData.targetAudience}
              onChange={handleBriefChange}
              required
              multiline
              rows={2}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Competitive Context"
              name="competitiveContext"
              value={briefData.competitiveContext}
              onChange={handleBriefChange}
              multiline
              rows={2}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Campaign Objectives*"
              name="campaignObjectives"
              value={briefData.campaignObjectives}
              onChange={handleBriefChange}
              required
              multiline
              rows={2}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Key Messages"
              name="keyMessages"
              value={briefData.keyMessages}
              onChange={handleBriefChange}
              multiline
              rows={2}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Mandatories"
              name="mandatories"
              value={briefData.mandatories}
              onChange={handleBriefChange}
              multiline
              rows={2}
              margin="normal"
              helperText="Brand elements or disclaimers that must be included"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Additional Information"
              name="additionalInfo"
              value={briefData.additionalInfo || ''}
              onChange={handleBriefChange}
              multiline
              rows={2}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Tone Preference"
              name="tonePreference"
              value={briefData.tonePreference || ''}
              onChange={handleBriefChange}
              margin="normal"
              helperText="E.g., professional, casual, humorous, etc."
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitBrief}
            disabled={loading.processingBrief}
            startIcon={loading.processingBrief ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading.processingBrief ? 'Processing...' : 'Generate Motivations'}
          </Button>
        </Box>
      </Paper>
      
      {/* Motivations Section */}
      {motivations.length > 0 && (
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
                onChange={(e) => setFeedback(e.target.value)}
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
      )}
    </Box>
  );
};

export default StrategyPage;