import React from 'react';
import { Grid, Box, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import MotivationCard from './MotivationCard';

export interface Motivation {
  id: string;
  title: string;
  description: string;
  reasoning: string;
}

interface MotivationGridProps {
  motivations: Motivation[];
  selectedMotivations: string[];
  onSelectMotivation: (id: string) => void;
  onRegenerateMotivations: () => void;
  isLoading?: boolean;
  error?: string;
}

const MotivationGrid: React.FC<MotivationGridProps> = ({
  motivations,
  selectedMotivations,
  onSelectMotivation,
  onRegenerateMotivations,
  isLoading = false,
  error,
}) => {
  const minRequired = 6;
  const maxAllowed = 8;
  const currentSelected = selectedMotivations.length;

  const getSelectionStatus = () => {
    if (currentSelected < minRequired) {
      return {
        message: `Please select at least ${minRequired} motivations (${currentSelected}/${minRequired} selected)`,
        severity: 'info' as const,
      };
    } else if (currentSelected > maxAllowed) {
      return {
        message: `You've selected too many motivations (${currentSelected}/${maxAllowed} maximum)`,
        severity: 'warning' as const,
      };
    }
    return {
      message: `Great! You've selected ${currentSelected} motivations`,
      severity: 'success' as const,
    };
  };

  const status = getSelectionStatus();

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" component="h2">
          Strategic Motivations
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={onRegenerateMotivations}
          disabled={isLoading}
        >
          Regenerate
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Alert severity={status.severity} sx={{ mb: 3 }}>
        {status.message}
      </Alert>

      <Grid container spacing={3}>
        {motivations.map((motivation) => (
          <Grid item xs={12} sm={6} md={4} key={motivation.id}>
            <MotivationCard
              title={motivation.title}
              description={motivation.description}
              reasoning={motivation.reasoning}
              selected={selectedMotivations.includes(motivation.id)}
              onSelect={() => onSelectMotivation(motivation.id)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MotivationGrid;
