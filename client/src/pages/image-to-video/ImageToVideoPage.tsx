import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Slider, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  Radio, 
  FormControlLabel, 
  Paper, 
  CircularProgress, 
  Grid, 
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Card,
  CardMedia,
  IconButton
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import { useSocket } from '../../hooks/useSocket';
import { WebSocketEvent } from '../../types/websocket.types';
import { ApiClient } from '../../services/ApiClient';
import { useAuth } from '../../hooks/useAuth';
import { PageLayout } from '../../components/layout/PageLayout';
import { FileDropzone } from '../../components/common/FileDropzone';
import { useSnackbar } from '../../hooks/useSnackbar';
import { formatBytes } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { AssetPreview } from '../../components/assets/AssetPreview';

// Types
type MotionType = 'zoom' | 'pan' | 'rotation' | 'complex';
type MotionDirection = 'in' | 'out' | 'left' | 'right' | 'up' | 'down';
type OutputFormat = 'mp4' | 'mov' | 'gif';

interface ImageToVideoJob {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  assetId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ImageToVideoOptions {
  sourceImage: string;
  motionType: MotionType;
  motionStrength: number;
  motionDirection?: MotionDirection;
  duration: number;
  outputFormat: OutputFormat;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: ImageToVideoOptions = {
  sourceImage: '',
  motionType: 'zoom',
  motionStrength: 50,
  motionDirection: 'in',
  duration: 3,
  outputFormat: 'mp4',
  width: 1080,
  height: 1080
};

const ImageToVideoPage: React.FC = () => {
  const { user, activeClientId } = useAuth();
  const { openSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  
  // State
  const [options, setOptions] = useState<ImageToVideoOptions>(DEFAULT_OPTIONS);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentJob, setCurrentJob] = useState<ImageToVideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<ImageToVideoJob[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Load recent jobs
  useEffect(() => {
    const fetchRecentJobs = async () => {
      try {
        const response = await ApiClient.get('/api/image-to-video/jobs');
        if (response.data?.success && response.data?.jobs) {
          setRecentJobs(response.data.jobs);
        }
      } catch (error) {
        console.error('Failed to fetch recent jobs:', error);
      }
    };
    
    fetchRecentJobs();
  }, []);
  
  // Handle WebSocket messages for job progress
  useEffect(() => {
    if (!socket || !connected) return;
    
    const handleJobProgress = (data: any) => {
      if (data.jobId && currentJob?.id === data.jobId) {
        // Ensure we maintain all required properties when updating the job
        setCurrentJob({
          id: currentJob!.id, // We know currentJob is not null here because of the condition check
          status: data.status,
          progress: data.progress || 0,
          videoUrl: data.resultUrl,
          thumbnailUrl: currentJob!.thumbnailUrl,
          assetId: data.assetId,
          error: data.error,
          createdAt: currentJob!.createdAt,
          updatedAt: new Date()
        });
        
        if (data.status === 'succeeded') {
          openSnackbar('Video generation completed successfully!', 'success');
          setIsGenerating(false);
          
          // Only proceed if we have a valid currentJob (which we should at this point)
          if (currentJob) {
            // Add to recent jobs
            setRecentJobs(prev => [
              {
                id: currentJob.id,
                status: 'succeeded',
                progress: 100,
                videoUrl: data.resultUrl,
                thumbnailUrl: currentJob.thumbnailUrl,
                assetId: data.assetId,
                error: currentJob.error,
                createdAt: currentJob.createdAt,
                updatedAt: new Date()
              },
              ...prev.slice(0, 9) // Keep last 10
            ]);
          }
        } else if (data.status === 'failed') {
          openSnackbar(`Generation failed: ${data.error || 'Unknown error'}`, 'error');
          setIsGenerating(false);
          setError(data.error || 'Video generation failed');
        }
      }
    };
    
    socket.on(WebSocketEvent.JOB_PROGRESS, handleJobProgress);
    
    return () => {
      socket.off(WebSocketEvent.JOB_PROGRESS, handleJobProgress);
    };
  }, [socket, connected, currentJob, openSnackbar]);
  
  // Handle file upload
  const handleFileUpload = useCallback((files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      openSnackbar('Please upload an image file', 'error');
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result) {
        setImagePreview(result as string);
        setOptions(prev => ({
          ...prev,
          sourceImage: result as string
        }));
      }
    };
    reader.readAsDataURL(file);
    
    setUploadedImage(file);
    setError(null);
  }, [openSnackbar]);
  
  // Handle option changes
  const handleOptionChange = (
    optionName: keyof ImageToVideoOptions, 
    value: string | number
  ) => {
    setOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };
  
  // Generate video
  const handleGenerateVideo = async () => {
    if (!imagePreview) {
      openSnackbar('Please upload an image first', 'error');
      return;
    }
    
    try {
      setIsGenerating(true);
      setError(null);
      
      const payload = {
        ...options,
        clientId: activeClientId || undefined
      };
      
      const response = await ApiClient.post('/api/image-to-video/generate', payload);
      
      if (response.data?.success && response.data?.job) {
        setCurrentJob(response.data.job);
        openSnackbar('Video generation started', 'info');
      } else {
        throw new Error(response.data?.message || 'Failed to start video generation');
      }
    } catch (error: any) {
      console.error('Error generating video:', error);
      setError(error.message || 'Failed to generate video');
      setIsGenerating(false);
      openSnackbar('Failed to start video generation', 'error');
    }
  };
  
  // Reset form
  const handleReset = () => {
    setOptions(DEFAULT_OPTIONS);
    setUploadedImage(null);
    setImagePreview(null);
    setCurrentJob(null);
    setError(null);
  };
  
  // Format job status for display
  const formatStatus = (status: string): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'succeeded': return 'Completed';
      case 'failed': return 'Failed';
      default: return status;
    }
  };
  
  return (
    <PageLayout title="Image to Video">
      <Container maxWidth="lg">
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Transform Images into Videos
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Add motion effects to your static images and create dynamic videos
          </Typography>
        </Box>
        
        <Grid container spacing={4}>
          {/* Source Image */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Source Image
              </Typography>
              
              {!imagePreview ? (
                <FileDropzone
                  onFilesAdded={handleFileUpload}
                  maxFiles={1}
                  maxSize={20971520} // 20MB
                  acceptedFileTypes={['image/*']}
                  height={300}
                />
              ) : (
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <Card>
                    <CardMedia
                      component="img"
                      image={imagePreview}
                      alt="Source image"
                      sx={{ 
                        height: 300, 
                        objectFit: 'contain', 
                        backgroundColor: '#f5f5f5'
                      }}
                    />
                  </Card>
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    startIcon={<RefreshIcon />}
                    onClick={() => setImagePreview(null)}
                    sx={{ position: 'absolute', bottom: 10, right: 10 }}
                  >
                    Change
                  </Button>
                </Box>
              )}
              
              {uploadedImage && (
                <Box mt={2}>
                  <Typography variant="body2">
                    {uploadedImage.name} ({formatBytes(uploadedImage.size)})
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {uploadedImage.type}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Motion Settings */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Motion Settings
              </Typography>
              
              <FormControl component="fieldset" fullWidth margin="normal">
                <FormLabel component="legend">Motion Type</FormLabel>
                <RadioGroup
                  row
                  value={options.motionType}
                  onChange={(e) => handleOptionChange('motionType', e.target.value as MotionType)}
                >
                  <FormControlLabel value="zoom" control={<Radio />} label="Zoom" />
                  <FormControlLabel value="pan" control={<Radio />} label="Pan" />
                  <FormControlLabel value="rotation" control={<Radio />} label="Rotation" />
                  <FormControlLabel value="complex" control={<Radio />} label="Complex" />
                </RadioGroup>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <FormLabel>Motion Strength</FormLabel>
                <Slider
                  value={options.motionStrength}
                  onChange={(_, value) => handleOptionChange('motionStrength', value as number)}
                  valueLabelDisplay="auto"
                  step={1}
                  marks
                  min={0}
                  max={100}
                />
              </FormControl>
              
              {(options.motionType === 'zoom' || options.motionType === 'pan') && (
                <FormControl component="fieldset" fullWidth margin="normal">
                  <FormLabel component="legend">Direction</FormLabel>
                  <RadioGroup
                    row
                    value={options.motionDirection}
                    onChange={(e) => handleOptionChange('motionDirection', e.target.value as MotionDirection)}
                  >
                    {options.motionType === 'zoom' && (
                      <>
                        <FormControlLabel value="in" control={<Radio />} label="In" />
                        <FormControlLabel value="out" control={<Radio />} label="Out" />
                      </>
                    )}
                    {options.motionType === 'pan' && (
                      <>
                        <FormControlLabel value="left" control={<Radio />} label="Left" />
                        <FormControlLabel value="right" control={<Radio />} label="Right" />
                        <FormControlLabel value="up" control={<Radio />} label="Up" />
                        <FormControlLabel value="down" control={<Radio />} label="Down" />
                      </>
                    )}
                  </RadioGroup>
                </FormControl>
              )}
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Duration"
                    type="number"
                    value={options.duration}
                    onChange={(e) => handleOptionChange('duration', parseFloat(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                      inputProps: { min: 1, max: 30, step: 0.1 }
                    }}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth margin="normal">
                    <FormLabel>Output Format</FormLabel>
                    <RadioGroup
                      row
                      value={options.outputFormat}
                      onChange={(e) => handleOptionChange('outputFormat', e.target.value as OutputFormat)}
                    >
                      <FormControlLabel value="mp4" control={<Radio />} label="MP4" />
                      <FormControlLabel value="mov" control={<Radio />} label="MOV" />
                      <FormControlLabel value="gif" control={<Radio />} label="GIF" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              </Grid>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Width"
                    type="number"
                    value={options.width}
                    onChange={(e) => handleOptionChange('width', parseInt(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">px</InputAdornment>,
                      inputProps: { min: 360, max: 3840 }
                    }}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Height"
                    type="number"
                    value={options.height}
                    onChange={(e) => handleOptionChange('height', parseInt(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">px</InputAdornment>,
                      inputProps: { min: 360, max: 2160 }
                    }}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Control Buttons */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" mt={2}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleReset}
                disabled={isGenerating}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleGenerateVideo}
                disabled={!imagePreview || isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Video'}
              </Button>
            </Box>
          </Grid>
          
          {/* Generation Progress */}
          {currentJob && (
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Generation Progress
                </Typography>
                
                <Box display="flex" alignItems="center" mb={1}>
                  <CircularProgress
                    variant="determinate"
                    value={currentJob.progress}
                    size={40}
                    sx={{ mr: 2 }}
                  />
                  <Box>
                    <Typography variant="body1">
                      Status: {formatStatus(currentJob.status)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Progress: {currentJob.progress}%
                    </Typography>
                  </Box>
                </Box>
                
                {currentJob.status === 'failed' && currentJob.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {currentJob.error}
                  </Alert>
                )}
                
                {currentJob.status === 'succeeded' && currentJob.videoUrl && (
                  <Box mt={3}>
                    <Typography variant="subtitle1" gutterBottom>
                      Preview:
                    </Typography>
                    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
                      <video
                        ref={videoRef}
                        controls
                        width="100%"
                        src={currentJob.videoUrl}
                        poster={currentJob.thumbnailUrl}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </Box>
                    
                    <Box display="flex" justifyContent="flex-end" mt={2} gap={2}>
                      {currentJob.assetId && (
                        <Button
                          variant="outlined"
                          color="secondary"
                          onClick={() => navigate(`/assets/${currentJob.assetId}`)}
                        >
                          View in Asset Library
                        </Button>
                      )}
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        component="a"
                        href={currentJob.videoUrl}
                        download
                      >
                        Download Video
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          )}
          
          {/* Recent Jobs */}
          {recentJobs.length > 0 && (
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Generations
                </Typography>
                
                <Grid container spacing={2}>
                  {recentJobs.map((job) => (
                    <Grid item xs={12} sm={6} md={4} key={job.id}>
                      <Card sx={{ height: '100%' }}>
                        {job.videoUrl ? (
                          <AssetPreview
                            src={job.videoUrl}
                            type="video"
                            thumbnailUrl={job.thumbnailUrl}
                            height={160}
                          />
                        ) : (
                          <Box
                            sx={{
                              height: 160,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'grey.100'
                            }}
                          >
                            {job.status === 'failed' ? (
                              <Typography color="error">
                                Generation Failed
                              </Typography>
                            ) : (
                              <CircularProgress size={40} />
                            )}
                          </Box>
                        )}
                        <Box sx={{ p: 2 }}>
                          <Typography variant="body2">
                            Status: {formatStatus(job.status)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Created: {new Date(job.createdAt).toLocaleString()}
                          </Typography>
                          
                          {job.videoUrl && (
                            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {job.assetId && (
                                <Button
                                  fullWidth
                                  variant="outlined"
                                  size="small"
                                  color="secondary"
                                  onClick={() => navigate(`/assets/${job.assetId}`)}
                                >
                                  View in Library
                                </Button>
                              )}
                              <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                startIcon={<SaveIcon />}
                                component="a"
                                href={job.videoUrl}
                                download
                              >
                                Download
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Container>
    </PageLayout>
  );
};

export default ImageToVideoPage;
