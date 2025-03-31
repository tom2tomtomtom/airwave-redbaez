import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  CardActions,
  Slider,
  InputAdornment,
  IconButton,
  Divider,
  Paper,
  FormControl,
  FormHelperText,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import { 
  ImageOutlined, 
  TextFields, 
  Refresh, 
  Download, 
  LibraryAdd, 
  Delete,
  InfoOutlined,
  ArrowForward,
  AutoFixHigh
} from '@mui/icons-material';
import { textToImagePlugin, TextToImageResult, TextToImageOptions } from '../../features/generation/plugins/TextToImagePlugin';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

const TextToImagePage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [styleReference, setStyleReference] = useState<File | null>(null);
  const [styleReferenceUrl, setStyleReferenceUrl] = useState<string | null>(null);
  const [styleStrength, setStyleStrength] = useState(0.5);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [numVariations, setNumVariations] = useState(1);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationResult, setGenerationResult] = useState<TextToImageResult | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  
  // Initialize WebSocket for real-time updates
  const { lastMessage } = useWebSocket('/generation');
  
  // Handle WebSocket messages for job status updates
  useEffect(() => {
    if (lastMessage && generationResult) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        // If the message is for our job, update the progress
        if (data.jobId === generationResult.jobId) {
          setProgress(data.progress || 0);
          
          // If the job is complete, get the final result
          if (data.status === 'succeeded') {
            fetchJobResult(data.jobId);
          } else if (data.status === 'failed') {
            setIsGenerating(false);
            enqueueSnackbar(`Generation failed: ${data.error || 'Unknown error'}`, { variant: 'error' });
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    }
  }, [lastMessage, generationResult, enqueueSnackbar]);
  
  // Fetch the current job result
  const fetchJobResult = async (jobId: string) => {
    try {
      const result = await textToImagePlugin.checkStatus(jobId);
      setGenerationResult(result);
      setIsGenerating(false);
      
      if (result.status === 'succeeded') {
        enqueueSnackbar('Images generated successfully!', { variant: 'success' });
      } else if (result.status === 'failed') {
        enqueueSnackbar(`Generation failed: ${result.error || 'Unknown error'}`, { variant: 'error' });
      }
    } catch (err) {
      console.error('Error fetching job result:', err);
      setIsGenerating(false);
      enqueueSnackbar('Failed to fetch generation result', { variant: 'error' });
    }
  };
  
  // Handle file selection for style reference
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setStyleReference(file);
      
      // Create a URL for preview
      const objectUrl = URL.createObjectURL(file);
      setStyleReferenceUrl(objectUrl);
      
      return () => URL.revokeObjectURL(objectUrl);
    }
  };
  
  // Clear the style reference
  const handleClearReference = () => {
    setStyleReference(null);
    if (styleReferenceUrl) {
      URL.revokeObjectURL(styleReferenceUrl);
      setStyleReferenceUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle generation button click
  const handleGenerate = async () => {
    if (!prompt) {
      enqueueSnackbar('Please enter a prompt', { variant: 'warning' });
      return;
    }
    
    setIsGenerating(true);
    setProgress(0);
    
    try {
      const options: TextToImageOptions = {
        prompt,
        negativePrompt: negativePrompt || undefined,
        styleReference,
        width,
        height,
        numVariations,
        styleStrength,
        seed
      };
      
      const result = await textToImagePlugin.generate(options);
      setGenerationResult(result);
      
      // Poll for status if not using WebSockets
      // This is a fallback mechanism
      if (result.status !== 'succeeded' && result.status !== 'failed') {
        const interval = setInterval(async () => {
          try {
            const updatedResult = await textToImagePlugin.checkStatus(result.jobId);
            setProgress(updatedResult.progress || 0);
            
            if (updatedResult.status === 'succeeded' || updatedResult.status === 'failed') {
              clearInterval(interval);
              setGenerationResult(updatedResult);
              setIsGenerating(false);
              
              if (updatedResult.status === 'succeeded') {
                enqueueSnackbar('Images generated successfully!', { variant: 'success' });
              } else {
                enqueueSnackbar(`Generation failed: ${updatedResult.error || 'Unknown error'}`, { variant: 'error' });
              }
            }
          } catch (err) {
            console.error('Error polling job status:', err);
            clearInterval(interval);
            setIsGenerating(false);
            enqueueSnackbar('Failed to check generation status', { variant: 'error' });
          }
        }, 2000);
        
        return () => clearInterval(interval);
      }
    } catch (err) {
      console.error('Error starting generation:', err);
      setIsGenerating(false);
      enqueueSnackbar('Failed to start image generation', { variant: 'error' });
    }
  };
  
  // Handle image selection
  const handleImageSelect = (index: number) => {
    setSelectedImageIndex(index);
    setPreviewDialogOpen(true);
  };
  
  // Navigate to asset library for the selected image
  const handleViewInLibrary = (assetId?: string) => {
    if (assetId) {
      navigate(`/assets/${assetId}`);
    } else {
      enqueueSnackbar('Asset ID not available', { variant: 'warning' });
    }
  };
  
  // Download the selected image
  const handleDownload = (imageUrl: string) => {
    // Extract filename from URL or create a default one
    const filename = imageUrl.split('/').pop() || `generated-image-${Date.now()}.png`;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Text to Image Generation
      </Typography>
      
      <Grid container spacing={3}>
        {/* Left side - Controls */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Generation Controls
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Prompt"
                multiline
                rows={4}
                fullWidth
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate"
                variant="outlined"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TextFields />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Negative Prompt"
                multiline
                rows={2}
                fullWidth
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Things to exclude from the image"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Delete />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Style Reference
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageOutlined />}
                >
                  Upload
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                </Button>
                
                {styleReference && (
                  <Button
                    variant="text"
                    color="error"
                    onClick={handleClearReference}
                    sx={{ ml: 1 }}
                  >
                    Clear
                  </Button>
                )}
              </Box>
              
              {styleReferenceUrl && (
                <Box sx={{ mt: 1, mb: 2, position: 'relative' }}>
                  <img
                    src={styleReferenceUrl}
                    alt="Style reference"
                    style={{ 
                      width: '100%', 
                      height: 150, 
                      objectFit: 'contain',
                      borderRadius: 4
                    }}
                  />
                </Box>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom>Style Strength: {styleStrength}</Typography>
                <Slider
                  value={styleStrength}
                  onChange={(_, value) => setStyleStrength(value as number)}
                  min={0}
                  max={1}
                  step={0.1}
                  disabled={!styleReference}
                />
                <FormHelperText>
                  How strongly to apply the reference style
                </FormHelperText>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Image Settings
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Width"
                  type="number"
                  fullWidth
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  inputProps={{ min: 256, max: 2048, step: 64 }}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Height"
                  type="number"
                  fullWidth
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  inputProps={{ min: 256, max: 2048, step: 64 }}
                  variant="outlined"
                  size="small"
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Number of Variations"
                type="number"
                fullWidth
                value={numVariations}
                onChange={(e) => setNumVariations(Number(e.target.value))}
                inputProps={{ min: 1, max: 9, step: 1 }}
                variant="outlined"
                size="small"
              />
              <FormHelperText>
                How many variations to generate (1-9)
              </FormHelperText>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Seed (Optional)"
                type="number"
                fullWidth
                value={seed || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSeed(value ? Number(value) : undefined);
                }}
                variant="outlined"
                size="small"
              />
              <FormHelperText>
                For reproducible results
              </FormHelperText>
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                startIcon={isGenerating ? <CircularProgress size={20} /> : <AutoFixHigh />}
              >
                {isGenerating ? `Generating... ${progress}%` : 'Generate Images'}
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Right side - Results */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Generated Images
            </Typography>
            
            {isGenerating ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                <CircularProgress size={60} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Generating your images...
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  {progress}% Complete
                </Typography>
              </Box>
            ) : generationResult?.images && generationResult.images.length > 0 ? (
              <Grid container spacing={2}>
                {generationResult.images.map((image, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardMedia
                        component="img"
                        height="200"
                        image={image.imageUrl}
                        alt={`Generated image ${index + 1}`}
                        sx={{ cursor: 'pointer', objectFit: 'contain' }}
                        onClick={() => handleImageSelect(index)}
                      />
                      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          Variation {index + 1}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Tooltip title="Download Image">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDownload(image.imageUrl)}
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="View in Asset Library">
                          <IconButton 
                            size="small"
                            onClick={() => handleViewInLibrary(image.assetId)}
                            disabled={!image.assetId}
                          >
                            <LibraryAdd />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                <ImageOutlined sx={{ fontSize: 80, color: 'text.disabled' }} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  No Images Generated Yet
                </Typography>
                <Typography variant="body1" color="textSecondary" align="center">
                  Enter a prompt and click "Generate Images" to create AI-generated images
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Image Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 1 }}>
          {selectedImageIndex !== null && generationResult?.images && generationResult.images[selectedImageIndex] && (
            <img
              src={generationResult.images[selectedImageIndex].imageUrl}
              alt={`Generated image ${selectedImageIndex + 1}`}
              style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          {selectedImageIndex !== null && generationResult?.images && generationResult.images[selectedImageIndex] && (
            <>
              <Button 
                onClick={() => handleDownload(generationResult.images[selectedImageIndex].imageUrl)}
                startIcon={<Download />}
              >
                Download
              </Button>
              <Button 
                onClick={() => handleViewInLibrary(generationResult.images[selectedImageIndex].assetId)}
                startIcon={<LibraryAdd />}
                disabled={!generationResult.images[selectedImageIndex].assetId}
              >
                View in Asset Library
              </Button>
            </>
          )}
          <Button onClick={() => setPreviewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TextToImagePage;
