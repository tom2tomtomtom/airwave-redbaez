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

interface TargetAudienceFormProps {
  strategy: MarketingStrategy;
  onStrategyChange: (updates: Partial<MarketingStrategy['targetAudience']>) => void;
}

/**
 * Target Audience Form Component
 * 
 * Allows users to input demographic and psychographic information
 * about their target audience, including pain points and goals.
 */
const TargetAudienceForm: React.FC<TargetAudienceFormProps> = ({
  strategy,
  onStrategyChange
}) => {
  const [newPainPoint, setNewPainPoint] = React.useState('');
  const [newGoal, setNewGoal] = React.useState('');
  
  // Handler for text field changes
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    onStrategyChange({ [name]: value });
  };
  
  // Handler for adding a new pain point
  const handleAddPainPoint = () => {
    if (!newPainPoint.trim()) return;
    
    onStrategyChange({ painPoints: [...strategy.targetAudience.painPoints, newPainPoint.trim()] });
    
    setNewPainPoint('');
  };
  
  // Handler for adding a new goal
  const handleAddGoal = () => {
    if (!newGoal.trim()) return;
    
    onStrategyChange({ goals: [...strategy.targetAudience.goals, newGoal.trim()] });
    
    setNewGoal('');
  };
  
  // Handler for deleting a pain point
  const handleDeletePainPoint = (index: number) => {
    const newPainPoints = [...strategy.targetAudience.painPoints];
    newPainPoints.splice(index, 1);
    
    onStrategyChange({ painPoints: newPainPoints });
  };
  
  // Handler for deleting a goal
  const handleDeleteGoal = (index: number) => {
    const newGoals = [...strategy.targetAudience.goals];
    newGoals.splice(index, 1);
    
    onStrategyChange({ goals: newGoals });
  };
  
  // Handler for key press (Enter key)
  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLDivElement>,
    type: 'painPoint' | 'goal'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'painPoint') {
        handleAddPainPoint();
      } else {
        handleAddGoal();
      }
    }
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Target Audience
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          name="demographics"
          label="Demographics"
          value={strategy.targetAudience.demographics}
          onChange={handleTextChange}
          placeholder="Age, gender, location, income, education, etc."
          multiline
          rows={2}
          variant="outlined"
          margin="normal"
        />
        
        <TextField
          fullWidth
          name="psychographics"
          label="Psychographics"
          value={strategy.targetAudience.psychographics}
          onChange={handleTextChange}
          placeholder="Interests, values, attitudes, lifestyle, behaviors, etc."
          multiline
          rows={2}
          variant="outlined"
          margin="normal"
        />
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Pain Points
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          value={newPainPoint}
          onChange={(e) => setNewPainPoint(e.target.value)}
          placeholder="Add a pain point your audience experiences"
          onKeyPress={(e) => handleKeyPress(e, 'painPoint')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleAddPainPoint}
                  edge="end"
                  aria-label="add pain point"
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
          {strategy.targetAudience.painPoints.length > 0 ? (
            strategy.targetAudience.painPoints.map((painPoint, index) => (
              <Chip
                key={index}
                label={painPoint}
                onDelete={() => handleDeletePainPoint(index)}
                sx={{ m: 0.5 }}
              />
            ))
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ p: 1 }}
            >
              No pain points added yet. What challenges does your audience face?
            </Typography>
          )}
        </Paper>
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Goals
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="Add a goal your audience wants to achieve"
          onKeyPress={(e) => handleKeyPress(e, 'goal')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleAddGoal}
                  edge="end"
                  aria-label="add goal"
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
          {strategy.targetAudience.goals.length > 0 ? (
            strategy.targetAudience.goals.map((goal, index) => (
              <Chip
                key={index}
                label={goal}
                onDelete={() => handleDeleteGoal(index)}
                sx={{ m: 0.5 }}
              />
            ))
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ p: 1 }}
            >
              No goals added yet. What does your audience want to achieve?
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default TargetAudienceForm;
