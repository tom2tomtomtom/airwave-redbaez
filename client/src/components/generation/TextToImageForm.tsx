import React, { useState, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Slider,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  IconButton,
  Divider,
  Stack,
  Avatar
} from '@mui/material';
import {
  Image as ImageIcon,
  AddPhotoAlternate,
  Send,
  Close,
  Info,
  Lightbulb
} from '@mui/icons-material';
import { TextToImageOptions } from '../../features/generation/plugins/TextToImagePlugin';

interface TextToImageFormProps {
  onSubmit: (options: TextToImageOptions) => void;
  isGenerating: boolean;
}

const ASPECT_RATIOS = [
  { label: 'Square (1:1)', width: 1024, height: 1024 },
  { label: 'Portrait (2:3)', width: 832, height: 1216 },
  { label: 'Landscape (16:9)', width: 1216, height: 704 },
  { label: 'Widescreen (21:9)', width: 1344, height: 576 },
  { label: 'Instagram', width: 1080, height: 1080 },
  { label: 'Facebook Cover', width: 1200, height: 630 },
  { label: 'Twitter Banner', width: 1500, height: 500 },
];

const STYLE_PRESETS = [
  { label: 'Photorealistic', value: 'photorealistic', description: 'Highly detailed and realistic imagery' },
  { label: 'Digital Art', value: 'digital-art', description: 'Clean digital illustration style' },
  { label: 'Oil Painting', value: 'oil-painting', description: 'Textured brushstrokes with rich colours' },
  { label: 'Watercolour', value: 'watercolor', description: 'Soft, transparent colours with gentle transitions' },
  { label: 'Cartoon', value: 'cartoon', description: 'Simplified, exaggerated style with bold outlines' },
  { label: 'Cinematic', value: 'cinematic', description: 'Dramatic lighting with film-like quality' },
  { label: 'Anime', value: 'anime', description: 'Japanese animation style' },
];

const PROMPT_SUGGESTIONS = [
  'A serene forest landscape with morning fog',
  'A futuristic cityscape with flying vehicles',
  'A cosy café interior with soft lighting',
  'An underwater scene with vibrant coral reefs',
  'A professional product photo of a sleek smartphone',
  'A minimalist logo for a tech company',
  'A portrait of a person with dramatic lighting',
];

