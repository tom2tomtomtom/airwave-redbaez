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
  Button,
  Chip
} from '@mui/material';
import {
  MusicNote as MusicNoteIcon,
  PlayArrow,
  Pause,
  Download,
  Save,
  Delete,
  History as HistoryIcon,
  Album as AlbumIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useSnackbar } from 'notistack';
import { musicGenerationPlugin, MusicGenerationOptions, MusicGenerationResult } from '../../features/generation/plugins/MusicGenerationPlugin';
import { useWebSocket } from '../../hooks/useWebSocket';
import MusicGenerationForm from '../../components/generation/MusicGenerationForm';

const MusicGenerationPage: React.FC = () => {
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  const { enqueueSnackbar } = useSnackbar();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<MusicGenerationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<MusicGenerationResult[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  
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
    const mockRecentGenerations: MusicGenerationResult[] = [
      {
        id: 'music-1',
        status: 'succeeded',
        progress: 100,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000),
        audioUrl: 'https://example.com/music1.mp3',
        waveformUrl: 'https://example.com/waveform1.png',
        duration: 30.5,
        individualTracks: [
          { name: 'Drums', url: 'https://example.com/music1-drums.mp3' },
          { name: 'Bass', url: 'https://example.com/music1-bass.mp3' },
          { name: 'Melody', url: 'https://example.com/music1-melody.mp3' }
        ]
      },
      {
        id: 'music-2',
        status: 'succeeded',
        progress: 100,
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        updatedAt: new Date(Date.now() - 172800000),
        audioUrl: 'https://example.com/music2.mp3',
        waveformUrl: 'https://example.com/waveform2.png',
        duration: 45.2
      }
    ];
    
    setRecentGenerations(mockRecentGenerations);
  }, []);
  
  const handleGenerateMusic = async (options: MusicGenerationOptions) => {
    if (!selectedClientId) {
      enqueueSnackbar('Please select a client first', { variant: 'warning' });
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    
    try {
      const result = await musicGenerationPlugin.generate({
        ...options,
        client_id: selectedClientId
      });
      
      setGenerationResult(result);
      enqueueSnackbar('Music generation started', { variant: 'info' });
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
      const result = await musicGenerationPlugin.checkStatus(jobId);
      setGenerationResult(result);
      setIsGenerating(false);
      
      if (result.status === 'succeeded') {
        // Add to recent generations
        setRecentGenerations(prev => [result, ...prev].slice(0, 10));
        enqueueSnackbar('Music generated successfully!', { variant: 'success' });
      }
    } catch (err: any) {
      setIsGenerating(false);
      setError(err.message || 'Failed to fetch generation result');
      enqueueSnackbar(`Error: ${err.message || 'Failed to fetch result'}`, { 
        variant: 'error' 
      });
    }
  };
  
  const handlePlayPause = (id: string, url?: string, trackName?: string) => {
    if (!url) return;
    
    const audioKey = trackName ? `${id}-${trackName}` : id;
    
    if (!audioRefs.current[audioKey]) {
      audioRefs.current[audioKey] = new Audio(url);
      audioRefs.current[audioKey].addEventListener('ended', () => {
        if (playingId === id && playingTrack === trackName) {
          setPlayingId(null);
          setPlayingTrack(null);
        }
      });
    }
    
    if (playingId === id && playingTrack === trackName) {
      // Pause this audio
      audioRefs.current[audioKey].pause();
      setPlayingId(null);
      setPlayingTrack(null);
    } else {
      // Pause any playing audio
      if (playingId) {
        const currentKey = playingTrack ? `${playingId}-${playingTrack}` : playingId;
        if (audioRefs.current[currentKey]) {
          audioRefs.current[currentKey].pause();
        }
      }
      
      // Play new audio
      audioRefs.current[audioKey].play();
      setPlayingId(id);
      setPlayingTrack(trackName || null);
    }
  };
  
  const handleSaveToLibrary = (result: MusicGenerationResult) => {
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
        Music Generation
      </Typography>
      <Typography variant="body1" paragraph>
        Create original music tracks from text descriptions with customisable genre and mood
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <MusicGenerationForm 
            onSubmit={handleGenerateMusic} 
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
                Generating music... {progress}%
              </Typography>
            </Box>
          )}
          
          {generationResult && generationResult.status === 'succeeded' && generationResult.audioUrl && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Generated Music
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton 
                  color="primary" 
                  onClick={() => handlePlayPause(generationResult.id, generationResult.audioUrl)}
                >
                  {playingId === generationResult.id && !playingTrack ? <Pause /> : <PlayArrow />}
                </IconButton>
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {generationResult.duration ? `${generationResult.duration.toFixed(1)}s` : 'Full Track'}
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
              
              {generationResult.individualTracks && generationResult.individualTracks.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Individual Tracks
                  </Typography>
                  <Grid container spacing={1}>
                    {generationResult.individualTracks.map((track, index) => (
                      <Grid item key={index}>
                        <Chip
                          icon={<MusicNoteIcon />}
                          label={track.name}
                          clickable
                          color={playingId === generationResult.id && playingTrack === track.name ? 'primary' : 'default'}
                          onClick={() => handlePlayPause(generationResult.id, track.url, track.name)}
                          onDelete={() => window.open(track.url, '_blank')}
                          deleteIcon={<Download />}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
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
                          <AlbumIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={`Music Track ${generation.id.slice(-4)}`}
                        secondary={`${new Date(generation.createdAt).toLocaleDateString()} • ${generation.duration?.toFixed(1)}s`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={() => handlePlayPause(generation.id, generation.audioUrl)}
                        >
                          {playingId === generation.id && !playingTrack ? <Pause /> : <PlayArrow />}
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

export default MusicGenerationPage;
