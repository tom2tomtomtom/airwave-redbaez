import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface CopyGeneratorProps {
  selectedMotivations: string[];
  onGenerateCopy: (params: CopyGenerationParams) => Promise<void>;
  isLoading?: boolean;
}

export interface CopyGenerationParams {
  tone: string;
  style: string;
  frameCount: number;
  includeCta: boolean;
  ctaText?: string;
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const CopyGenerator: React.FC<CopyGeneratorProps> = ({
  selectedMotivations,
  onGenerateCopy,
  isLoading = false,
}) => {
  const [params, setParams] = useState<CopyGenerationParams>({
    tone: 'professional',
    style: 'direct',
    frameCount: 3,
    includeCta: true,
    ctaText: 'Learn More',
  });

  const toneOptions = [
    'professional',
    'casual',
    'friendly',
    'authoritative',
    'playful',
    'inspirational',
  ];

  const styleOptions = [
    'direct',
    'storytelling',
    'question-based',
    'problem-solution',
    'testimonial',
    'statistical',
  ];

  const handleChange = (
    event: SelectChangeEvent | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof CopyGenerationParams
  ) => {
    const value = event.target.value;
    setParams((prev) => ({
      ...prev,
      [field]: field === 'frameCount' ? Number(value) : value,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onGenerateCopy(params);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <StyledCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Copy Generation Settings
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tone</InputLabel>
                <Select
                  value={params.tone}
                  label="Tone"
                  onChange={(e) => handleChange(e, 'tone')}
                >
                  {toneOptions.map((tone) => (
                    <MenuItem key={tone} value={tone}>
                      {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Style</InputLabel>
                <Select
                  value={params.style}
                  label="Style"
                  onChange={(e) => handleChange(e, 'style')}
                >
                  {styleOptions.map((style) => (
                    <MenuItem key={style} value={style}>
                      {style.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Frame Count"
                value={params.frameCount}
                onChange={(e) => handleChange(e, 'frameCount')}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Call to Action Text"
                value={params.ctaText}
                onChange={(e) => handleChange(e, 'ctaText')}
                disabled={!params.includeCta}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Motivations:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedMotivations.map((motivation) => (
                  <Chip key={motivation} label={motivation} />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={isLoading || selectedMotivations.length < 6}
              >
                {isLoading ? 'Generating...' : 'Generate Copy Variations'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>
    </Box>
  );
};

export default CopyGenerator;
