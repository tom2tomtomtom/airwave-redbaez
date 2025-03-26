import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

export interface CopyVariation {
  id: string;
  content: string[];
  tone: string;
  style: string;
  motivation: string;
}

interface CopyVariationListProps {
  variations: CopyVariation[];
  selectedVariations: string[];
  onSelectVariation: (id: string) => void;
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const FrameText = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const CopyVariationList: React.FC<CopyVariationListProps> = ({
  variations,
  selectedVariations,
  onSelectVariation,
}) => {
  const handleCopyToClipboard = (content: string[]) => {
    navigator.clipboard.writeText(content.join('\n'));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Generated Copy Variations
      </Typography>

      <List>
        {variations.map((variation, index) => (
          <React.Fragment key={variation.id}>
            <StyledCard>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Checkbox
                    checked={selectedVariations.includes(variation.id)}
                    onChange={() => onSelectVariation(variation.id)}
                  />
                  <Typography variant="subtitle1">
                    Variation {index + 1}
                  </Typography>
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <Chip 
                      label={variation.tone}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={variation.style}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <Box sx={{ ml: 4 }}>
                  {variation.content.map((frame, frameIndex) => (
                    <FrameText key={frameIndex} variant="body1">
                      Frame {frameIndex + 1}: {frame}
                    </FrameText>
                  ))}
                </Box>

                <Box sx={{ mt: 2, ml: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Based on motivation: {variation.motivation}
                  </Typography>
                </Box>

                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    onClick={() => handleCopyToClipboard(variation.content)}
                    title="Copy to clipboard"
                  >
                    <CopyIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </CardContent>
            </StyledCard>
            {index < variations.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default CopyVariationList;
