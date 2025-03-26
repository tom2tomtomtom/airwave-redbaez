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

interface CampaignGoalsFormProps {
  strategy: MarketingStrategy;
  onStrategyChange: (strategy: MarketingStrategy) => void;
}

/**
 * Campaign Goals Form Component
 * 
 * Allows users to define primary and secondary campaign goals,
 * KPIs, and conversion actions.
 */
const CampaignGoalsForm: React.FC<CampaignGoalsFormProps> = ({
  strategy,
  onStrategyChange
}) => {
  const [newSecondaryGoal, setNewSecondaryGoal] = React.useState('');
  const [newKpi, setNewKpi] = React.useState('');
  
  // Handler for text field changes
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    onStrategyChange({
      ...strategy,
      campaignGoals: {
        ...strategy.campaignGoals,
        [name]: value
      }
    });
  };
  
  // Handler for adding a new secondary goal
  const handleAddSecondaryGoal = () => {
    if (!newSecondaryGoal.trim()) return;
    
    onStrategyChange({
      ...strategy,
      campaignGoals: {
        ...strategy.campaignGoals,
        secondary: [...strategy.campaignGoals.secondary, newSecondaryGoal.trim()]
      }
    });
    
    setNewSecondaryGoal('');
  };
  
  // Handler for adding a new KPI
  const handleAddKpi = () => {
    if (!newKpi.trim()) return;
    
    onStrategyChange({
      ...strategy,
      campaignGoals: {
        ...strategy.campaignGoals,
        kpis: [...strategy.campaignGoals.kpis, newKpi.trim()]
      }
    });
    
    setNewKpi('');
  };
  
  // Handler for deleting a secondary goal
  const handleDeleteSecondaryGoal = (index: number) => {
    const newSecondaryGoals = [...strategy.campaignGoals.secondary];
    newSecondaryGoals.splice(index, 1);
    
    onStrategyChange({
      ...strategy,
      campaignGoals: {
        ...strategy.campaignGoals,
        secondary: newSecondaryGoals
      }
    });
  };
  
  // Handler for deleting a KPI
  const handleDeleteKpi = (index: number) => {
    const newKpis = [...strategy.campaignGoals.kpis];
    newKpis.splice(index, 1);
    
    onStrategyChange({
      ...strategy,
      campaignGoals: {
        ...strategy.campaignGoals,
        kpis: newKpis
      }
    });
  };
  
  // Handler for key press (Enter key)
  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLDivElement>,
    type: 'secondaryGoal' | 'kpi'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'secondaryGoal') {
        handleAddSecondaryGoal();
      } else {
        handleAddKpi();
      }
    }
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Campaign Goals
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          name="primary"
          label="Primary Goal"
          value={strategy.campaignGoals.primary}
          onChange={handleTextChange}
          placeholder="What is the main objective of this campaign?"
          variant="outlined"
          margin="normal"
          helperText="Be specific about what you want to achieve with this copy"
        />
        
        <TextField
          fullWidth
          name="conversionAction"
          label="Conversion Action"
          value={strategy.campaignGoals.conversionAction}
          onChange={handleTextChange}
          placeholder="What action do you want the audience to take?"
          variant="outlined"
          margin="normal"
          helperText="E.g., sign up, purchase, download, subscribe, etc."
        />
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Secondary Goals
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          value={newSecondaryGoal}
          onChange={(e) => setNewSecondaryGoal(e.target.value)}
          placeholder="Add a secondary campaign goal"
          onKeyPress={(e) => handleKeyPress(e, 'secondaryGoal')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleAddSecondaryGoal}
                  edge="end"
                  aria-label="add secondary goal"
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
          {strategy.campaignGoals.secondary.length > 0 ? (
            strategy.campaignGoals.secondary.map((goal, index) => (
              <Chip
                key={index}
                label={goal}
                onDelete={() => handleDeleteSecondaryGoal(index)}
                sx={{ m: 0.5 }}
              />
            ))
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ p: 1 }}
            >
              No secondary goals added yet. What additional objectives would you like to achieve?
            </Typography>
          )}
        </Paper>
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Key Performance Indicators (KPIs)
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          value={newKpi}
          onChange={(e) => setNewKpi(e.target.value)}
          placeholder="Add a KPI to measure success"
          onKeyPress={(e) => handleKeyPress(e, 'kpi')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleAddKpi}
                  edge="end"
                  aria-label="add KPI"
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
          {strategy.campaignGoals.kpis.length > 0 ? (
            strategy.campaignGoals.kpis.map((kpi, index) => (
              <Chip
                key={index}
                label={kpi}
                onDelete={() => handleDeleteKpi(index)}
                sx={{ m: 0.5 }}
              />
            ))
          ) : (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ p: 1 }}
            >
              No KPIs added yet. How will you measure the success of this campaign?
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default CampaignGoalsForm;
