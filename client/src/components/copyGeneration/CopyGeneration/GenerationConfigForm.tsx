import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormControlLabel, 
  Switch, 
  TextField, 
  Slider,
  Grid,
  SelectChangeEvent
} from '@mui/material';

import { 
  CopyGenerationConfig, 
  ToneOption, 
  StyleOption, 
  CopyLength, 
  CopyType 
} from '../../../services/copyGeneration/types';

interface GenerationConfigFormProps {
  config: CopyGenerationConfig;
  onConfigChange: (config: CopyGenerationConfig) => void;
}

/**
 * Generation Config Form Component
 * 
 * Allows users to configure parameters for copy generation,
 * including tone, style, length, type, and call to action.
 */
const GenerationConfigForm: React.FC<GenerationConfigFormProps> = ({
  config,
  onConfigChange
}) => {
  // Available tone options
  const toneOptions: ToneOption[] = [
    'Professional', 
    'Casual', 
    'Friendly', 
    'Authoritative',
    'Humorous', 
    'Inspirational', 
    'Conversational', 
    'Urgent',
    'Informative', 
    'Enthusiastic', 
    'Compassionate', 
    'Bold'
  ];
  
  // Available style options
  const styleOptions: StyleOption[] = [
    'Storytelling', 
    'Direct', 
    'Question-based', 
    'Problem-solution',
    'Testimonial', 
    'Fact-based', 
    'Emotional', 
    'Feature-focused',
    'Benefit-focused', 
    'Comparison', 
    'How-to', 
    'Provocative'
  ];
  
  // Available length options
  const lengthOptions: CopyLength[] = ['short', 'medium', 'long'];
  
  // Available copy type options
  const copyTypeOptions: CopyType[] = ['headline', 'body', 'cta', 'social', 'email'];
  
  // Handler for select changes
  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    
    onConfigChange({
      ...config,
      [name]: value
    });
  };
  
  // Handler for switch changes
  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    
    onConfigChange({
      ...config,
      [name]: checked
    });
  };
  
  // Handler for text field changes
  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    onConfigChange({
      ...config,
      [name]: value
    });
  };
  
  // Handler for slider changes
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    onConfigChange({
      ...config,
      frameCount: newValue as number
    });
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Copy Generation Settings
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="copy-type-select-label">Copy Type</InputLabel>
              <Select
                labelId="copy-type-select-label"
                id="type"
                name="type"
                value={config.type}
                label="Copy Type"
                onChange={handleSelectChange}
              >
                {copyTypeOptions.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="length-select-label">Length</InputLabel>
              <Select
                labelId="length-select-label"
                id="length"
                name="length"
                value={config.length}
                label="Length"
                onChange={handleSelectChange}
              >
                {lengthOptions.map((length) => (
                  <MenuItem key={length} value={length}>
                    {length.charAt(0).toUpperCase() + length.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="tone-select-label">Tone</InputLabel>
              <Select
                labelId="tone-select-label"
                id="tone"
                name="tone"
                value={config.tone}
                label="Tone"
                onChange={handleSelectChange}
              >
                {toneOptions.map((tone) => (
                  <MenuItem key={tone} value={tone}>
                    {tone}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="style-select-label">Style</InputLabel>
              <Select
                labelId="style-select-label"
                id="style"
                name="style"
                value={config.style}
                label="Style"
                onChange={handleSelectChange}
              >
                {styleOptions.map((style) => (
                  <MenuItem key={style} value={style}>
                    {style}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={config.includeCallToAction}
              onChange={handleSwitchChange}
              name="includeCallToAction"
              color="primary"
            />
          }
          label="Include Call to Action"
        />
        
        {config.includeCallToAction && (
          <TextField
            fullWidth
            name="callToActionText"
            label="Call to Action Text"
            value={config.callToActionText || ''}
            onChange={handleTextChange}
            placeholder="E.g., Learn More, Sign Up, Get Started, etc."
            margin="normal"
            disabled={!config.includeCallToAction}
          />
        )}
      </Box>
      
      {(config.type === 'social' || config.type === 'email') && (
        <Box sx={{ mb: 3 }}>
          <Typography id="frame-count-slider" gutterBottom>
            Number of Frames/Sections: {config.frameCount}
          </Typography>
          <Slider
            value={config.frameCount || 1}
            onChange={handleSliderChange}
            aria-labelledby="frame-count-slider"
            valueLabelDisplay="auto"
            step={1}
            marks
            min={1}
            max={10}
          />
          <Typography variant="body2" color="text.secondary">
            {config.type === 'social' 
              ? 'Create multi-frame content for carousel posts' 
              : 'Create multi-section email content'}
          </Typography>
        </Box>
      )}
      
      <Box>
        <Typography variant="body2" color="text.secondary">
          Configure how your copy will be generated based on your marketing strategy.
          These settings will influence the tone, style, and structure of the generated copy.
        </Typography>
      </Box>
    </Paper>
  );
};

export default GenerationConfigForm;
