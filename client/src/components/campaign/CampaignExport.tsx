import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SelectChangeEvent,
} from '@mui/material';
import {
  CloudUpload as ExportIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

interface Platform {
  id: string;
  name: string;
  requiresAuth: boolean;
  supportedFormats: string[];
  maxDuration: number;
  maxFileSize: number;
}

interface AdVariation {
  id: string;
  name: string;
  duration: number;
  fileSize: number;
  format: string;
}

interface ExportSettings {
  format: string;
  quality: 'high' | 'medium' | 'low';
  optimiseForPlatform: boolean;
  scheduleExport: boolean;
  scheduledTime?: string;
}

interface CampaignExportProps {
  variations: AdVariation[];
  platforms: Platform[];
  onExport: (params: {
    variationIds: string[];
    platformId: string;
    settings: ExportSettings;
  }) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const defaultExportSettings: ExportSettings = {
  format: 'mp4',
  quality: 'high',
  optimiseForPlatform: true,
  scheduleExport: false,
};

const CampaignExport: React.FC<CampaignExportProps> = ({
  variations,
  platforms,
  onExport,
  isLoading = false,
  error,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [settings, setSettings] = useState<ExportSettings>(defaultExportSettings);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const handlePlatformChange = (event: SelectChangeEvent<string>) => {
    setSelectedPlatform(event.target.value);
    // Reset settings to default when platform changes
    setSettings(defaultExportSettings);
  };

  const handleVariationToggle = (variationId: string) => {
    setSelectedVariations((prev) =>
      prev.includes(variationId)
        ? prev.filter((id) => id !== variationId)
        : [...prev, variationId]
    );
  };

  const handleSelectAll = () => {
    setSelectedVariations(
      selectedVariations.length === variations.length
        ? []
        : variations.map((v) => v.id)
    );
  };

  const handleSettingsChange = (
    field: keyof ExportSettings,
    value: string | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExport = async () => {
    if (!selectedPlatform || selectedVariations.length === 0) return;

    try {
      await onExport({
        variationIds: selectedVariations,
        platformId: selectedPlatform,
        settings,
      });
    } catch (err) {
      // Error handling is managed by the parent component
    }
  };

  const getCurrentPlatform = () => {
    return platforms.find((p) => p.id === selectedPlatform);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Export Campaign
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
              <FormControl fullWidth>
                <InputLabel>Target Platform</InputLabel>
                <Select
                  value={selectedPlatform}
                  label="Target Platform"
                  onChange={handlePlatformChange}
                >
                  {platforms.map((platform) => (
                    <MenuItem key={platform.id} value={platform.id}>
                      {platform.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Select Variations to Export
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedVariations.length === variations.length}
                      indeterminate={
                        selectedVariations.length > 0 &&
                        selectedVariations.length < variations.length
                      }
                      onChange={handleSelectAll}
                    />
                  }
                  label="Select All"
                />
              </Box>
              <Grid container spacing={2}>
                {variations.map((variation) => (
                  <Grid item xs={12} sm={6} md={4} key={variation.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedVariations.includes(variation.id)}
                          onChange={() => handleVariationToggle(variation.id)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">{variation.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {variation.duration}s • {(variation.fileSize / 1024 / 1024).toFixed(1)}MB
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => setSettingsDialogOpen(true)}
                >
                  Export Settings
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isLoading ? <CircularProgress size={20} /> : <ExportIcon />}
                  disabled={
                    isLoading ||
                    !selectedPlatform ||
                    selectedVariations.length === 0
                  }
                  onClick={handleExport}
                >
                  {isLoading ? 'Exporting...' : 'Export Selected'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>

      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Export Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={settings.format}
                  label="Export Format"
                  onChange={(e) =>
                    handleSettingsChange('format', e.target.value as string)
                  }
                >
                  {getCurrentPlatform()?.supportedFormats.map((format) => (
                    <MenuItem key={format} value={format}>
                      {format.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Quality</InputLabel>
                <Select
                  value={settings.quality}
                  label="Quality"
                  onChange={(e) =>
                    handleSettingsChange('quality', e.target.value as string)
                  }
                >
                  <MenuItem value="high">High Quality</MenuItem>
                  <MenuItem value="medium">Medium Quality</MenuItem>
                  <MenuItem value="low">Low Quality</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.optimiseForPlatform}
                    onChange={(e) =>
                      handleSettingsChange('optimiseForPlatform', e.target.checked)
                    }
                  />
                }
                label="Optimise for platform requirements"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.scheduleExport}
                    onChange={(e) =>
                      handleSettingsChange('scheduleExport', e.target.checked)
                    }
                  />
                }
                label="Schedule export"
              />
              {settings.scheduleExport && (
                <TextField
                  fullWidth
                  type="datetime-local"
                  value={settings.scheduledTime}
                  onChange={(e) =>
                    handleSettingsChange('scheduledTime', e.target.value)
                  }
                  sx={{ mt: 2 }}
                />
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => setSettingsDialogOpen(false)}
            variant="contained"
            color="primary"
          >
            Apply Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CampaignExport;
