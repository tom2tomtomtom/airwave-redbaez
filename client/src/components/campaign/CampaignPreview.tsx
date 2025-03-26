import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as MuteIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';

interface PreviewAsset {
  id: string;
  type: 'video' | 'image';
  url: string;
  name: string;
  duration?: number;
}

interface CopyAsset {
  id: string;
  content: string[];
}

interface PreviewVariation {
  id: string;
  name: string;
  mainAsset: PreviewAsset;
  overlayAssets?: PreviewAsset[];
  copy: CopyAsset;
  audio?: PreviewAsset;
}

interface Platform {
  id: string;
  name: string;
  dimensions: {
    width: number;
    height: number;
  };
  previewBackground?: string;
}

interface CampaignPreviewProps {
  variations: PreviewVariation[];
  platforms: Platform[];
  isLoading?: boolean;
  error?: string;
  onPlay?: (variationId: string) => void;
  onPause?: (variationId: string) => void;
}

const PreviewContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.palette.grey[900],
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const PreviewFrame = styled(Box)<{ platform: Platform }>(({ theme, platform }) => ({
  width: platform.dimensions.width,
  height: platform.dimensions.height,
  position: 'relative',
  margin: '0 auto',
  backgroundColor: platform.previewBackground || theme.palette.background.paper,
  boxShadow: theme.shadows[8],
}));

const PreviewControls = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(1),
  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const CampaignPreview: React.FC<CampaignPreviewProps> = ({
  variations,
  platforms,
  isLoading = false,
  error,
  onPlay,
  onPause,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0]?.id);
  const [selectedVariation, setSelectedVariation] = useState(variations[0]?.id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  const handlePlatformChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedPlatform(newValue);
  };

  const handleVariationChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedVariation(newValue);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handlePlayPause = () => {
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    if (newIsPlaying) {
      onPlay?.(selectedVariation);
    } else {
      onPause?.(selectedVariation);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const getCurrentVariation = () => {
    return variations.find((v) => v.id === selectedVariation);
  };

  const getCurrentPlatform = () => {
    return platforms.find((p) => p.id === selectedPlatform);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  const currentVariation = getCurrentVariation();
  const currentPlatform = getCurrentPlatform();

  if (!currentVariation || !currentPlatform) {
    return (
      <Alert severity="warning">
        No preview available. Please select a variation and platform.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Campaign Preview
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedPlatform}
          onChange={handlePlatformChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {platforms.map((platform) => (
            <Tab
              key={platform.id}
              value={platform.id}
              label={platform.name}
            />
          ))}
        </Tabs>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedVariation}
          onChange={handleVariationChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {variations.map((variation) => (
            <Tab
              key={variation.id}
              value={variation.id}
              label={variation.name}
            />
          ))}
        </Tabs>
      </Paper>

      <PreviewContainer>
        <PreviewFrame platform={currentPlatform}>
          {currentVariation.mainAsset.type === 'video' ? (
            <video
              src={currentVariation.mainAsset.url}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted={isMuted}
              autoPlay={isPlaying}
              loop
            />
          ) : (
            <img
              src={currentVariation.mainAsset.url}
              alt={currentVariation.mainAsset.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {/* Overlay assets */}
          {currentVariation.overlayAssets?.map((overlay) => (
            <Box
              key={overlay.id}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
              }}
            >
              {overlay.type === 'video' ? (
                <video
                  src={overlay.url}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  muted
                  autoPlay={isPlaying}
                  loop
                />
              ) : (
                <img
                  src={overlay.url}
                  alt={overlay.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
            </Box>
          ))}

          <PreviewControls>
            <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
              <IconButton size="small" onClick={handlePlayPause} sx={{ color: 'white' }}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
              <IconButton size="small" onClick={handleMuteToggle} sx={{ color: 'white' }}>
                {isMuted ? <MuteIcon /> : <VolumeIcon />}
              </IconButton>
            </Tooltip>

            <Box sx={{ flex: 1 }} />

            <Tooltip title="Fullscreen">
              <IconButton size="small" sx={{ color: 'white' }}>
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
          </PreviewControls>
        </PreviewFrame>
      </PreviewContainer>

      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>
            Copy
          </Typography>
          {currentVariation.copy.content.map((line, index) => (
            <Typography key={index} variant="body2" paragraph>
              Frame {index + 1}: {line}
            </Typography>
          ))}
        </Grid>
      </Grid>
    </Box>
  );
};

export default CampaignPreview;
