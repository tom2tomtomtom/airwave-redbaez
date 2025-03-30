import React, { useState, useEffect } from 'react';
import { SelectChangeEvent } from '@mui/material';
import { useSelector } from 'react-redux';
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
  IconButton,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { RootState } from '../../store';
import apiClient from '../../api/apiClient';
import AssetImage from '../../components/AssetImage';

// Video aspect ratio options
const aspectRatioOptions = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Story (9:16)' },
  { value: '4:5', label: 'Portrait (4:5)' }
];

// Video duration options
const durationOptions = [
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds (Extended)' }
];

// Video style options
const styleOptions = [
  'Cinematic',
  'Documentary',
  'Commercial',
  'Social Media',
  'Animation',
  'Vintage',
  'Lo-Fi',
  'Professional',
  'Casual'
];

// Video transition options
const transitionOptions = [
  'Fade',
  'Slide',
  'Zoom',
  'Wipe',
  'Dissolve',
  'Blur',
  'None'
];

interface GeneratedVideo {
  id: string;
  url: string;
  thumbnailUrl: string;
  prompt: string;
  duration: number;
  status: 'processing' | 'complete' | 'failed';
  progress: number;
  timestamp: Date;
  saved: boolean;
}

const VideoGenerationPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  // Removed tabs - now only using image-to-video
  
  // Local state
  const [prompt, setPrompt] = useState<string>('');
  const [style, setStyle] = useState<string>('Cinematic');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [duration, setDuration] = useState<number>(15);
  const [quality, setQuality] = useState<number>(75);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [withLogo, setWithLogo] = useState<boolean>(false);
  const [withMusic, setWithMusic] = useState<boolean>(true);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // API key is now managed by the server
  const [playing, setPlaying] = useState<string | null>(null);
  
  // Image-to-video specific state
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedAssetImages, setSelectedAssetImages] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [transition, setTransition] = useState<string>('Fade');
  const [imagePerFrame, setImagePerFrame] = useState<number>(3);

  // Updated prompt handling for image-to-video only
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

  // Handle duration change
  const handleDurationChange = (e: SelectChangeEvent<string>) => {
    setDuration(Number(e.target.value));
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

  // Handle toggle music
  const handleToggleMusic = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWithMusic(e.target.checked);
  };

  // API key is now managed by the server

  // Play/pause video
  const togglePlayPause = (videoId: string) => {
    if (playing === videoId) {
      setPlaying(null);
    } else {
      setPlaying(videoId);
    }
  };

  // Helper to get width based on aspect ratio
  const getWidthForAspectRatio = (ratio: string): number => {
    switch (ratio) {
      case '1:1': return 768; // Square
      case '9:16': return 576; // Portrait
      case '16:9': 
      default: return 1024; // Landscape
    }
  };

  // Helper to get height based on aspect ratio
  const getHeightForAspectRatio = (ratio: string): number => {
    switch (ratio) {
      case '1:1': return 768; // Square
      case '9:16': return 1024; // Portrait
      case '16:9':
      default: return 576; // Landscape
    }
  };

  // Generate video using Runway API (text-to-video)
  // Text-to-video functionality removed - we now only support image-to-video
  const handleGenerateVideo = async () => {
    // This function is deprecated - keeping as a stub for backward compatibility
    setError('Text-to-video generation is no longer supported. Please use image-to-video generation instead.');
    return;
  };

  // Poll for video progress using Runway API endpoint
  const pollVideoProgress = async (jobId: string, videoId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        // Try both endpoints - first the new task endpoint that matches the example
        let response;
        try {
          // First try the task endpoint (for compatibility with the example)
          response = await apiClient.get(`/api/runway/task/${jobId}`);
          
          if (response.data) {
            // Map the example format response to our expected format
            response.data = {
              success: true,
              status: response.data.status.toLowerCase(),
              url: response.data.output,
              progress: response.data.progress || 0,
              error: response.data.error
            };
          }
        } catch (err) {
          // Fall back to our original endpoint if the task endpoint fails
          response = await apiClient.get(`/api/runway/video-status/${jobId}`);
        }
        
        if (response.data && response.data.success) {
          const { status, url, thumbnailUrl, progress, error } = response.data;
          
          // Map Runway status to our internal status
          let videoStatus: 'processing' | 'complete' | 'failed' = 'processing';
          if (status === 'succeeded') videoStatus = 'complete';
          if (status === 'failed') videoStatus = 'failed';
          
          // Calculate progress value (0-100)
          const progressValue = progress ? Math.round(progress * 100) : 
            (status === 'succeeded' ? 100 : 
             status === 'processing' ? 50 : 0);
          
          // Update the video with progress
          setVideos(currentVideos => 
            currentVideos.map(vid => 
              vid.id === videoId 
                ? { 
                    ...vid, 
                    progress: progressValue,
                    status: videoStatus,
                    url: url || vid.url,
                    thumbnailUrl: thumbnailUrl || vid.thumbnailUrl
                  } as GeneratedVideo 
                : vid
            )
          );
          
          // If there's an error in the response, update the status and show error
          if (error) {
            setError(`Video generation failed: ${error}`);
            clearInterval(pollInterval);
            
            setVideos(currentVideos => 
              currentVideos.map(vid => 
                vid.id === videoId 
                  ? { ...vid, status: 'failed' as const } 
                  : vid
              )
            );
            return;
          }
          
          // If completed or failed, stop polling
          if (status === 'succeeded' || status === 'failed') {
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Error polling Runway video status:', err);
        clearInterval(pollInterval);
        
        // Mark the video as failed
        setVideos(currentVideos => 
          currentVideos.map(vid => 
            vid.id === videoId 
              ? { ...vid, status: 'failed' as const } 
              : vid
          )
        );
      }
    }, 5000); // Check every 5 seconds
  };
  
  // Helper to get Creatomate template ID based on aspect ratio
  const getTemplateIdForAspectRatio = (aspectRatio: string): string => {
    // These should be replaced with your actual Creatomate template IDs
    console.log(`Getting video template for aspect ratio: ${aspectRatio}`);
    // In prototype mode, we can use any ID as the server will mock the responses
    switch (aspectRatio) {
      case '16:9':
        return 'video-landscape'; // Landscape template
      case '9:16':
        return 'video-portrait'; // Story/portrait template
      case '1:1':
        return 'video-square'; // Square template
      case '4:5':
        return 'video-instagram'; // Instagram portrait template
      default:
        return 'video-landscape'; // Default to landscape
    }
  };

  // Save video as asset
  const handleSaveVideo = async (video: GeneratedVideo) => {
    if (video.status !== 'complete') {
      setError('Cannot save video until processing is complete');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create asset in database
      const response = await apiClient.post('/api/assets', {
        name: `Generated Video - ${new Date().toLocaleDateString()}`,
        type: 'video',
        clientId: selectedClientId, // Changed from client_id to clientId to match server
        url: video.url,
        thumbnailUrl: video.thumbnailUrl,
        metadata: {
          prompt: prompt,
          style: style,
          aspectRatio: aspectRatio,
          duration: duration,
          quality: quality,
          negativePrompt: negativePrompt || undefined,
          withLogo: withLogo,
          withMusic: withMusic
        }
      });

      // Mark video as saved
      setVideos(videos.map(vid => 
        vid.id === video.id ? { ...vid, saved: true } : vid
      ));

      // Show success message
      setSuccessMessage('Video saved to asset library successfully!');
      setTimeout(() => setSuccessMessage(null), 3000); // Clear after 3 seconds
      
    } catch (err: any) {
      console.error('Error saving video as asset:', err);
      setError(err.response?.data?.message || 'Failed to save video');
    } finally {
      setLoading(false);
    }
  };

  // Delete video
  const handleDeleteVideo = (videoId: string) => {
    setVideos(videos.filter(vid => vid.id !== videoId));
  };

  // Download video
  const handleDownloadVideo = (videoUrl: string) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `generated-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tab system removed - we now only have image-to-video

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedImages([...selectedImages, ...filesArray]);
      
      // Create URLs for preview
      const urls = filesArray.map(file => URL.createObjectURL(file));
      setImageUrls([...imageUrls, ...urls]);
    }
  };

  // Remove image from selection
  const handleRemoveImage = (index: number) => {
    const newImages = [...selectedImages];
    const newUrls = [...imageUrls];
    
    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(newUrls[index]);
    
    newImages.splice(index, 1);
    newUrls.splice(index, 1);
    
    setSelectedImages(newImages);
    setImageUrls(newUrls);
  };

  // Reorder images (move up)
  const handleMoveImageUp = (index: number) => {
    if (index === 0) return;
    
    const newImages = [...selectedImages];
    const newUrls = [...imageUrls];
    
    // Swap with previous element
    [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
    [newUrls[index], newUrls[index - 1]] = [newUrls[index - 1], newUrls[index]];
    
    setSelectedImages(newImages);
    setImageUrls(newUrls);
  };

  // Reorder images (move down)
  const handleMoveImageDown = (index: number) => {
    if (index === selectedImages.length - 1) return;
    
    const newImages = [...selectedImages];
    const newUrls = [...imageUrls];
    
    // Swap with next element
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    [newUrls[index], newUrls[index + 1]] = [newUrls[index + 1], newUrls[index]];
    
    setSelectedImages(newImages);
    setImageUrls(newUrls);
  };

  // Handle transition selection
  const handleTransitionChange = (e: SelectChangeEvent<string>) => {
    setTransition(e.target.value);
  };

  // Generate video from images using Creatomate API
  const handleImageToVideo = async () => {
    if (selectedImages.length === 0 && selectedAssetImages.length === 0) {
      setError('Please select at least one image');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create placeholder for processing
      const videoId = `vid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const placeholderVideo: GeneratedVideo = {
        id: videoId,
        url: '',
        thumbnailUrl: '',
        prompt: 'Image to Video',
        duration: duration,
        status: 'processing',
        progress: 0,
        timestamp: new Date(),
        saved: false
      };
      
      setVideos([placeholderVideo, ...videos]);

      // BYPASS THE ASSET UPLOAD PROCESS ENTIRELY
      // Convert the image to base64 or get an existing asset directly
      let imageData = null;
      
      // Process locally selected images
      if (selectedImages.length > 0) {
        // Note: Runway only supports converting a single image to video
        if (selectedImages.length > 1) {
          console.warn('Runway only supports converting a single image to video. Using the first selected image.');
        }
        
        const file = selectedImages[0];
        
        // Convert the file to base64
        try {
          imageData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          console.log('Successfully converted image to base64 format');
        } catch (error) {
          console.error('Error converting image to base64:', error);
          throw new Error('Failed to process image');
        }
      } 
      // Process selected existing assets
      else if (selectedAssetImages.length > 0) {
        if (selectedAssetImages.length > 1) {
          console.warn('Runway only supports converting a single image to video. Using the first selected image.');
        }
        
        try {
          // Get details of the first selected asset
          const assetId = selectedAssetImages[0];
          const assetResponse = await apiClient.get(`/api/assets/${assetId}`);
          
          if (assetResponse.data && assetResponse.data.url) {
            // Use the full URL path
            const assetUrl = `${window.location.origin}${assetResponse.data.url}`;
            console.log('Using existing asset URL:', assetUrl);
            imageData = assetUrl;
          } else {
            throw new Error('Could not get URL for selected asset');
          }
        } catch (error) {
          console.error('Error getting asset URL:', error);
          throw new Error('Failed to get asset URL');
        }
      }
      
      if (!imageData) {
        throw new Error('Failed to process selected image');
      }
      
      console.log('Sending image data to Runway API...');
      
      // Send to Runway API for image-to-video generation
      // Note: Runway API requires specific duration values
      // For 10-second videos, we'll need to modify the approach
      let apiDuration = 5; // Default to 5 seconds (valid Runway value)
      
      // If user selected 10 seconds, we'll adjust this on the server
      const response = await apiClient.post('/api/runway/generate-video/from-image', {
        imageData: imageData, // Send base64 image data or URL
        prompt: 'Convert this image to a video with natural motion',
        model: 'gen3a_turbo',
        motionStrength: 0.5,
        duration: duration, // Pass the actual selected duration (5 or 10)
        clientId: selectedClientId || undefined
      });

      // Handle immediate response
      if (response.data && response.data.success && response.data.jobId) {
        // Poll for updates
        pollVideoProgress(response.data.jobId, videoId);
        
        // Clear selected images after successful submission
        setSelectedImages([]);
        setImageUrls([]);
        setSelectedAssetImages([]);
      }
    } catch (err: any) {
      console.error('Error generating video from images:', err);
      setError(err.response?.data?.message || 'Failed to generate video from images');
      
      // Update the placeholder video to failed status
      setVideos(videos.map(vid => 
        vid.status === 'processing' ? { ...vid, status: 'failed' as const } : vid
      ));
    } finally {
      setLoading(false);
    }
  };
  
  // Get slideshow template ID based on aspect ratio
  const getSlideshowTemplateIdForAspectRatio = (aspectRatio: string): string => {
    // These should be replaced with your actual Creatomate slideshow template IDs
    console.log(`Getting slideshow template for aspect ratio: ${aspectRatio}`);
    // In prototype mode, we can use any ID as the server will mock the responses
    switch (aspectRatio) {
      case '16:9':
        return 'slideshow-landscape'; // Landscape slideshow template
      case '9:16':
        return 'slideshow-portrait'; // Story/portrait slideshow template
      case '1:1':
        return 'slideshow-square'; // Square slideshow template
      case '4:5':
        return 'slideshow-instagram'; // Instagram portrait slideshow template
      default:
        return 'slideshow-landscape'; // Default to landscape
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Video Generation
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Create custom videos for your campaigns using AI
      </Typography>
      
      <Typography variant="h6" gutterBottom>
        Image to Video Generation
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Create videos by animating your images using AI technology
      </Alert>

      {/* Image-to-Video is now the default */}
      {(
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box component="form" noValidate autoComplete="off">
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Upload Images
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="image-upload-button"
                    multiple
                    type="file"
                    onChange={handleImageSelect}
                  />
                  <label htmlFor="image-upload-button">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<AddIcon />}
                    >
                      Add Images
                    </Button>
                  </label>
                </Box>
                
                {imageUrls.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Selected Images ({imageUrls.length})
                    </Typography>
                    <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 2 }}>
                      {imageUrls.map((url, index) => (
                        <Card key={index} sx={{ mb: 1, display: 'flex' }}>
                          <CardMedia
                            component="img"
                            sx={{ width: 100, height: 60, objectFit: 'cover' }}
                            image={url}
                            alt={`Selected image ${index + 1}`}
                          />
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            flex: 1,
                            px: 1
                          }}>
                            <Typography variant="body2">
                              Image {index + 1}
                            </Typography>
                            <Box>
                              <IconButton 
                                size="small" 
                                onClick={() => handleMoveImageUp(index)}
                                disabled={index === 0}
                              >
                                <ArrowUpwardIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handleMoveImageDown(index)}
                                disabled={index === imageUrls.length - 1}
                              >
                                <ArrowDownwardIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handleRemoveImage(index)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Select from Existing Assets
                </Typography>
                <Alert severity="info">
                  No image assets found for the selected client
                </Alert>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Transition Effect</InputLabel>
                  <Select
                    value={transition}
                    label="Transition Effect"
                    onChange={handleTransitionChange}
                  >
                    {transitionOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
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
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Duration</InputLabel>
                  <Select
                    value={duration.toString()}
                    label="Duration"
                    onChange={handleDurationChange}
                  >
                    {durationOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={withMusic}
                      onChange={handleToggleMusic}
                    />
                  }
                  label="Include Background Music"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
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
              
              {/* Creatomate API key is configured on the server */}
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleImageToVideo}
                  disabled={loading || (selectedImages.length === 0 && selectedAssetImages.length === 0)}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Processing...' : 'Create Video from Images'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {videos.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Generated Videos
          </Typography>
          <Grid container spacing={3}>
            {videos.map((video) => (
              <Grid item xs={12} sm={6} md={4} key={video.id}>
                <Card>
                  <Box sx={{ position: 'relative' }}>
                    {video.status === 'processing' ? (
                      <Box 
                        sx={{ 
                          height: 200, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexDirection: 'column',
                          bgcolor: 'action.hover'
                        }}
                      >
                        <CircularProgress size={40} />
                        <Typography variant="body2" sx={{ mt: 2 }}>
                          Processing... {video.progress}%
                        </Typography>
                        <Box sx={{ width: '80%', mt: 2 }}>
                          <LinearProgress variant="determinate" value={video.progress} />
                        </Box>
                      </Box>
                    ) : video.status === 'failed' ? (
                      <Box 
                        sx={{ 
                          height: 200, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: 'error.light',
                          color: 'error.contrastText'
                        }}
                      >
                        <Typography>
                          Processing Failed
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        <Box 
                          component="video"
                          src={video.url}
                          poster={video.thumbnailUrl}
                          height={200}
                          sx={{ width: '100%', objectFit: 'cover' }}
                          controls={playing === video.id}
                          autoPlay={playing === video.id}
                          loop
                        />
                        <IconButton
                          sx={{ 
                            position: 'absolute', 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)',
                            color: 'white',
                            bgcolor: 'rgba(0,0,0,0.5)',
                            '&:hover': {
                              bgcolor: 'rgba(0,0,0,0.7)'
                            },
                            display: playing === video.id ? 'none' : 'flex'
                          }}
                          onClick={() => togglePlayPause(video.id)}
                        >
                          {playing === video.id ? <PauseIcon /> : <PlayArrowIcon />}
                        </IconButton>
                      </>
                    )}
                    
                    {video.saved && (
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
                      {video.prompt}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {video.duration}s • {video.timestamp.toLocaleString()}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between' }}>
                    <Box>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleSaveVideo(video)}
                        disabled={video.saved || video.status !== 'complete' || loading}
                        startIcon={<SaveIcon />}
                        sx={{ mr: 1 }}
                      >
                        {video.saved ? 'Saved to Library' : 'Add to Assets'}
                      </Button>
                    </Box>
                    <Box>
                      <IconButton
                        onClick={() => handleDownloadVideo(video.url)}
                        disabled={video.status !== 'complete'}
                        title="Download"
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Box>
                    <Box>
                      <IconButton
                        onClick={() => handleDeleteVideo(video.id)}
                        title="Delete"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
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

export default VideoGenerationPage;
