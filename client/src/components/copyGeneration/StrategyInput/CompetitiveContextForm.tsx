import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Chip, 
  Paper,
  IconButton,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { MarketingStrategy } from '../../../services/copyGeneration/types';

interface CompetitiveContextFormProps {
  strategy: MarketingStrategy;
  onStrategyChange: (strategy: MarketingStrategy) => void;
}

/**
 * Competitive Context Form Component
 * 
 * Allows users to input information about their competitive landscape,
 * including main competitors, differentiators, and market positioning.
 */
const CompetitiveContextForm: React.FC<CompetitiveContextFormProps> = ({
  strategy,
  onStrategyChange
}) => {
  const [newCompetitor, setNewCompetitor] = React.useState('');
  const [newDifferentiator, setNewDifferentiator] = React.useState('');
  
  // Handler for text field changes
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    onStrategyChange({
      ...strategy,
      competitiveContext: {
        ...strategy.competitiveContext,
        [name]: value
      }
    });
  };
  
  // Handler for adding a new competitor
  const handleAddCompetitor = () => {
    if (!newCompetitor.trim()) return;
    
    onStrategyChange({
      ...strategy,
      competitiveContext: {
        ...strategy.competitiveContext,
        mainCompetitors: [...strategy.competitiveContext.mainCompetitors, newCompetitor.trim()]
      }
    });
    
    setNewCompetitor('');
  };
  
  // Handler for adding a new differentiator
  const handleAddDifferentiator = () => {
    if (!newDifferentiator.trim()) return;
    
    onStrategyChange({
      ...strategy,
      competitiveContext: {
        ...strategy.competitiveContext,
        differentiators: [...strategy.competitiveContext.differentiators, newDifferentiator.trim()]
      }
    });
    
    setNewDifferentiator('');
  };
  
  // Handler for deleting a competitor
  const handleDeleteCompetitor = (index: number) => {
    const newCompetitors = [...strategy.competitiveContext.mainCompetitors];
    newCompetitors.splice(index, 1);
    
    onStrategyChange({
      ...strategy,
      competitiveContext: {
        ...strategy.competitiveContext,
        mainCompetitors: newCompetitors
      }
    });
  };
  
  // Handler for deleting a differentiator
  const handleDeleteDifferentiator = (index: number) => {
    const newDifferentiators = [...strategy.competitiveContext.differentiators];
    newDifferentiators.splice(index, 1);
    
    onStrategyChange({
      ...strategy,
      competitiveContext: {
        ...strategy.competitiveContext,
        differentiators: newDifferentiators
      }
    });
  };
  
  // Handler for key press (Enter key)
  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLDivElement>,
    type: 'competitor' | 'differentiator'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'competitor') {
        handleAddCompetitor();
      } else {
        handleAddDifferentiator();
      }
    }
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Competitive Context
      </Typography>
      
      <Typography variant="subtitle1" gutterBottom>
        Main Competitors
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          value={newCompetitor}
          onChange={(e) => setNewCompetitor(e.target.value)}
          placeholder="Add a main competitor"
          onKeyPress={(e) => handleKeyPress(e, 'competitor')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleAddCompetitor}
                  edge="end"
                  aria-label="add competitor"
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
          {strategy.competitiveContext.mainCompetitors.length > 0 ? (
            strategy.competitiveContext.mainCompetitors.map((competitor, index) => (
              <Chip
                key={index}
                label={competitor}
                onDelete={() => handleDeleteCompetitor(index)}
                sx={{ m: 0.5 }}
              />
            ))
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ p: 1 }}
            >
              No competitors added yet. Who are your main competitors in the market?
            </Typography>
          )}
        </Paper>
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Differentiators
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          value={newDifferentiator}
          onChange={(e) => setNewDifferentiator(e.target.value)}
          placeholder="Add a key differentiator for your product/service"
          onKeyPress={(e) => handleKeyPress(e, 'differentiator')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleAddDifferentiator}
                  edge="end"
                  aria-label="add differentiator"
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
          {strategy.competitiveContext.differentiators.length > 0 ? (
            strategy.competitiveContext.differentiators.map((differentiator, index) => (
              <Chip
                key={index}
                label={differentiator}
                onDelete={() => handleDeleteDifferentiator(index)}
                sx={{ m: 0.5 }}
              />
            ))
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ p: 1 }}
            >
              No differentiators added yet. What makes your offering unique compared to competitors?
            </Typography>
          )}
        </Paper>
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Market Positioning
      </Typography>
      
      <TextField
        fullWidth
        name="marketPositioning"
        value={strategy.competitiveContext.marketPositioning}
        onChange={handleTextChange}
        placeholder="Describe your overall position in the market"
        multiline
        rows={3}
        variant="outlined"
        margin="normal"
        helperText="How do you position your brand relative to competitors? (e.g. premium, value, innovative, etc.)"
      />
    </Box>
  );
};

export default CompetitiveContextForm;
