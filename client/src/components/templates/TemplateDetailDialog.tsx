import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Share as ShareIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  FormatAlignLeft as FormatAlignLeftIcon
} from '@mui/icons-material';
import { Template } from '../../types/templates';

interface TemplateDetailDialogProps {
  open: boolean;
  onClose: () => void;
  template: Template;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TemplateDetailDialog: React.FC<TemplateDetailDialogProps> = ({
  open,
  onClose,
  template
}) => {
  const [isFavorite, setIsFavorite] = useState(template.isFavorite || false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
    // Here you would dispatch an action to update the favorite status
  };

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleUseTemplate = () => {
    // Navigate to campaign creation or execution page with this template
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
          boxShadow: 24,
        }
      }}
    >
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
          zIndex: 1
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="span">
            {template.name}
          </Typography>
          <IconButton
            aria-label="favorite"
            onClick={handleFavoriteToggle}
          >
            {isFavorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: 400,
              objectFit: 'contain',
              bgcolor: 'black',
            }}
            src={template.thumbnailUrl}
            alt={template.name}
          />

          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              display: 'flex',
              gap: 1,
            }}
          >
            <Chip
              label={template.format}
              size="small"
              color="primary"
            />
            {template.platforms.map((platform) => (
              <Chip
                key={platform}
                label={platform}
                size="small"
                variant="outlined"
                sx={{ bgcolor: 'rgba(255,255,255,0.8)' }}
              />
            ))}
          </Box>
          
          <IconButton
            aria-label="play"
            onClick={handlePlayToggle}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'rgba(0,0,0,0.5)',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.7)',
              },
              color: 'white',
              p: 2
            }}
          >
            {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
          </IconButton>
        </Box>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="template detail tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<InfoIcon />} label="Details" />
          <Tab icon={<SettingsIcon />} label="Parameters" />
          <Tab icon={<FormatAlignLeftIcon />} label="Requirements" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="subtitle1" gutterBottom>
            Description
          </Typography>
          <Typography variant="body1" paragraph>
            {template.description}
          </Typography>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Format
              </Typography>
              <Typography variant="body1" gutterBottom>
                {template.format}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Duration
              </Typography>
              <Typography variant="body1" gutterBottom>
                {template.duration || 'Variable'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Supported Platforms
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {template.platforms.map((platform) => (
                  <Chip
                    key={platform}
                    label={platform}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body1" gutterBottom>
                {new Date(template.createdAt).toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="subtitle1" gutterBottom>
            Customizable Parameters
          </Typography>
          
          <Grid container spacing={2}>
            {template.parameters?.map((param, index) => (
              <Grid item xs={12} key={index}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {param.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {param.description}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Type: {param.type} {param.required && '(Required)'}
                  </Typography>
                </Paper>
              </Grid>
            ))}
            
            {!template.parameters || template.parameters.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  No customizable parameters available for this template.
                </Typography>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="subtitle1" gutterBottom>
            Asset Requirements
          </Typography>
          
          <Grid container spacing={2}>
            {template.requirements?.map((req, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {req.type}
                  </Typography>
                  <Typography variant="body2">
                    {req.description}
                  </Typography>
                  {req.specs && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" display="block">
                        {req.specs}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
            
            {!template.requirements || template.requirements.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  No specific asset requirements for this template.
                </Typography>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button
          onClick={() => window.open(template.previewUrl, '_blank')}
          variant="outlined"
          startIcon={<PlayArrowIcon />}
        >
          View Preview
        </Button>
        <Button
          onClick={handleUseTemplate}
          variant="contained"
          color="primary"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
        >
          Use Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateDetailDialog;