import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  ImageList,
  ImageListItem,
  Button,
  IconButton,
  Divider,
  Card,
  CardMedia,
  CardActions,
  CardContent,
  Tooltip,
  Chip,
  Dialog,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Image as ImageIcon,
  Save,
  Download,
  Delete,
  Refresh,
  History as HistoryIcon,
  ZoomIn,
  Close
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useSnackbar } from 'notistack';
import { textToImagePlugin, TextToImageOptions, TextToImageResult, TextToImageResultItem } from '../../features/generation/plugins/TextToImagePlugin';
import { useWebSocket } from '../../hooks/useWebSocket';
import TextToImageForm from '../../components/generation/TextToImageForm';

const TextToImagePage: React.FC = () => {
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  const { enqueueSnackbar } = useSnackbar();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<TextToImageResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<TextToImageResult[]>([]);
  const [selectedImage, setSelectedImage] = useState<TextToImageResultItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Initialize WebSocket for real-time generation updates
  const { lastMessage } = useWebSocket('/generation');
  
  // Handle WebSocket messages for generation progress updates
  useEffect(() => {
    if (lastMessage && generationResult) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        // If the message is for our job, update the progress
        if (data.jobId === generationResult.jobId) {
          setProgress(data.progress || 0);
          
          // If the job is complete, get the final result
          if (data.status === 'succeeded') {
            fetchResult(data.jobId);
          } else if (data.status === 'failed') {
            setIsGenerating(false);
            setError(data.error || 'Unknown error');
            enqueueSnackbar(`Generation failed: ${data.error || 'Unknown error'}`, { 
              variant: 'error' 
            });
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    }
  }, [lastMessage, generationResult, enqueueSnackbar]);
  
  // Fetch previous generations on component mount
  useEffect(() => {
    // This would typically be an API call to get recent generations
    // For now, we'll use mock data
    const mockRecentGenerations: TextToImageResult[] = [
      {
        jobId: 'img-1',
        requestId: 'req-1',
        status: 'succeeded',
        progress: 100,
        timestamp: Date.now() - 86400000, // 1 day ago
        images: [
          { imageUrl: 'https://via.placeholder.com/512x512?text=Generated+Image+1', seed: 1234 },
          { imageUrl: 'https://via.placeholder.com/512x512?text=Generated+Image+2', seed: 5678 }
        ]
      },
      {
        jobId: 'img-2',
        requestId: 'req-2',
        status: 'succeeded',
        progress: 100,
        timestamp: Date.now() - 172800000, // 2 days ago
        images: [
          { imageUrl: 'https://via.placeholder.com/512x512?text=Generated+Image+3', seed: 9012 }
        ]
      }
    ];
    
    setRecentGenerations(mockRecentGenerations);
  }, []);
  
  const handleGenerateImage = async (options: TextToImageOptions) => {
    if (!selectedClientId) {
      enqueueSnackbar('Please select a client first', { variant: 'warning' });
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    
    try {
      const result = await textToImagePlugin.generate({
        ...options,
        client_id: selectedClientId
      });
      
      setGenerationResult(result);
      enqueueSnackbar('Image generation started', { variant: 'info' });
    } catch (err: any) {
      setIsGenerating(false);
      setError(err.message || 'Failed to start generation');
      enqueueSnackbar(`Error: ${err.message || 'Failed to start generation'}`, { 
        variant: 'error' 
      });
    }
  };
  
  const fetchResult = async (jobId: string) => {
    try {
      const result = await textToImagePlugin.checkStatus(jobId);
      setGenerationResult(result);
      setIsGenerating(false);
      
      if (result.status === 'succeeded') {
        // Add to recent generations
        setRecentGenerations(prev => [result, ...prev].slice(0, 10));
        enqueueSnackbar('Images generated successfully!', { variant: 'success' });
      }
    } catch (err: any) {
      setIsGenerating(false);
      setError(err.message || 'Failed to fetch generation result');
      enqueueSnackbar(`Error: ${err.message || 'Failed to fetch result'}`, { 
        variant: 'error' 
      });
    }
  };
  
  const handleSaveToLibrary = (image: TextToImageResultItem) => {
    // Logic to save to asset library
    enqueueSnackbar('Saved to asset library', { variant: 'success' });
  };
  
  const handleDeleteGeneration = (jobId: string) => {
    // Logic to delete generation
    setRecentGenerations(prev => prev.filter(item => item.jobId !== jobId));
    enqueueSnackbar('Generation deleted', { variant: 'success' });
  };
  
  const handleImagePreview = (image: TextToImageResultItem) => {
    setSelectedImage(image);
    setPreviewOpen(true);
  };
  
  const handleClosePreview = () => {
    setPreviewOpen(false);
  };
  
  const renderImageGrid = (result: TextToImageResult) => {
    if (!result.images || result.images.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No images generated yet
        </Alert>
      );
    }
    
    const cols = Math.min(3, result.images.length);
    
    return (
      <ImageList cols={cols} gap={16}>
        {result.images.map((image, index) => (
          <ImageListItem key={index} sx={{ position: 'relative' }}>
            <img
              src={image.imageUrl}
              alt={`Generated image ${index + 1}`}
              loading="lazy"
              style={{ borderRadius: 4, cursor: 'pointer' }}
              onClick={() => handleImagePreview(image)}
            />
            <Box sx={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              bgcolor: 'rgba(0,0,0,0.6)', 
              display: 'flex', 
              justifyContent: 'space-between',
              p: 1
            }}>
              {image.seed && (
                <Tooltip title="Seed value">
                  <Chip 
                    label={`Seed: ${image.seed}`} 
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Tooltip>
              )}
              <Box>
                <IconButton 
                  size="small" 
                  onClick={() => handleSaveToLibrary(image)}
                  sx={{ color: 'white' }}
                >
                  <Save fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  component="a" 
                  href={image.imageUrl} 
                  download 
                  sx={{ color: 'white' }}
                >
                  <Download fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </ImageListItem>
        ))}
      </ImageList>
    );
  };
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Text to Image
      </Typography>
      <Typography variant="body1" paragraph>
        Generate images from text descriptions with customisable style and variations
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <TextToImageForm 
            onSubmit={handleGenerateImage} 
            isGenerating={isGenerating}
          />
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          {isGenerating && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <CircularProgress variant="determinate" value={progress} size={24} sx={{ mr: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Generating images... {progress}%
              </Typography>
            </Box>
          )}
          
          {generationResult && generationResult.status === 'succeeded' && generationResult.images && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Generated Images
              </Typography>
              {renderImageGrid(generationResult)}
            </Paper>
          )}
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <HistoryIcon sx={{ mr: 1 }} color="action" />
              <Typography variant="h6">Recent Generations</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {recentGenerations.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No recent generations
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {recentGenerations.map((generation) => (
                  <Grid item xs={12} key={generation.jobId}>
                    <Card variant="outlined">
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          height="140"
                          image={generation.images?.[0]?.imageUrl || 'https://via.placeholder.com/140'}
                          alt="Generated image"
                        />
                        <Box sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          right: 8,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          borderRadius: '50%',
                          p: 0.5
                        }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleImagePreview(generation.images?.[0] || { imageUrl: '' })}
                            sx={{ color: 'white' }}
                          >
                            <ZoomIn fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(generation.timestamp || 0).toLocaleDateString()} • 
                          {generation.images?.length || 0} image{generation.images && generation.images.length !== 1 ? 's' : ''}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                        <Button 
                          size="small" 
                          startIcon={<Refresh />}
                          onClick={() => {}}
                        >
                          Regenerate
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteGeneration(generation.jobId)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Image Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0, position: 'relative', height: '80vh' }}>
          {selectedImage && (
            <img
              src={selectedImage.imageUrl}
              alt="Preview"
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain' 
              }}
            />
          )}
          <IconButton
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
            onClick={handleClosePreview}
          >
            <Close />
          </IconButton>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          {selectedImage?.seed && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Seed: {selectedImage.seed}
            </Typography>
          )}
          <Box>
            {selectedImage && (
              <>
                <Button 
                  startIcon={<Save />} 
                  onClick={() => selectedImage && handleSaveToLibrary(selectedImage)}
                >
                  Save to Library
                </Button>
                <Button 
                  startIcon={<Download />} 
                  component="a" 
                  href={selectedImage?.imageUrl} 
                  download
                >
                  Download
                </Button>
              </>
            )}
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TextToImagePage;
