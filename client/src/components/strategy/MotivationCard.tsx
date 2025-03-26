import React from 'react';
import { Card, CardContent, CardActions, Typography, Button, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

interface MotivationCardProps {
  title: string;
  description: string;
  reasoning: string;
  selected: boolean;
  onSelect: () => void;
}

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.2s ease-in-out',
  border: '1px solid',
  borderColor: theme.palette.divider,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const MotivationCard: React.FC<MotivationCardProps> = ({
  title,
  description,
  reasoning,
  selected,
  onSelect,
}) => {
  return (
    <StyledCard 
      sx={{ 
        bgcolor: selected ? 'primary.light' : 'background.paper',
        borderColor: selected ? 'primary.main' : 'divider',
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {description}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Why it works:
        </Typography>
        <Typography variant="body2" paragraph>
          {reasoning}
        </Typography>
      </CardContent>
      <CardActions>
        <Button 
          size="small" 
          color={selected ? "primary" : "inherit"}
          onClick={onSelect}
          sx={{ ml: 'auto' }}
        >
          {selected ? 'Selected' : 'Select'}
        </Button>
      </CardActions>
    </StyledCard>
  );
};

export default MotivationCard;
