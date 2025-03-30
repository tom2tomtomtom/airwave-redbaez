import React from 'react';
import { 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid, 
  Typography, 
  Slider 
} from '@mui/material';
import { TextToImageRequest } from '../../types/generation.types';

interface TextToImageFormProps {
  requestData: Partial<TextToImageRequest>;
  onRequestChange: (data: Partial<TextToImageRequest>) => void;
  // Add disabled prop, context etc. if needed later
}

// Define available options (these could come from config or API later)
const aspectRatios = {
  '1:1': 'Square',
  '16:9': 'Landscape',
  '9:16': 'Portrait',
  '4:5': 'Social Portrait',
  '2:3': 'Standard Portrait',
  '3:2': 'Standard Landscape',
};

const stylePresets = {
  'enhance': 'Enhance',
  'anime': 'Anime',
  'photographic': 'Photographic',
  'digital-art': 'Digital Art',
  'comic-book': 'Comic Book',
  'fantasy-art': 'Fantasy Art',
  'line-art': 'Line Art',
  'analog-film': 'Analog Film',
  'neon-punk': 'Neon Punk',
  'isometric': 'Isometric',
  'low-poly': 'Low Poly',
  'origami': 'Origami',
  'modeling-compound': 'Modeling Compound',
  'cinematic': 'Cinematic',
  '3d-model': '3D Model',
  'pixel-art': 'Pixel Art',
  'tile-texture': 'Tile Texture'
};

export const TextToImageForm: React.FC<TextToImageFormProps> = ({ 
  requestData, 
  onRequestChange 
}) => {

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: unknown } }) => {
    const { name, value } = event.target;
    onRequestChange({ ...requestData, [name]: value });
  };

  const handleSelectChange = (event: any) => {
    // Assuming event.target from MUI Select has name and value
    const { name, value } = event.target;
    onRequestChange({ ...requestData, [name]: value });
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          label="Prompt"
          name="prompt"
          value={requestData.prompt || ''}
          onChange={handleChange}
          fullWidth
          required
          multiline
          rows={3}
          placeholder="Describe the image you want to generate..."
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Negative Prompt (Optional)"
          name="negativePrompt"
          value={requestData.negativePrompt || ''}
          onChange={handleChange}
          fullWidth
          multiline
          rows={2}
          placeholder="Describe elements to avoid..."
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Aspect Ratio</InputLabel>
          <Select
            label="Aspect Ratio"
            name="aspectRatio"
            value={requestData.aspectRatio || '1:1'} // Default to square
            onChange={handleSelectChange}
          >
            {Object.entries(aspectRatios).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Style Preset (Optional)</InputLabel>
          <Select
            label="Style Preset (Optional)"
            name="stylePreset"
            value={requestData.stylePreset || ''}
            onChange={handleSelectChange}
          >
            <MenuItem value=""><em>None</em></MenuItem> 
            {Object.entries(stylePresets).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
       <Grid item xs={12}>
        <TextField
          label="Seed (Optional)"
          name="seed"
          type="number"
          value={requestData.seed || ''} // Use empty string for optional number
          onChange={handleChange}
          fullWidth
          InputProps={{
            inputProps: { 
              min: 0 // Seeds are typically non-negative
            } 
          }}
          placeholder="Leave blank for random seed"
        />
      </Grid>
      {/* Add more controls as needed, e.g., sliders for CFG scale, steps */}
    </Grid>
  );
};
