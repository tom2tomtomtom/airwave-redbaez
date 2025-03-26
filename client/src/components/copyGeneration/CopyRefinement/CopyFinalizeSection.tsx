import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Stepper, 
  Step, 
  StepLabel,
  StepContent,
  TextField,
  Stack,
  Divider,
  Alert,
  Grid,
  Chip
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import SaveIcon from '@mui/icons-material/Save';

import CopyScoreCard from './CopyScoreCard';
import { CopyVariation, CopyScore } from '../../../services/copyGeneration/types';
import CopyGenerationMediator from '../../../services/copyGeneration/CopyGenerationMediator';

interface CopyFinalizeSectionProps {
  variation: CopyVariation;
  onApprove: (variation: CopyVariation, comment: string) => void;
  onReject: (variation: CopyVariation, reason: string) => void;
  onEdit: (variation: CopyVariation) => void;
}

/**
 * Copy Finalize Section Component
 * 
 * Handles the final review and approval process for selected copy,
 * including scoring, commenting, and approving or rejecting variations.
 */
const CopyFinalizeSection: React.FC<CopyFinalizeSectionProps> = ({
  variation,
  onApprove,
  onReject,
  onEdit
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [score, setScore] = useState<CopyScore>(
    variation.score || {
      clarity: 0,
      persuasiveness: 0,
      engagement: 0,
      brandAlignment: 0,
      actionability: 0
    }
  );
  const [comment, setComment] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  }>({
    strengths: [],
    weaknesses: [],
    suggestions: []
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Calculate overall score
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
  
  // Handler for score changes
  const handleScoreChange = (category: keyof CopyScore, value: number) => {
    setScore(prevScore => ({
      ...prevScore,
      [category]: value
    }));
  };
  
  // Handler for comment changes
  const handleCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setComment(event.target.value);
  };
  
  // Handler for analysing feedback
  const analyseFeedback = async () => {
    setIsLoading(true);
    
    try {
      const text = variation.frames ? variation.frames.join('\n\n') : variation.text;
      const feedbackAnalysis = await CopyGenerationMediator.analyseScoreFeedback(text, score);
      setFeedback(feedbackAnalysis);
    } catch (error) {
      console.error('Error analysing feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handler for next step
  const handleNext = () => {
    if (activeStep === 0) {
      analyseFeedback();
    }
    setActiveStep(prevStep => prevStep + 1);
  };
  
  // Handler for back step
  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };
  
  // Handler for approve
  const handleApprove = () => {
    const updatedVariation: CopyVariation = {
      ...variation,
      status: 'approved',
      score,
      qualityScore: calculateOverallScore() / 5,
      modifiedAt: new Date()
    };
    
    onApprove(updatedVariation, comment);
  };
  
  // Handler for reject
  const handleReject = () => {
    const updatedVariation: CopyVariation = {
      ...variation,
      status: 'rejected',
      score,
      qualityScore: calculateOverallScore() / 5,
      modifiedAt: new Date()
    };
    
    onReject(updatedVariation, comment);
  };
  
  // Check if all scores are completed
  const isScoreComplete = (): boolean => {
    return Object.values(score).every(value => value > 0);
  };
  
  // Steps for the stepper
  const steps = [
    {
      label: 'Score Copy',
      description: 'Rate the copy against key criteria',
      content: (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ position: 'relative', mb: 3 }}>
              <FormatQuoteIcon 
                sx={{ position: 'absolute', top: -10, left: -8, opacity: 0.2, transform: 'scaleX(-1)' }} 
              />
              
              <Typography variant="body1" sx={{ pl: 4, pr: 4 }}>
                {variation.frames 
                  ? variation.frames.map((frame, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Frame {index + 1}
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {frame}
                        </Typography>
                      </Box>
                    ))
                  : variation.text}
              </Typography>
              
              <FormatQuoteIcon 
                sx={{ position: 'absolute', bottom: -10, right: -8, opacity: 0.2 }} 
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => onEdit(variation)}
            >
              Edit Copy
            </Button>
          </Paper>
          
          <CopyScoreCard 
            score={score} 
            onScoreChange={handleScoreChange}
            qualityChecks={variation.qualityChecks}
          />
          
          {!isScoreComplete() && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Please rate the copy in all categories before proceeding.
            </Alert>
          )}
        </Box>
      )
    },
    {
      label: 'Review Feedback',
      description: 'Review AI-generated feedback based on your scoring',
      content: (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Copy Analysis
            </Typography>
            
            <Typography variant="body2" paragraph>
              Based on your scoring, here's an analysis of the copy:
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  Strengths
                </Typography>
                
                {feedback.strengths.length > 0 ? (
                  <Stack spacing={1}>
                    {feedback.strengths.map((strength, index) => (
                      <Alert key={index} icon={<CheckCircleIcon fontSize="inherit" />} severity="success">
                        {strength}
                      </Alert>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No strengths identified
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  Areas for Improvement
                </Typography>
                
                {feedback.weaknesses.length > 0 ? (
                  <Stack spacing={1}>
                    {feedback.weaknesses.map((weakness, index) => (
                      <Alert key={index} severity="warning">
                        {weakness}
                      </Alert>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No weaknesses identified
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  Suggestions
                </Typography>
                
                {feedback.suggestions.length > 0 ? (
                  <Stack spacing={1}>
                    {feedback.suggestions.map((suggestion, index) => (
                      <Alert key={index} severity="info">
                        {suggestion}
                      </Alert>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No suggestions available
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Paper>
          
          <Alert 
            severity={calculateOverallScore() >= 4 ? "success" : "warning"}
            sx={{ mb: 3 }}
          >
            <Typography variant="subtitle1">
              Overall Score: {calculateOverallScore().toFixed(1)}/5
            </Typography>
            
            <Typography variant="body2">
              {calculateOverallScore() >= 4
                ? "This copy meets or exceeds quality standards and is ready for approval."
                : "This copy may need some improvement before approval."}
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Add Comment',
      description: 'Add any final comments before approving or rejecting',
      content: (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Final Decision
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Comments (optional)"
              value={comment}
              onChange={handleCommentChange}
              placeholder="Add any comments or notes about this copy..."
              margin="normal"
            />
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Chip 
                icon={<ThumbUpIcon />} 
                label={`Approve (${calculateOverallScore().toFixed(1)}/5)`} 
                color="success" 
                variant="outlined" 
                onClick={handleApprove}
              />
              
              <Chip 
                icon={<ThumbDownIcon />} 
                label="Reject" 
                color="error" 
                variant="outlined" 
                onClick={handleReject}
              />
            </Box>
          </Paper>
        </Box>
      )
    }
  ];
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Finalize Copy
      </Typography>
      
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={index}>
            <StepLabel>
              <Typography variant="subtitle1">{step.label}</Typography>
            </StepLabel>
            
            <StepContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                {step.description}
              </Typography>
              
              {step.content}
              
              <Box sx={{ mt: 3, mb: 2 }}>
                <Stack direction="row" spacing={2}>
                  {index > 0 && (
                    <Button onClick={handleBack}>
                      Back
                    </Button>
                  )}
                  
                  {index < steps.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={index === 0 && !isScoreComplete()}
                    >
                      Continue
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ThumbUpIcon />}
                        onClick={handleApprove}
                      >
                        Approve
                      </Button>
                      
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<ThumbDownIcon />}
                        onClick={handleReject}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </Stack>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default CopyFinalizeSection;
