import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Slider,
  FormControlLabel,
  Switch,
  Grid,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SaveIcon from '@mui/icons-material/Save';
import WaveformIcon from '@mui/icons-material/GraphicEq';
import { styled } from '@mui/material/styles';
import { useClient } from '../../hooks/useClient';
import { useSocket } from '../../contexts/SocketContext';
import { useSnackbar } from 'notistack';
import { api } from '../../services/api';
import { generateUUID } from '../../utils/generateUUID';
import AudioWaveform from '../../components/generation/AudioWaveform';
import { LoadingButton } from '@mui/lab';

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
}));

const TextAreaWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const ControlsWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

const PreviewWrapper = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const WaveformContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  height: '80px',
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1),
  position: 'relative',
}));

interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  accent?: string;
  preview?: string;
}

interface VoiceoverJob {
  jobId: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  message?: string;
  error?: string;
  audioUrl?: string;
  assetId?: string;
}

const VoiceoverPage: React.FC = () => {
  const { client } = useClient();
  const { socket } = useSocket();
  const { enqueueSnackbar } = useSnackbar();
  
  // Form state
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0);
  const [enhanceAudio, setEnhanceAudio] = useState<boolean>(true);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Audio playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Job state
  const [currentJob, setCurrentJob] = useState<VoiceoverJob | null>(null);

  // Load available voices on component mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await api.get('/api/voiceover/voices', {
          params: { client_id: client?.id }
        });
        
        if (response.data.success) {
          setVoices(response.data.data);
          if (response.data.data.length > 0) {
            setSelectedVoice(response.data.data[0].id);
          }
        } else {
          setError('Failed to load voices');
        }
      } catch (err) {
        console.error('Error fetching voices:', err);
        setError('Failed to load voices. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (client?.id) {
      fetchVoices();
    }
  }, [client?.id]);

  // Socket event listener for job updates
  useEffect(() => {
    if (!socket) return;

    const handleJobProgress = (data: any) => {
      if (data.service === 'voiceover' && currentJob && data.jobId === currentJob.jobId) {
        setCurrentJob(prev => ({
          ...prev!,
          status: data.status,
          progress: data.progress,
          message: data.message,
          error: data.error,
          audioUrl: extractAudioUrl(data.message)
        }));

        if (data.status === 'succeeded') {
          enqueueSnackbar('Voiceover generated successfully!', { variant: 'success' });
          setIsGenerating(false);
        } else if (data.status === 'failed') {
          enqueueSnackbar(`Voiceover generation failed: ${data.error}`, { variant: 'error' });
          setIsGenerating(false);
        }
      }
    };

    socket.on('jobProgress', handleJobProgress);

    return () => {
      socket.off('jobProgress', handleJobProgress);
    };
  }, [socket, currentJob, enqueueSnackbar]);

  // Extract audio URL from a message string that might contain JSON
  const extractAudioUrl = (message?: string): string | undefined => {
    if (!message) return undefined;
    
    try {
      // Check if the message contains a JSON string
      const jsonStartIndex = message.indexOf('{');
      if (jsonStartIndex >= 0) {
        const jsonString = message.substring(jsonStartIndex);
        const data = JSON.parse(jsonString);
        return data.audioUrl;
      }
    } catch (err) {
      // If parsing fails, just return undefined
      console.warn('Failed to extract audio URL from message', err);
    }
    
    return undefined;
  };

  // Handle form submission
  const handleGenerateVoiceover = async () => {
    if (!text) {
      enqueueSnackbar('Please enter some text', { variant: 'warning' });
      return;
    }

    if (!selectedVoice) {
      enqueueSnackbar('Please select a voice', { variant: 'warning' });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.post('/api/voiceover/generate', {
        client_id: client?.id,
        text,
        voice: selectedVoice,
        speed,
        pitch,
        enhanceAudio
      });

      if (response.data.success) {
        const { jobId } = response.data.data;
        setCurrentJob({
          jobId,
          status: 'pending',
          progress: 0,
          message: 'Starting voiceover generation...'
        });
      } else {
        throw new Error(response.data.message || 'Failed to start voiceover generation');
      }
    } catch (err: any) {
      console.error('Error generating voiceover:', err);
      enqueueSnackbar(`Error: ${err.message || 'Failed to generate voiceover'}`, { variant: 'error' });
      setIsGenerating(false);
      setError(err.message || 'An unexpected error occurred');
    }
  };

  // Handle audio playback
  const togglePlayPause = () => {
    if (!currentJob?.audioUrl) return;

    if (!audioElement) {
      const audio = new Audio(currentJob.audioUrl);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Reset audio when a new URL is set
  useEffect(() => {
    if (currentJob?.audioUrl && audioElement) {
      audioElement.src = currentJob.audioUrl;
      setIsPlaying(false);
    }
  }, [currentJob?.audioUrl]);

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  // Handle text area changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  // Save the generated voiceover to assets
  const handleSaveVoiceover = async () => {
    if (!currentJob?.audioUrl || !currentJob?.assetId) {
      enqueueSnackbar('No voiceover to save', { variant: 'warning' });
      return;
    }

    enqueueSnackbar('Voiceover saved to assets', { variant: 'success' });
    // In a real implementation, we would save additional metadata or tags here
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Voiceover Generation
      </Typography>
      
      <Typography variant="body1" paragraph>
        Generate natural-sounding voiceovers from text using advanced AI voices.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <StyledPaper elevation={2}>
        <TextAreaWrapper>
          <Typography variant="h6" gutterBottom>
            Text to Convert
          </Typography>
          <TextField
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            placeholder="Enter the text you want to convert to speech..."
            value={text}
            onChange={handleTextChange}
            disabled={isGenerating}
          />
        </TextAreaWrapper>
        
        <ControlsWrapper>
          <Typography variant="h6" gutterBottom>
            Voice Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="voice-select-label">Voice</InputLabel>
                <Select
                  labelId="voice-select-label"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value as string)}
                  label="Voice"
                  disabled={isGenerating}
                >
                  {voices.map((voice) => (
                    <MenuItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender}{voice.accent ? `, ${voice.accent}` : ''})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box>
                <Typography id="speed-slider" gutterBottom>
                  Speed: {speed.toFixed(1)}x
                </Typography>
                <Slider
                  aria-labelledby="speed-slider"
                  value={speed}
                  onChange={(_e, value) => setSpeed(value as number)}
                  step={0.1}
                  min={0.5}
                  max={2.0}
                  marks={[
                    { value: 0.5, label: '0.5x' },
                    { value: 1.0, label: '1.0x' },
                    { value: 2.0, label: '2.0x' },
                  ]}
                  disabled={isGenerating}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box>
                <Typography id="pitch-slider" gutterBottom>
                  Pitch: {pitch > 0 ? `+${pitch}` : pitch}
                </Typography>
                <Slider
                  aria-labelledby="pitch-slider"
                  value={pitch}
                  onChange={(_e, value) => setPitch(value as number)}
                  step={1}
                  min={-10}
                  max={10}
                  marks={[
                    { value: -10, label: '-10' },
                    { value: 0, label: '0' },
                    { value: 10, label: '+10' },
                  ]}
                  disabled={isGenerating}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enhanceAudio}
                    onChange={(e) => setEnhanceAudio(e.target.checked)}
                    disabled={isGenerating}
                  />
                }
                label="Enhance Audio Quality"
              />
            </Grid>
          </Grid>
        </ControlsWrapper>
        
        <Box display="flex" justifyContent="flex-end">
          <LoadingButton
            variant="contained"
            color="primary"
            size="large"
            onClick={handleGenerateVoiceover}
            loading={isGenerating}
            disabled={!text || !selectedVoice}
            sx={{ px: 4 }}
          >
            Generate Voiceover
          </LoadingButton>
        </Box>
      </StyledPaper>
      
      {currentJob && (
        <StyledPaper elevation={2}>
          <Typography variant="h6" gutterBottom>
            Generation Progress
          </Typography>
          
          <Box display="flex" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
              Status: {currentJob.status}
            </Typography>
            {currentJob.status === 'processing' && (
              <CircularProgress size={16} thickness={5} />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgressWithLabel value={currentJob.progress} />
            </Box>
          </Box>
          
          {currentJob.message && (
            <Typography variant="body2" color="textSecondary" mt={1}>
              {typeof currentJob.message === 'string' && 
                currentJob.message.replace(/\{.*\}/g, '')}
            </Typography>
          )}
          
          {currentJob.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {currentJob.error}
            </Alert>
          )}
          
          {currentJob.audioUrl && (
            <PreviewWrapper>
              <Typography variant="subtitle1" gutterBottom>
                Preview
              </Typography>
              
              <Box display="flex" alignItems="center" gap={2}>
                <IconButton
                  onClick={togglePlayPause}
                  color="primary"
                  size="large"
                >
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                
                <WaveformContainer>
                  <AudioWaveform 
                    audioUrl={currentJob.audioUrl} 
                    isPlaying={isPlaying}
                  />
                </WaveformContainer>
                
                <Tooltip title="Save to Assets">
                  <IconButton
                    onClick={handleSaveVoiceover}
                    color="primary"
                  >
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </PreviewWrapper>
          )}
        </StyledPaper>
      )}
    </Box>
  );
};

// Helper component for progress bar with label
const LinearProgressWithLabel: React.FC<{ value: number }> = ({ value }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <Box
          sx={{
            height: 10,
            borderRadius: 5,
            backgroundColor: '#e0e0e0',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'primary.main',
              width: `${value}%`,
              transition: 'width 0.4s ease-in-out',
            }}
          />
        </Box>
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="textSecondary">
          {`${Math.round(value)}%`}
        </Typography>
      </Box>
    </Box>
  );
};

export default VoiceoverPage;
