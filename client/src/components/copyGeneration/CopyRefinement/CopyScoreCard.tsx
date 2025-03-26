import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Rating, 
  Grid, 
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
  Chip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

import { CopyScore, CopyQualityCheck } from '../../../services/copyGeneration/types';

interface CopyScoreCardProps {
  score: CopyScore;
  onScoreChange?: (category: keyof CopyScore, value: number) => void;
  qualityChecks?: CopyQualityCheck[];
  readOnly?: boolean;
}

/**
 * Copy Score Card Component
 * 
 * Displays and allows rating of copy against various criteria,
 * showing overall score and individual category scores.
 */
const CopyScoreCard: React.FC<CopyScoreCardProps> = ({
  score,
  onScoreChange,
  qualityChecks = [],
  readOnly = false
}) => {
  // Calculate overall score (weighted average)
  const calculateOverallScore = (): number => {
    const weights = {
      clarity: 0.25,
      persuasiveness: 0.2,
      engagement: 0.2,
      brandAlignment: 0.15,
      actionability: 0.2
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([category, weight]) => {
      const categoryScore = score[category as keyof CopyScore];
      if (categoryScore > 0) {
        weightedSum += categoryScore * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };
  
  const overallScore = calculateOverallScore();
  
  // Handler for rating change
  const handleRatingChange = (category: keyof CopyScore, value: number | null) => {
    if (onScoreChange && value !== null) {
      onScoreChange(category, value);
    }
  };
  
  // Get color based on score
  const getScoreColor = (value: number) => {
    if (value >= 4) return 'success.main';
    if (value >= 3) return 'warning.main';
    return 'error.main';
  };
  
  // Get related quality checks for a category
  const getRelatedChecks = (category: keyof CopyScore) => {
    const categoryMapping: Record<keyof CopyScore, string[]> = {
      clarity: ['clarity', 'readability', 'grammar'],
      persuasiveness: ['persuasiveness', 'messaging', 'emotional appeal'],
      engagement: ['engagement', 'audience relevance', 'interest'],
      brandAlignment: ['brand alignment', 'voice', 'tone'],
      actionability: ['actionability', 'call to action', 'conversion']
    };
    
    return qualityChecks.filter(check => 
      categoryMapping[category].some(term => 
        check.category.toLowerCase().includes(term)
      )
    );
  };
  
  // Score categories with descriptions
  const scoreCategories = [
    { 
      key: 'clarity' as keyof CopyScore, 
      label: 'Clarity & Readability',
      description: 'How easy is the copy to understand? Is it free of jargon and ambiguity?'
    },
    { 
      key: 'persuasiveness' as keyof CopyScore, 
      label: 'Persuasiveness',
      description: 'How convincing is the copy? Does it present compelling reasons to act?'
    },
    { 
      key: 'engagement' as keyof CopyScore, 
      label: 'Engagement',
      description: 'How well does the copy capture and maintain interest?'
    },
    { 
      key: 'brandAlignment' as keyof CopyScore, 
      label: 'Brand Alignment',
      description: 'How well does the copy reflect the brand voice and values?'
    },
    { 
      key: 'actionability' as keyof CopyScore, 
      label: 'Actionability',
      description: 'How clear and compelling is the call to action?'
    }
  ];
  
  return (
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Copy Score
            </Typography>
            
            {readOnly && (
              <Chip 
                icon={<CheckCircleIcon />} 
                label="Approved" 
                color="success" 
                variant="outlined" 
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h4" sx={{ mr: 2 }}>
              {overallScore.toFixed(1)}
            </Typography>
            <Rating 
              value={overallScore} 
              precision={0.5} 
              readOnly 
              size="large" 
            />
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={(overallScore / 5) * 100}
            sx={{ 
              height: 8, 
              borderRadius: 5,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: getScoreColor(overallScore)
              }
            }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
        </Grid>
        
        {scoreCategories.map((category) => {
          const categoryScore = score[category.key];
          const relatedChecks = getRelatedChecks(category.key);
          
          return (
            <Grid item xs={12} sm={6} key={category.key}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ mr: 1 }}>
                    {category.label}
                  </Typography>
                  
                  <Tooltip title={category.description}>
                    <IconButton size="small">
                      <InfoIcon fontSize="small" color="action" />
                    </IconButton>
                  </Tooltip>
                  
                  {relatedChecks.length > 0 && (
                    <Tooltip title={`${relatedChecks.length} quality check${relatedChecks.length > 1 ? 's' : ''} related to this category`}>
                      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                        {relatedChecks.some(check => check.severity === 'error') ? (
                          <ErrorIcon fontSize="small" color="error" />
                        ) : relatedChecks.some(check => check.severity === 'warning') ? (
                          <WarningIcon fontSize="small" color="warning" />
                        ) : (
                          <CheckCircleIcon fontSize="small" color="success" />
                        )}
                      </Box>
                    </Tooltip>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Rating 
                    name={`rating-${category.key}`}
                    value={categoryScore}
                    onChange={(_, newValue) => handleRatingChange(category.key, newValue)}
                    precision={0.5}
                    readOnly={readOnly}
                  />
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ ml: 1 }}
                  >
                    {categoryScore ? categoryScore.toFixed(1) : '-'}
                  </Typography>
                </Box>
                
                {relatedChecks.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {relatedChecks.map((check, index) => (
                      <Chip
                        key={index}
                        size="small"
                        label={check.category}
                        icon={
                          check.severity === 'error' ? <ErrorIcon fontSize="small" /> :
                          check.severity === 'warning' ? <WarningIcon fontSize="small" /> :
                          <CheckCircleIcon fontSize="small" />
                        }
                        color={
                          check.severity === 'error' ? 'error' :
                          check.severity === 'warning' ? 'warning' :
                          'success'
                        }
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

export default CopyScoreCard;
