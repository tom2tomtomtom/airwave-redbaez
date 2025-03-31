import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Button
} from '@mui/material';
import {
  Mic as MicIcon,
  PlayArrow,
  Pause,
  Download,
  Save,
  Delete,
  History as HistoryIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useSnackbar } from 'notistack';
import { voiceoverGenerationPlugin, VoiceoverGenerationOptions, VoiceoverGenerationResult } from '../../features/generation/plugins/VoiceoverGenerationPlugin';
import { useWebSocket } from '../../hooks/useWebSocket';
import VoiceoverGenerationForm from '../../components/generation/VoiceoverGenerationForm';
import AssetPreviewCard from '../../components/assets/AssetPreviewCard';

const VoiceoverGenerationPage: React.FC = () => {
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  const { enqueueSnackbar } = useSnackbar();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<VoiceoverGenerationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<VoiceoverGenerationResult[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  
  // Initialize WebSocket for real-time generation updates
  const { lastMessage } = useWebSocket('/generation');
  
  // Handle WebSocket messages for generation progress updates
  useEffect(() => {
    if (lastMessage && generationResult) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        // If the message is for our job, update the progress
        if (data.jobId === generationResult.id) {
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
    const mockRecentGenerations: VoiceoverGenerationResult[] = [
      {
        id: 'gen-1',
        status: 'succeeded',
        progress: 100,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000),
        audioUrl: 'https://example.com/audio1.mp3',
        waveformUrl: 'https://example.com/waveform1.png',
        duration: 12.5,
        transcript: 'Welcome to our new product showcase.'
      },
      {
        id: 'gen-2',
        status: 'succeeded',
        progress: 100,
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        updatedAt: new Date(Date.now() - 172800000),
        audioUrl: 'https://example.com/audio2.mp3',
        waveformUrl: 'https://example.com/waveform2.png',
        duration: 8.3,
        transcript: 'Discover the future of digital marketing with AIrWAVE.'
      }
    ];
    
    setRecentGenerations(mockRecentGenerations);
  }, []);
  
  const handleGenerateVoiceover = async (options: VoiceoverGenerationOptions) => {
    if (!selectedClientId) {
      enqueueSnackbar('Please select a client first', { variant: 'warning' });
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    
    try {
      const result = await voiceoverGenerationPlugin.generate({
        ...options,
        client_id: selectedClientId
      });
      
      setGenerationResult(result);
      enqueueSnackbar('Voiceover generation started', { variant: 'info' });
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
      const result = await voiceoverGenerationPlugin.checkStatus(jobId);
      setGenerationResult(result);
      setIsGenerating(false);
      
      if (result.status === 'succeeded') {
        // Add to recent generations
        setRecentGenerations(prev => [result, ...prev].slice(0, 10));
        enqueueSnackbar('Voiceover generated successfully!', { variant: 'success' });
      }
    } catch (err: any) {
      setIsGenerating(false);
      setError(err.message || 'Failed to fetch generation result');
      enqueueSnackbar(`Error: ${err.message || 'Failed to fetch result'}`, { 
        variant: 'error' 
      });
    }
  };
  
  const handlePlayPause = (id: string, audioUrl?: string) => {
    if (!audioUrl) return;
    
    if (!audioRefs.current[id]) {
      audioRefs.current[id] = new Audio(audioUrl);
      audioRefs.current[id].addEventListener('ended', () => {
        setPlayingId(null);
      });
    }
    
    if (playingId === id) {
      // Pause this audio
      audioRefs.current[id].pause();
      setPlayingId(null);
    } else {
      // Pause any playing audio
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId].pause();
      }
      
      // Play new audio
      audioRefs.current[id].play();
      setPlayingId(id);
    }
  };
  
  const handleSaveToLibrary = (result: VoiceoverGenerationResult) => {
    // Logic to save to asset library
    enqueueSnackbar('Saved to asset library', { variant: 'success' });
  };
  
  const handleDeleteGeneration = (id: string) => {
    // Logic to delete generation
    setRecentGenerations(prev => prev.filter(item => item.id !== id));
    enqueueSnackbar('Generation deleted', { variant: 'success' });
  };
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Voiceover Generation
      </Typography>
      <Typography variant="body1" paragraph>
        Create realistic voiceovers from text with customizable voices and emotions
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <VoiceoverGenerationForm 
            onSubmit={handleGenerateVoiceover} 
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
                Generating voiceover... {progress}%
              </Typography>
            </Box>
          )}
          
          {generationResult && generationResult.status === 'succeeded' && generationResult.audioUrl && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Generated Voiceover
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton 
                  color="primary" 
                  onClick={() => handlePlayPause(generationResult.id, generationResult.audioUrl)}
                >
                  {playingId === generationResult.id ? <Pause /> : <PlayArrow />}
                </IconButton>
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {generationResult.duration ? `${generationResult.duration.toFixed(1)}s` : 'Audio'}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button 
                  startIcon={<Save />} 
                  variant="outlined" 
                  onClick={() => handleSaveToLibrary(generationResult)}
                >
                  Save to Library
                </Button>
                <Button 
                  startIcon={<Download />} 
                  variant="text" 
                  href={generationResult.audioUrl} 
                  download
                  sx={{ ml: 1 }}
                >
                  Download
                </Button>
              </Box>
              {generationResult.waveformUrl && (
                <Box sx={{ width: '100%', height: 80, backgroundImage: `url(${generationResult.waveformUrl})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat' }} />
              )}
              {generationResult.transcript && (
                <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                  "{generationResult.transcript}"
                </Typography>
              )}
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
              <List>
                {recentGenerations.map((generation) => (
                  <React.Fragment key={generation.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <MicIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={generation.transcript ? 
                          (generation.transcript.length > 30 ? 
                            `${generation.transcript.substring(0, 30)}...` : 
                            generation.transcript) : 
                          'Voiceover'}
                        secondary={`${new Date(generation.createdAt).toLocaleDateString()} • ${generation.duration?.toFixed(1)}s`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={() => handlePlayPause(generation.id, generation.audioUrl)}
                        >
                          {playingId === generation.id ? <Pause /> : <PlayArrow />}
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDeleteGeneration(generation.id)}
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VoiceoverGenerationPage;
