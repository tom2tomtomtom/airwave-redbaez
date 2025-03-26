import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Chip, 
  Paper,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { MarketingStrategy, ToneOption } from '../../../services/copyGeneration/types';

interface BrandVoiceFormProps {
  strategy: MarketingStrategy;
  onStrategyChange: (strategy: MarketingStrategy) => void;
}

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

/**
 * Brand Voice Form Component
 * 
 * Allows users to define their brand voice, values,
 * personality, and unique selling proposition.
 */
const BrandVoiceForm: React.FC<BrandVoiceFormProps> = ({
  strategy,
  onStrategyChange
}) => {
  const [newValue, setNewValue] = React.useState('');
  
  // Handler for text field changes
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    onStrategyChange({
      ...strategy,
      brandVoice: {
        ...strategy.brandVoice,
        [name]: value
      }
    });
  };
  
  // Handler for select changes
  const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    
    if (name) {
      onStrategyChange({
        ...strategy,
        brandVoice: {
          ...strategy.brandVoice,
          [name]: value
        }
      });
    }
  };
  
  // Handler for adding a new value
  const handleAddValue = () => {
    if (!newValue.trim()) return;
    
    onStrategyChange({
      ...strategy,
      brandVoice: {
        ...strategy.brandVoice,
        values: [...strategy.brandVoice.values, newValue.trim()]
      }
    });
    
    setNewValue('');
  };
  
  // Handler for deleting a value
  const handleDeleteValue = (index: number) => {
    const newValues = [...strategy.brandVoice.values];
    newValues.splice(index, 1);
    
    onStrategyChange({
      ...strategy,
      brandVoice: {
        ...strategy.brandVoice,
        values: newValues
      }
    });
  };
  
  // Handler for key press (Enter key)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddValue();
    }
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Brand Voice
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth margin="normal">
          <InputLabel id="tone-select-label">Tone</InputLabel>
          <Select
            labelId="tone-select-label"
            id="tone-select"
            name="tone"
            value={strategy.brandVoice.tone}
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
        
        <TextField
          fullWidth
          name="personality"
          label="Brand Personality"
          value={strategy.brandVoice.personality}
          onChange={handleTextChange}
          placeholder="Describe your brand's personality traits and characteristics"
          multiline
          rows={2}
          variant="outlined"
          margin="normal"
        />
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Brand Values
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Add a core value your brand stands for"
          onKeyPress={handleKeyPress}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleAddValue}
                  edge="end"
                  aria-label="add value"
                >
                  <AddIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          margin="normal"
        />
        
        <Paper 
          variant="outlined" 
          sx={{ 
            mt: 1, 
            p: 1, 
            display: 'flex', 
            flexWrap: 'wrap', 
            minHeight: '56px' 
          }}
        >
          {strategy.brandVoice.values.length > 0 ? (
            strategy.brandVoice.values.map((value, index) => (
              <Chip
                key={index}
                label={value}
                onDelete={() => handleDeleteValue(index)}
                sx={{ m: 0.5 }}
              />
            ))
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ p: 1 }}
            >
              No brand values added yet. What principles does your brand stand for?
            </Typography>
          )}
        </Paper>
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Unique Selling Proposition
      </Typography>
      
      <TextField
        fullWidth
        name="uniqueSellingProposition"
        value={strategy.brandVoice.uniqueSellingProposition}
        onChange={handleTextChange}
        placeholder="What makes your brand unique and differentiates it from competitors?"
        multiline
        rows={3}
        variant="outlined"
        margin="normal"
        helperText="A clear statement that communicates the unique benefit your brand offers"
      />
    </Box>
  );
};

export default BrandVoiceForm;
