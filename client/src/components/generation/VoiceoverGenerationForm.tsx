import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { Mic, PlayArrow, Pause, Save } from '@mui/icons-material';
import { VoiceoverGenerationOptions } from '../../features/generation/plugins/VoiceoverGenerationPlugin';

interface VoiceoverGenerationFormProps {
  onSubmit: (options: VoiceoverGenerationOptions) => void;
  isGenerating: boolean;
  defaultValues?: Partial<VoiceoverGenerationOptions>;
}

const VoiceoverGenerationForm: React.FC<VoiceoverGenerationFormProps> = ({
  onSubmit,
  isGenerating,
  defaultValues = {}
}) => {
  const [text, setText] = useState(defaultValues.text || '');
  const [voice, setVoice] = useState(defaultValues.voice || 'en-GB-male-1');
  const [speed, setSpeed] = useState(defaultValues.speed || 1.0);
  const [pitch, setPitch] = useState(defaultValues.pitch || 0);
  const [emotion, setEmotion] = useState(defaultValues.emotion || 'neutral');
  const [enhanceAudio, setEnhanceAudio] = useState(defaultValues.enhanceAudio ?? true);
  const [outputFormat, setOutputFormat] = useState(defaultValues.outputFormat || 'mp3');
  const [preservePunctuation, setPreservePunctuation] = useState(defaultValues.preservePunctuation ?? true);
  
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Speech recognition for recording text input
  const startRecording = () => {
    setRecording(true);
    // In a real implementation, we'd use the Web Speech API or another solution
    // to capture audio and convert it to text
    setTimeout(() => {
      setRecording(false);
      // Mock adding some text
      setText(prevText => prevText + (prevText ? ' ' : '') + 'This is sample recorded text.');
    }, 2000);
  };
  
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleSubmit = () => {
    onSubmit({
      text,
      voice,
      speed,
      pitch,
      emotion: emotion as VoiceoverGenerationOptions['emotion'],
      enhanceAudio,
      outputFormat: outputFormat as VoiceoverGenerationOptions['outputFormat'],
      preservePunctuation
    });
  };
  
  return (
    <Box component={Paper} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Voiceover Generation
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Text to Convert
        </Typography>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12}>
            <TextField
              label="Enter text for voiceover"
              multiline
              rows={6}
              fullWidth
              value={text}
              onChange={(e) => setText(e.target.value)}
              variant="outlined"
              placeholder="Type or paste your script here..."
            />
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<Mic color={recording ? 'error' : 'inherit'} />}
              onClick={startRecording}
              disabled={recording}
            >
              {recording ? 'Recording...' : 'Record Input'}
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Voice Settings
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Voice</InputLabel>
              <Select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                label="Voice"
              >
                <MenuItem value="en-GB-male-1">British Male</MenuItem>
                <MenuItem value="en-GB-female-1">British Female</MenuItem>
                <MenuItem value="en-US-male-1">American Male</MenuItem>
                <MenuItem value="en-US-female-1">American Female</MenuItem>
                <MenuItem value="en-AU-male-1">Australian Male</MenuItem>
                <MenuItem value="en-AU-female-1">Australian Female</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Speed</Typography>
            <Slider
              value={speed}
              onChange={(_, value) => setSpeed(value as number)}
              min={0.5}
              max={2.0}
              step={0.1}
              marks={[
                { value: 0.5, label: '0.5x' },
                { value: 1.0, label: '1.0x' },
                { value: 1.5, label: '1.5x' },
                { value: 2.0, label: '2.0x' }
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Pitch</Typography>
            <Slider
              value={pitch}
              onChange={(_, value) => setPitch(value as number)}
              min={-10}
              max={10}
              marks={[
                { value: -10, label: 'Lower' },
                { value: 0, label: 'Normal' },
                { value: 10, label: 'Higher' }
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Audio Settings
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Emotion</InputLabel>
              <Select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                label="Emotion"
              >
                <MenuItem value="neutral">Neutral</MenuItem>
                <MenuItem value="happy">Happy</MenuItem>
                <MenuItem value="sad">Sad</MenuItem>
                <MenuItem value="angry">Angry</MenuItem>
                <MenuItem value="excited">Excited</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={enhanceAudio}
                  onChange={(e) => setEnhanceAudio(e.target.checked)}
                />
              }
              label="Enhance Audio Quality"
            />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={preservePunctuation}
                  onChange={(e) => setPreservePunctuation(e.target.checked)}
                />
              }
              label="Preserve Punctuation Timing"
            />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Output Format</InputLabel>
              <Select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                label="Output Format"
              >
                <MenuItem value="mp3">MP3</MenuItem>
                <MenuItem value="wav">WAV</MenuItem>
                <MenuItem value="ogg">OGG</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Grid>
      </Grid>
      
      {audioBlob && (
        <Box sx={{ mt: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Preview
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isPlaying ? <Pause /> : <PlayArrow />}
                  onClick={handlePlayPause}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Save />}
                >
                  Save to Library
                </Button>
                <audio ref={audioRef} src={URL.createObjectURL(audioBlob)} onEnded={() => setIsPlaying(false)} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={isGenerating || !text.trim()}
        >
          {isGenerating ? 'Generating...' : 'Generate Voiceover'}
        </Button>
      </Box>
    </Box>
  );
};

export default VoiceoverGenerationForm;
