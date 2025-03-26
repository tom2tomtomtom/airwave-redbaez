import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Alert, 
  AlertTitle, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  LinearProgress,
  Chip,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { MarketingStrategy, StrategyAnalysis } from '../../../services/copyGeneration/types';
import CopyGenerationMediator from '../../../services/copyGeneration/CopyGenerationMediator';

interface StrategyValidatorProps {
  strategy: MarketingStrategy;
  onAnalysisComplete: (analysis: StrategyAnalysis) => void;
}

/**
 * Strategy Validator Component
 * 
 * Analyzes marketing strategy input for completeness and quality,
 * providing feedback and improvement suggestions.
 */
const StrategyValidator: React.FC<StrategyValidatorProps> = ({
  strategy,
  onAnalysisComplete
}) => {
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Analyze strategy when it changes
  useEffect(() => {
    const validateStrategy = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const strategyAnalysis = await CopyGenerationMediator.analyzeStrategy(strategy);
        setAnalysis(strategyAnalysis);
        onAnalysisComplete(strategyAnalysis);
      } catch (err) {
        setError('Error analyzing strategy');
        console.error('Error analyzing strategy:', err);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce the validation to avoid excessive calls
    const timeoutId = setTimeout(() => {
      validateStrategy();
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [strategy, onAnalysisComplete]);
  
  // Get severity level for completeness
  const getCompletenessSeverity = (completeness: number): 'success' | 'warning' | 'error' => {
    if (completeness >= 0.8) return 'success';
    if (completeness >= 0.5) return 'warning';
    return 'error';
  };
  
  // Get severity level for quality
  const getQualitySeverity = (quality: number): 'success' | 'warning' | 'error' => {
    if (quality >= 0.8) return 'success';
    if (quality >= 0.5) return 'warning';
    return 'error';
  };
  
  // Get color for severity
  const getSeverityColor = (severity: 'success' | 'warning' | 'error'): string => {
    switch (severity) {
      case 'success':
        return 'success.main';
      case 'warning':
        return 'warning.main';
      case 'error':
        return 'error.main';
      default:
        return 'text.primary';
    }
  };
  
  // Get icon for severity
  const getSeverityIcon = (severity: 'success' | 'warning' | 'error') => {
    switch (severity) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };
  
  // Get importance chip style
  const getImportanceChip = (importance: 'high' | 'medium' | 'low') => {
    let color: 'error' | 'warning' | 'info' = 'info';
    
    switch (importance) {
      case 'high':
        color = 'error';
        break;
      case 'medium':
        color = 'warning';
        break;
      default:
        color = 'info';
    }
    
    return (
      <Chip 
        label={importance} 
        color={color} 
        size="small" 
        sx={{ ml: 1, textTransform: 'capitalize' }} 
      />
    );
  };
  
  if (loading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Analysing strategy...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }
  
  if (!analysis) {
    return null;
  }
  
  const completenessSeverity = getCompletenessSeverity(analysis.completeness);
  const qualitySeverity = getQualitySeverity(analysis.qualityScore);
  
  return (
    <Paper sx={{ p: 3, mt: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Strategy Analysis
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Completeness: {Math.round(analysis.completeness * 100)}%
        </Typography>
        
        <LinearProgress
          variant="determinate"
          value={analysis.completeness * 100}
          color={completenessSeverity}
          sx={{ height: 10, borderRadius: 5, mb: 2 }}
        />
        
        <Typography variant="subtitle1" gutterBottom>
          Quality Score: {Math.round(analysis.qualityScore * 100)}%
        </Typography>
        
        <LinearProgress
          variant="determinate"
          value={analysis.qualityScore * 100}
          color={qualitySeverity}
          sx={{ height: 10, borderRadius: 5 }}
        />
      </Box>
      
      {analysis.missingElements.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="warning">
            <AlertTitle>Missing Elements</AlertTitle>
            <Typography variant="body2" gutterBottom>
              Your strategy is missing these important elements:
            </Typography>
            <List dense disablePadding>
              {analysis.missingElements.map((element, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <ErrorIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={element} />
                </ListItem>
              ))}
            </List>
          </Alert>
        </Box>
      )}
      
      {analysis.improvementSuggestions.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Improvement Suggestions
          </Typography>
          <List>
            {analysis.improvementSuggestions.map((suggestion, index) => (
              <ListItem key={index} alignItems="flex-start">
                <ListItemIcon>
                  {getSeverityIcon(
                    suggestion.importance === 'high' 
                      ? 'error' 
                      : suggestion.importance === 'medium' 
                        ? 'warning' 
                        : 'success'
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                      {suggestion.element}
                      {getImportanceChip(suggestion.importance)}
                    </Box>
                  }
                  secondary={suggestion.suggestion}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      
      <Divider sx={{ my: 2 }} />
      
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Best Practices
        </Typography>
        
        {analysis.bestPractices.followed.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="success.main" gutterBottom>
              <CheckCircleIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Followed:
            </Typography>
            <List dense>
              {analysis.bestPractices.followed.map((practice, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={practice} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        
        {analysis.bestPractices.notFollowed.length > 0 && (
          <Box>
            <Typography variant="body2" color="error.main" gutterBottom>
              <ErrorIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Not Followed:
            </Typography>
            <List dense>
              {analysis.bestPractices.notFollowed.map((practice, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <ErrorIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={practice} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default StrategyValidator;
