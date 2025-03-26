import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Chip, 
  Paper,
  IconButton,
  InputAdornment,
  Slider,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { MarketingStrategy } from '../../../services/copyGeneration/types';

interface ContentParametersFormProps {
  strategy: MarketingStrategy;
  onStrategyChange: (strategy: MarketingStrategy) => void;
}

/**
 * Content Parameters Form Component
 * 
 * Allows users to define parameters for content generation,
 * including maximum length, required keywords, forbidden words,
 * and mandatory phrases to include.
 */
const ContentParametersForm: React.FC<ContentParametersFormProps> = ({
  strategy,
  onStrategyChange
}) => {
  const [newKeyword, setNewKeyword] = React.useState('');
  const [newForbiddenWord, setNewForbiddenWord] = React.useState('');
  const [newPhrase, setNewPhrase] = React.useState('');
  
  // Handler for slider (max length) change
  const handleMaxLengthChange = (_event: Event, newValue: number | number[]) => {
    onStrategyChange({
      ...strategy,
      contentParameters: {
        ...strategy.contentParameters,
        maxLength: newValue as number
      }
    });
  };
  
  // Handler for adding a new keyword
  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    
    onStrategyChange({
      ...strategy,
      contentParameters: {
        ...strategy.contentParameters,
        requiredKeywords: [...strategy.contentParameters.requiredKeywords, newKeyword.trim()]
      }
    });
    
    setNewKeyword('');
  };
  
  // Handler for adding a new forbidden word
  const handleAddForbiddenWord = () => {
    if (!newForbiddenWord.trim()) return;
    
    onStrategyChange({
      ...strategy,
      contentParameters: {
        ...strategy.contentParameters,
        forbiddenWords: [...strategy.contentParameters.forbiddenWords, newForbiddenWord.trim()]
      }
    });
    
    setNewForbiddenWord('');
  };
  
  // Handler for adding a new required phrase
  const handleAddPhrase = () => {
    if (!newPhrase.trim()) return;
    
    onStrategyChange({
      ...strategy,
      contentParameters: {
        ...strategy.contentParameters,
        mustIncludePhrases: [...strategy.contentParameters.mustIncludePhrases, newPhrase.trim()]
      }
    });
    
    setNewPhrase('');
  };
  
  // Handler for deleting a keyword
  const handleDeleteKeyword = (index: number) => {
    const newKeywords = [...strategy.contentParameters.requiredKeywords];
    newKeywords.splice(index, 1);
    
    onStrategyChange({
      ...strategy,
      contentParameters: {
        ...strategy.contentParameters,
        requiredKeywords: newKeywords
      }
    });
  };
  
  // Handler for deleting a forbidden word
  const handleDeleteForbiddenWord = (index: number) => {
    const newForbiddenWords = [...strategy.contentParameters.forbiddenWords];
    newForbiddenWords.splice(index, 1);
    
    onStrategyChange({
      ...strategy,
      contentParameters: {
        ...strategy.contentParameters,
        forbiddenWords: newForbiddenWords
      }
    });
  };
  
  // Handler for deleting a required phrase
  const handleDeletePhrase = (index: number) => {
    const newPhrases = [...strategy.contentParameters.mustIncludePhrases];
    newPhrases.splice(index, 1);
    
    onStrategyChange({
      ...strategy,
      contentParameters: {
        ...strategy.contentParameters,
        mustIncludePhrases: newPhrases
      }
    });
  };
  
  // Handler for key press (Enter key)
  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLDivElement>,
    type: 'keyword' | 'forbiddenWord' | 'phrase'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'keyword') {
        handleAddKeyword();
      } else if (type === 'forbiddenWord') {
        handleAddForbiddenWord();
      } else {
        handleAddPhrase();
      }
    }
  };
  
  // Max length marks for the slider
  const marks = [
    { value: 50, label: '50' },
    { value: 150, label: '150' },
    { value: 300, label: '300' },
    { value: 500, label: '500' },
    { value: 1000, label: '1000' }
  ];
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Content Parameters
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Maximum Length (words)
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Slider
              value={strategy.contentParameters.maxLength}
              onChange={handleMaxLengthChange}
              aria-labelledby="max-length-slider"
              min={50}
              max={1000}
              step={50}
              marks={marks}
              valueLabelDisplay="auto"
            />
          </Grid>
          <Grid item>
            <Typography variant="body2">
              {strategy.contentParameters.maxLength} words
            </Typography>
          </Grid>
        </Grid>
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Required Keywords
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="Add a keyword that must be included"
          onKeyPress={(e) => handleKeyPress(e, 'keyword')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleAddKeyword}
                  edge="end"
                  aria-label="add keyword"
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
          {strategy.contentParameters.requiredKeywords.length > 0 ? (
            strategy.contentParameters.requiredKeywords.map((keyword, index) => (
              <Chip
                key={index}
                label={keyword}
                onDelete={() => handleDeleteKeyword(index)}
                sx={{ m: 0.5 }}
              />
            ))
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ p: 1 }}
            >
              No required keywords added yet. Add words that should appear in the copy.
            </Typography>
          )}
        </Paper>
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Forbidden Words
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          value={newForbiddenWord}
          onChange={(e) => setNewForbiddenWord(e.target.value)}
          placeholder="Add a word that should not be used"
          onKeyPress={(e) => handleKeyPress(e, 'forbiddenWord')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleAddForbiddenWord}
                  edge="end"
                  aria-label="add forbidden word"
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
          {strategy.contentParameters.forbiddenWords.length > 0 ? (
            strategy.contentParameters.forbiddenWords.map((word, index) => (
              <Chip
                key={index}
                label={word}
                onDelete={() => handleDeleteForbiddenWord(index)}
                sx={{ m: 0.5 }}
              />
            ))
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ p: 1 }}
            >
              No forbidden words added yet. Add words that should be avoided in the copy.
            </Typography>
          )}
        </Paper>
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Must-Include Phrases
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          value={newPhrase}
          onChange={(e) => setNewPhrase(e.target.value)}
          placeholder="Add a phrase that must be included exactly"
          onKeyPress={(e) => handleKeyPress(e, 'phrase')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleAddPhrase}
                  edge="end"
                  aria-label="add phrase"
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
          {strategy.contentParameters.mustIncludePhrases.length > 0 ? (
            strategy.contentParameters.mustIncludePhrases.map((phrase, index) => (
              <Chip
                key={index}
                label={phrase}
                onDelete={() => handleDeletePhrase(index)}
                sx={{ m: 0.5 }}
              />
            ))
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ p: 1 }}
            >
              No required phrases added yet. Add exact phrases that must appear in the copy.
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ContentParametersForm;
