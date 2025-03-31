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
  CardContent,
  Chip
} from '@mui/material';
import {
  MusicNote,
  PlayArrow,
  Pause,
  Save,
  Add,
  Info
} from '@mui/icons-material';
import { MusicGenerationOptions } from '../../features/generation/plugins/MusicGenerationPlugin';

interface MusicGenerationFormProps {
  onSubmit: (options: MusicGenerationOptions) => void;
  isGenerating: boolean;
  defaultValues?: Partial<MusicGenerationOptions>;
}

const MusicGenerationForm: React.FC<MusicGenerationFormProps> = ({
  onSubmit,
  isGenerating,
  defaultValues = {}
}) => {
  const [prompt, setPrompt] = useState(defaultValues.prompt || '');
  const [genre, setGenre] = useState(defaultValues.genre || 'pop');
  const [mood, setMood] = useState(defaultValues.mood || 'happy');
  const [tempo, setTempo] = useState(defaultValues.tempo || 120);
  const [duration, setDuration] = useState(defaultValues.duration || 60);
  const [structure, setStructure] = useState(defaultValues.structure || '');
  const [outputFormat, setOutputFormat] = useState(defaultValues.outputFormat || 'mp3');
  const [includeLayeredTracks, setIncludeLayeredTracks] = useState(defaultValues.includeLayeredTracks ?? false);
  
  const [referenceTrack, setReferenceTrack] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleReferenceTrackSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setReferenceTrack(event.target.files[0]);
    }
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
      prompt,
      genre: genre as MusicGenerationOptions['genre'],
      mood: mood as MusicGenerationOptions['mood'],
      tempo,
      duration,
      structure,
      outputFormat: outputFormat as MusicGenerationOptions['outputFormat'],
      includeLayeredTracks
    });
  };
  
  // Suggestion chips for prompts
  const promptSuggestions = [
    "Upbeat electronic track for product launch",
    "Calming ambient music for meditation app",
    "Dramatic orchestral score for trailer",
    "Uplifting corporate background music",
    "Tropical house beat for summer campaign"
  ];
  
  return (
    <Box component={Paper} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Music Generation
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Music Description
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Describe the music you want to create"
              multiline
              rows={4}
              fullWidth
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              variant="outlined"
              placeholder="e.g., An upbeat electronic track with a catchy melody and energetic beat, suitable for a product launch video"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Suggestions:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {promptSuggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  onClick={() => setPrompt(suggestion)}
                  variant="outlined"
                  clickable
                />
              ))}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => fileInputRef.current?.click()}
            >
              Add Reference Track
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="audio/*"
              onChange={handleReferenceTrackSelect}
            />
            {referenceTrack && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Reference: {referenceTrack.name}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Music Style
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Genre</InputLabel>
              <Select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                label="Genre"
              >
                <MenuItem value="pop">Pop</MenuItem>
                <MenuItem value="rock">Rock</MenuItem>
                <MenuItem value="electronic">Electronic</MenuItem>
                <MenuItem value="ambient">Ambient</MenuItem>
                <MenuItem value="classical">Classical</MenuItem>
                <MenuItem value="jazz">Jazz</MenuItem>
                <MenuItem value="hip-hop">Hip-Hop</MenuItem>
                <MenuItem value="folk">Folk</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Mood</InputLabel>
              <Select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                label="Mood"
              >
                <MenuItem value="happy">Happy</MenuItem>
                <MenuItem value="sad">Sad</MenuItem>
                <MenuItem value="energetic">Energetic</MenuItem>
                <MenuItem value="relaxed">Relaxed</MenuItem>
                <MenuItem value="tense">Tense</MenuItem>
                <MenuItem value="mysterious">Mysterious</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>
              Tempo (BPM)
            </Typography>
            <Slider
              value={tempo}
              onChange={(_, value) => setTempo(value as number)}
              min={60}
              max={180}
              step={1}
              marks={[
                { value: 60, label: '60' },
                { value: 120, label: '120' },
                { value: 180, label: '180' }
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Output Settings
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>
              Duration (seconds)
            </Typography>
            <Slider
              value={duration}
              onChange={(_, value) => setDuration(value as number)}
              min={10}
              max={300}
              step={5}
              marks={[
                { value: 30, label: '30s' },
                { value: 60, label: '1m' },
                { value: 120, label: '2m' },
                { value: 300, label: '5m' }
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Structure (optional)"
              fullWidth
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              placeholder="e.g., intro-verse-chorus-verse-chorus-outro"
              helperText="Define the music structure sections or leave blank for AI to determine"
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
                <MenuItem value="midi">MIDI</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={includeLayeredTracks}
                  onChange={(e) => setIncludeLayeredTracks(e.target.checked)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ mr: 1 }}>Include Individual Tracks</Typography>
                  <Tooltip title="When enabled, separate tracks for different instruments will be provided, allowing for more editing flexibility">
                    <Info fontSize="small" color="action" />
                  </Tooltip>
                </Box>
              }
            />
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
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating ? 'Generating...' : 'Generate Music'}
        </Button>
      </Box>
    </Box>
  );
};

export default MusicGenerationForm;
