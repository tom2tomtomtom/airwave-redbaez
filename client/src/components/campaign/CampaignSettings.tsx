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
  FormControlLabel,
  Switch,
  Grid,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';

export interface CampaignSettings {
  name: string;
  objective: string;
  targetAudience: string;
  platforms: string[];
  dimensions: {
    width: number;
    height: number;
  };
  duration: number;
  optimiseForMobile: boolean;
  brandSafetyChecks: boolean;
  autoGenerateSubtitles: boolean;
}

interface CampaignSettingsProps {
  settings: CampaignSettings;
  onSettingsChange: (settings: CampaignSettings) => void;
  onSave: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const platformOptions = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'meta', label: 'Meta (Facebook & Instagram)' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
];

const CampaignSettings: React.FC<CampaignSettingsProps> = ({
  settings,
  onSettingsChange,
  onSave,
  isLoading = false,
  error,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState('');

  const handleChange = (
    field: keyof CampaignSettings,
    value: string | number | boolean | string[] | { width: number; height: number }
  ) => {
    onSettingsChange({
      ...settings,
      [field]: value,
    });
  };

  const handlePlatformAdd = () => {
    if (selectedPlatform && !settings.platforms.includes(selectedPlatform)) {
      handleChange('platforms', [...settings.platforms, selectedPlatform]);
      setSelectedPlatform('');
    }
  };

  const handlePlatformRemove = (platform: string) => {
    handleChange(
      'platforms',
      settings.platforms.filter((p) => p !== platform)
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Campaign Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <StyledCard>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Campaign Name"
                value={settings.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Campaign Objective"
                value={settings.objective}
                onChange={(e) => handleChange('objective', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Target Audience"
                value={settings.targetAudience}
                onChange={(e) => handleChange('targetAudience', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Target Platforms
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {settings.platforms.map((platform) => (
                    <Chip
                      key={platform}
                      label={platformOptions.find((p) => p.value === platform)?.label}
                      onDelete={() => handlePlatformRemove(platform)}
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Add Platform</InputLabel>
                    <Select
                      value={selectedPlatform}
                      label="Add Platform"
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                    >
                      {platformOptions.map((platform) => (
                        <MenuItem
                          key={platform.value}
                          value={platform.value}
                          disabled={settings.platforms.includes(platform.value)}
                        >
                          {platform.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={handlePlatformAdd}
                    disabled={!selectedPlatform}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Width (px)"
                value={settings.dimensions.width}
                onChange={(e) =>
                  handleChange('dimensions', {
                    ...settings.dimensions,
                    width: Number(e.target.value),
                  })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Height (px)"
                value={settings.dimensions.height}
                onChange={(e) =>
                  handleChange('dimensions', {
                    ...settings.dimensions,
                    height: Number(e.target.value),
                  })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Duration (seconds)"
                value={settings.duration}
                onChange={(e) => handleChange('duration', Number(e.target.value))}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.optimiseForMobile}
                    onChange={(e) =>
                      handleChange('optimiseForMobile', e.target.checked)
                    }
                  />
                }
                label="Optimise for Mobile"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.brandSafetyChecks}
                    onChange={(e) =>
                      handleChange('brandSafetyChecks', e.target.checked)
                    }
                  />
                }
                label="Enable Brand Safety Checks"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoGenerateSubtitles}
                    onChange={(e) =>
                      handleChange('autoGenerateSubtitles', e.target.checked)
                    }
                  />
                }
                label="Auto-generate Subtitles"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={onSave}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Settings'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>
    </Box>
  );
};

export default CampaignSettings;
