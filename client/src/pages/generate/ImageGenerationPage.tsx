import React, { useState, useEffect, useRef } from 'react';
import { SelectChangeEvent } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  TextField,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  FormControlLabel,
  Switch,
  Divider,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { AppDispatch, RootState } from '../../store';
import { fetchAssets } from '../../store/slices/assetsSlice';
import apiClient from '../../api/apiClient';

// Image aspect ratio options
const aspectRatioOptions = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '4:5', label: 'Portrait (4:5)' },
  { value: '9:16', label: 'Story (9:16)' }
];

// Image style options
const styleOptions = [
  'Photorealistic',
  'Cartoon',
  'Watercolour',
  'Abstract',
  'Minimalist',
  '3D Render',
  'Sketch',
  'Film',
  'Vintage'
];

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  saved: boolean;
}

const ImageGenerationPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  
  // Local state
  const [prompt, setPrompt] = useState<string>('');
  const [style, setStyle] = useState<string>('Photorealistic');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [quality, setQuality] = useState<number>(75);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [withLogo, setWithLogo] = useState<boolean>(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // API key is now managed by the server

  // Handle prompt change
  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  };

  // Handle style change
  const handleStyleChange = (e: SelectChangeEvent<string>) => {
    setStyle(e.target.value);
  };

  // Handle aspect ratio change
  const handleAspectRatioChange = (e: SelectChangeEvent<string>) => {
    setAspectRatio(e.target.value);
  };

  // Handle quality slider change
  const handleQualityChange = (_event: Event, value: number | number[]) => {
    setQuality(value as number);
  };

  // Handle negative prompt change
  const handleNegativePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNegativePrompt(e.target.value);
  };

  // Handle toggle logo
  const handleToggleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWithLogo(e.target.checked);
  };

  // Poll for image render completion
  const pollImageRender = async (jobId: string): Promise<any> => {
    if (!jobId) {
      console.error('No job ID provided for polling');
      throw new Error('No job ID provided for polling');
    }

    console.log(`Starting to poll for image render job: ${jobId}`);
    
    // With Runway API, most images should be available immediately, but we'll poll just in case
    // Try for up to 60 seconds (12 attempts, 5 seconds apart)
    for (let i = 0; i < 12; i++) {
      try {
        // Check the render status
        console.log(`Polling attempt ${i+1} for job ${jobId}`);
        const response = await apiClient.get(`/api/runway/status/${jobId}`);
        
        if (response.data && response.data.success) {
          const { status, url, error } = response.data.data;
          
          console.log(`Job ${jobId} status: ${status}`);
          
          // If there's an error, throw to be caught by caller
          if (error) {
            console.error(`Image generation failed for job ${jobId}: ${error}`);
            throw new Error(`Image generation failed: ${error}`);
          }
          
          // If completed, return the data
          if (status === 'succeeded') {
            console.log(`Job ${jobId} completed with URL: ${url}`);
            return response.data.data;
          }
          
          // If still processing, wait and try again
          if (status === 'pending' || status === 'processing') {
            console.log(`Job ${jobId} is still ${status}, waiting 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            continue;
          }
          
          // If failed, throw error
          if (status === 'failed') {
            console.error(`Image generation failed for job ${jobId}`);
            throw new Error('Image generation failed');
          }
        }
      } catch (err) {
        console.error(`Error polling Runway status for job ${jobId}:`, err);
        throw err;
      }
    }
    
    // If we get here, the render timed out
    console.error(`Image generation timed out for job ${jobId}`);
    throw new Error('Image generation timed out');
  };
  
  // Get dimensions based on aspect ratio
  const getDimensionsForAspectRatio = (aspectRatio: string): {width: number; height: number} => {
    console.log(`Getting dimensions for aspect ratio: ${aspectRatio}`);
    switch (aspectRatio) {
      case '16:9':
        return { width: 1024, height: 576 }; // Landscape dimensions
      case '9:16':
        return { width: 576, height: 1024 }; // Story dimensions
      case '1:1':
        return { width: 1024, height: 1024 }; // Square dimensions
      case '4:5':
        return { width: 820, height: 1024 }; // Instagram portrait dimensions
      default:
        return { width: 1024, height: 1024 }; // Default to square
    }
  };

  // Generate image using Creatomate API
  const handleGenerateImage = async () => {
    if (!prompt) {
      setError('Please enter a prompt');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Instead of adding a placeholder to the images array immediately,
      // we'll create a placeholder object to track this generation job
      // but we won't display it in the UI yet
      const placeholderId = `img-loading-${Date.now()}`;
      const placeholderPrompt = prompt;
      
      // We'll only add a real image to the UI when the API call is successful
      
      // Prepare modifications for Creatomate template
      const modifications = {
        text: prompt,
        style: style.toLowerCase(),
        negativePrompt: negativePrompt || undefined,
        withLogo: withLogo,
        clientId: selectedClientId || '',
        aspectRatio: aspectRatio
      };

      // Get appropriate dimensions based on aspect ratio
      const dimensions = getDimensionsForAspectRatio(aspectRatio);
      console.log(`Generating image with dimensions: ${dimensions.width}x${dimensions.height}`);

      // Send request to Runway API endpoint
      console.log(`Sending API request to Runway with prompt: ${prompt.substring(0, 30)}...`);
      
      // Use the dimensions from our helper function
      const { width, height } = dimensions;
      
      const response = await apiClient.post('/api/runway/generate', {
        prompt,
        negativePrompt,
        width,
        height,
        style,
        clientId: selectedClientId,
        withLogo,
        numberOfImages: 1,
        executionId: null
      });

      console.log('API response:', response.data);

      // Handle response
      if (response.data && response.data.success && response.data.data) {
        const jobId = response.data.data.jobId;
        
        if (!jobId) {
          throw new Error('No job ID returned from the server. Unable to track image generation.');
        }
        
        console.log(`Image generation job started with ID: ${jobId}`);
        
        // Poll for completion
        const renderResponse = await pollImageRender(jobId);
        
        if (renderResponse && renderResponse.url) {
          // Create new image from response
          const newImage = {
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            url: renderResponse.url,
            prompt: prompt,
            timestamp: new Date(),
            saved: false
          };

          // Add the newly generated image to the list
          // (no need to filter since we didn't add a placeholder)
          setImages(current => [
            newImage, 
            ...current
          ]);
        } else {
          // No need to remove a placeholder since we didn't add one
          throw new Error('The render completed but no image URL was returned');
        }
      } else {
        // No need to remove a placeholder since we didn't add one
        throw new Error('API request succeeded but with unexpected response format');
      }
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  // Save image as asset
  const handleSaveImage = async (image: GeneratedImage) => {
    try {
      setLoading(true);
      
      // Create asset in database
      const response = await apiClient.post('/api/assets', {
        name: `Generated Image - ${new Date().toLocaleDateString()}`,
        type: 'image',
        client_id: selectedClientId,
        url: image.url,
        content: prompt,
        metadata: {
          prompt: prompt,
          style: style,
          aspectRatio: aspectRatio,
          quality: quality,
          negativePrompt: negativePrompt || undefined,
          withLogo: withLogo
        }
      });

      // Mark image as saved
      setImages(images.map(img => 
        img.id === image.id ? { ...img, saved: true } : img
      ));

      // Refresh assets in store - handle nullable clientId
      dispatch(fetchAssets({ 
        clientId: selectedClientId || undefined // Convert null to undefined
      }));
      
    } catch (err: any) {
      console.error('Error saving image as asset:', err);
      setError(err.response?.data?.message || 'Failed to save image');
    } finally {
      setLoading(false);
    }
  };

  // Delete image
  const handleDeleteImage = (imageId: string) => {
    setImages(images.filter(img => img.id !== imageId));
  };

  // Download image
  const handleDownloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Image Generation
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Create custom images for your campaigns using AI
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box component="form" noValidate autoComplete="off">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Prompt"
                multiline
                rows={3}
                value={prompt}
                onChange={handlePromptChange}
                placeholder="Describe the image you want to generate in detail..."
                helperText="Be specific about what you want to see in the image"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Style</InputLabel>
                <Select
                  value={style}
                  label="Style"
                  onChange={handleStyleChange}
                >
                  {styleOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Aspect Ratio</InputLabel>
                <Select
                  value={aspectRatio}
                  label="Aspect Ratio"
                  onChange={handleAspectRatioChange}
                >
                  {aspectRatioOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography id="quality-slider" gutterBottom>
                Quality: {quality}%
              </Typography>
              <Slider
                value={quality}
                onChange={handleQualityChange}
                aria-labelledby="quality-slider"
                valueLabelDisplay="auto"
                step={5}
                marks
                min={25}
                max={100}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Negative Prompt (Optional)"
                multiline
                rows={2}
                value={negativePrompt}
                onChange={handleNegativePromptChange}
                placeholder="Describe elements you want to exclude from the image..."
                helperText="Elements to avoid in the generated image"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={withLogo}
                    onChange={handleToggleLogo}
                  />
                }
                label="Include Client Logo"
              />
            </Grid>

            {/* API key is now managed on the server side */}

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateImage}
                disabled={loading || !prompt}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Generating...' : 'Generate Image'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {images.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Generated Images
          </Typography>
          <Grid container spacing={3}>
            {images.map((image) => (
              <Grid item xs={12} sm={6} md={4} key={image.id}>
                <Card>
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={image.url}
                      alt={image.prompt}
                    />
                    {image.saved && (
                      <Chip
                        label="Saved"
                        color="success"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8
                        }}
                      />
                    )}
                  </Box>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {image.prompt}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {image.timestamp.toLocaleString()}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <IconButton
                      onClick={() => handleSaveImage(image)}
                      disabled={image.saved || loading}
                      title="Save as Asset"
                    >
                      <SaveIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDownloadImage(image.url)}
                      title="Download"
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteImage(image.id)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default ImageGenerationPage;