const TextToImageForm: React.FC<TextToImageFormProps> = ({ onSubmit, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [styleReference, setStyleReference] = useState<File | null>(null);
  const [styleReferencePreview, setStyleReferencePreview] = useState<string | null>(null);
  const [styleStrength, setStyleStrength] = useState(0.5);
  const [selectedRatio, setSelectedRatio] = useState(0); // Index in ASPECT_RATIOS
  const [numVariations, setNumVariations] = useState(1);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStylePreset, setSelectedStylePreset] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handlePromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(event.target.value);
  };
  
  const handleNegativePromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNegativePrompt(event.target.value);
  };
  
  const handleStyleStrengthChange = (_event: Event, newValue: number | number[]) => {
    setStyleStrength(newValue as number);
  };
  
  const handleNumVariationsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 1 && value <= 9) {
      setNumVariations(value);
    }
  };
  
  const handleSeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? undefined : parseInt(event.target.value);
    if (value === undefined || (!isNaN(value) && value >= 0)) {
      setSeed(value);
    }
  };
  
  const handleRatioChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedRatio(event.target.value as number);
  };
  
  const handleStyleReferenceClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleStyleReferenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setStyleReference(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setStyleReferencePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleClearStyleReference = () => {
    setStyleReference(null);
    setStyleReferencePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleStylePresetSelect = (preset: string | null) => {
    setSelectedStylePreset(preset === selectedStylePreset ? null : preset);
    
    // If a preset is selected, append it to the prompt
    if (preset && preset !== selectedStylePreset) {
      const presetInfo = STYLE_PRESETS.find(p => p.value === preset);
      if (presetInfo) {
        setPrompt((currentPrompt) => {
          const basePrompt = currentPrompt.replace(/,\s*in the style of.*$/, '').trim();
          return basePrompt ? `${basePrompt}, in the style of ${presetInfo.label.toLowerCase()}` : '';
        });
      }
    }
  };
  
  const handlePromptSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
    setShowSuggestions(false);
  };
  
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!prompt.trim()) {
      return;
    }
    
    const ratio = ASPECT_RATIOS[selectedRatio];
    
    const options: TextToImageOptions = {
      prompt,
      negativePrompt: negativePrompt || undefined,
      styleReference,
      width: ratio.width,
      height: ratio.height,
      numVariations,
      styleStrength,
      seed
    };
    
    onSubmit(options);
  };
  
  return (
    <Paper sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                label="Image description"
                placeholder="Describe the image you want to generate..."
                multiline
                rows={3}
                value={prompt}
                onChange={handlePromptChange}
                required
                helperText="Be specific about style, subject, lighting, and other details"
                InputProps={{
                  endAdornment: (
                    <Button
                      sx={{ position: 'absolute', bottom: 8, right: 8 }}
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      startIcon={<Lightbulb />}
                    >
                      Ideas
                    </Button>
                  )
                }}
              />
              
              {showSuggestions && (
                <Paper 
                  elevation={3} 
                  sx={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    zIndex: 10, 
                    mt: 1, 
                    p: 2, 
                    maxHeight: 300, 
                    overflowY: 'auto' 
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Prompt suggestions
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1}>
                    {PROMPT_SUGGESTIONS.map((suggestion, index) => (
                      <Chip
                        key={index}
                        label={suggestion}
                        onClick={() => handlePromptSuggestion(suggestion)}
                        clickable
                        sx={{ justifyContent: 'flex-start', height: 'auto', py: 0.5 }}
                      />
                    ))}
                  </Stack>
                </Paper>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Negative prompt (optional)"
              placeholder="Elements to avoid in the generated image..."
              multiline
              rows={2}
              value={negativePrompt}
              onChange={handleNegativePromptChange}
              helperText="Specify what you don't want to see in the image"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Style presets
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {STYLE_PRESETS.map((style) => (
                <Chip
                  key={style.value}
                  label={style.label}
                  onClick={() => handleStylePresetSelect(style.value)}
                  color={selectedStylePreset === style.value ? 'primary' : 'default'}
                  clickable
                  sx={{ px: 1 }}
                />
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="aspect-ratio-label">Aspect ratio</InputLabel>
              <Select
                labelId="aspect-ratio-label"
                value={selectedRatio}
                onChange={handleRatioChange}
                label="Aspect ratio"
              >
                {ASPECT_RATIOS.map((ratio, index) => (
                  <MenuItem key={index} value={index}>
                    {ratio.label} ({ratio.width}x{ratio.height})
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Select dimensions for your image</FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Number of variations"
              type="number"
              InputProps={{ inputProps: { min: 1, max: 9 } }}
              value={numVariations}
              onChange={handleNumVariationsChange}
              helperText="How many variations to generate (1-9)"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ mb: 1 }}>
              <Typography gutterBottom>Style reference (optional)</Typography>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleStyleReferenceChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              
              {!styleReferencePreview ? (
                <Button
                  variant="outlined"
                  startIcon={<AddPhotoAlternate />}
                  onClick={handleStyleReferenceClick}
                  fullWidth
                  sx={{ height: 100, borderStyle: 'dashed' }}
                >
                  Upload reference image
                </Button>
              ) : (
                <Box sx={{ position: 'relative', width: '100%', height: 200 }}>
                  <img
                    src={styleReferencePreview}
                    alt="Style reference"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: 4
                    }}
                  />
                  <IconButton
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                    }}
                    onClick={handleClearStyleReference}
                  >
                    <Close />
                  </IconButton>
                </Box>
              )}
            </Box>
            
            {styleReferencePreview && (
              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom>Style strength: {styleStrength}</Typography>
                <Slider
                  value={styleStrength}
                  onChange={handleStyleStrengthChange}
                  min={0}
                  max={1}
                  step={0.1}
                  marks={[
                    { value: 0, label: 'Subtle' },
                    { value: 0.5, label: 'Balanced' },
                    { value: 1, label: 'Strong' }
                  ]}
                />
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Seed (optional)"
              type="number"
              value={seed === undefined ? '' : seed}
              onChange={handleSeedChange}
              helperText="For reproducible results (leave empty for random)"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Info color="action" fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Higher quality images may take longer to generate
                </Typography>
              </Box>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<ImageIcon />}
                disabled={isGenerating || !prompt.trim()}
              >
                Generate Images
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default TextToImageForm;
