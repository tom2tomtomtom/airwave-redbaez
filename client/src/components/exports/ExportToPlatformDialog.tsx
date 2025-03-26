import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Chip,
  FormHelperText,
  CircularProgress,
  Autocomplete,
  IconButton,
  Alert
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TagIcon from '@mui/icons-material/Tag';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import axios from 'axios';
import { supabase } from '../../lib/supabase';

interface Platform {
  id: string;
  name: string;
  icon?: string;
  formats: string[];
  accountOptions?: { id: string; name: string }[];
}

interface ExportToPlatformProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  exportItems: any[];
}

const platformsList: Platform[] = [
  { 
    id: 'facebook', 
    name: 'Facebook',
    formats: ['16:9', '1:1', '4:5'],
    accountOptions: [
      { id: 'page1', name: 'Company Page' },
      { id: 'page2', name: 'Product Page' }
    ]
  },
  { 
    id: 'instagram', 
    name: 'Instagram',
    formats: ['1:1', '4:5', '9:16'],
    accountOptions: [
      { id: 'account1', name: 'Main Account' },
      { id: 'account2', name: 'Secondary Account' }
    ]
  },
  { 
    id: 'youtube', 
    name: 'YouTube',
    formats: ['16:9'],
    accountOptions: [
      { id: 'channel1', name: 'Company Channel' },
      { id: 'channel2', name: 'Product Demos' }
    ]
  },
  { 
    id: 'tiktok', 
    name: 'TikTok',
    formats: ['9:16'],
    accountOptions: [
      { id: 'account1', name: 'Brand Account' }
    ]
  }
];

const ExportToPlatformDialog: React.FC<ExportToPlatformProps> = ({
  open,
  onClose,
  campaignId,
  exportItems
}) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<Date | null>(new Date(Date.now() + 3600000)); // Default to 1 hour from now
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  // Get available formats for the selected platform
  const availableFormats = platformsList.find(p => p.id === selectedPlatform)?.formats || [];
  
  // Get available accounts for the selected platform
  const availableAccounts = platformsList.find(p => p.id === selectedPlatform)?.accountOptions || [];
  
  // Reset format when platform changes
  useEffect(() => {
    setSelectedFormat('');
    setSelectedAccount('');
  }, [selectedPlatform]);
  
  const handleSubmit = async () => {
    // Validate required fields
    if (!selectedPlatform || !selectedFormat || !selectedAccount || !scheduledTime) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the export item that matches the selected format
      const exportItem = exportItems.find(item => 
        item.platform === selectedPlatform && item.format === selectedFormat
      );
      
      if (!exportItem) {
        throw new Error(`No export found for ${selectedPlatform} in ${selectedFormat} format`);
      }
      
      // Get the current Supabase token
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || localStorage.getItem('airwave_auth_token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Make API call to schedule the export
      const response = await axios.post(`/api/exports/campaign/${campaignId}/schedule`, {
        platform: selectedPlatform,
        scheduledTime: scheduledTime.toISOString(),
        channelId: selectedPlatform === 'youtube' ? selectedAccount : undefined,
        pageId: selectedPlatform === 'facebook' ? selectedAccount : undefined,
        accountId: ['instagram', 'tiktok'].includes(selectedPlatform) ? selectedAccount : undefined,
        caption,
        hashtags,
        exportId: exportItem.id
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setSuccess(true);
        // Reset form after successful submission
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setSelectedPlatform('');
          setSelectedFormat('');
          setSelectedAccount('');
          setCaption('');
          setHashtags([]);
          setScheduledTime(new Date(Date.now() + 3600000));
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Failed to schedule export');
      }
    } catch (err: any) {
      console.error('Schedule export error:', err);
      setError(err.message || 'An error occurred while scheduling the export');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddHashtag = () => {
    if (hashtagInput && !hashtags.includes(hashtagInput)) {
      setHashtags([...hashtags, hashtagInput]);
      setHashtagInput('');
    }
  };
  
  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        aria-labelledby="export-to-platform-dialog-title"
      >
        <DialogTitle id="export-to-platform-dialog-title">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Schedule Post to Platform</Typography>
            <IconButton aria-label="close" onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Your post has been scheduled successfully!
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {error && (
                <Grid item xs={12}>
                  <Alert severity="error">{error}</Alert>
                </Grid>
              )}
              
              {/* Platform Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!selectedPlatform}>
                  <InputLabel id="platform-select-label">Platform *</InputLabel>
                  <Select
                    labelId="platform-select-label"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    label="Platform *"
                  >
                    {platformsList.map(platform => (
                      <MenuItem key={platform.id} value={platform.id}>
                        {platform.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {!selectedPlatform && <FormHelperText>Platform is required</FormHelperText>}
                </FormControl>
              </Grid>
              
              {/* Format Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!selectedPlatform} error={!selectedFormat}>
                  <InputLabel id="format-select-label">Format *</InputLabel>
                  <Select
                    labelId="format-select-label"
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    label="Format *"
                  >
                    {availableFormats.map(format => (
                      <MenuItem key={format} value={format}>
                        {format} Format
                      </MenuItem>
                    ))}
                  </Select>
                  {!selectedFormat && <FormHelperText>Format is required</FormHelperText>}
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              
              {/* Account Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!selectedPlatform} error={!selectedAccount}>
                  <InputLabel id="account-select-label">Account *</InputLabel>
                  <Select
                    labelId="account-select-label"
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    label="Account *"
                  >
                    {availableAccounts.map(account => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {!selectedAccount && <FormHelperText>Account is required</FormHelperText>}
                </FormControl>
              </Grid>
              
              {/* Scheduled Time */}
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Schedule Time *"
                  value={scheduledTime}
                  onChange={(newValue) => setScheduledTime(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !scheduledTime,
                      helperText: !scheduledTime ? 'Schedule time is required' : '',
                      InputProps: {
                        startAdornment: <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      }
                    }
                  }}
                />
              </Grid>
              
              {/* Caption */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Caption"
                  multiline
                  rows={4}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Enter your post caption..."
                  helperText={`${caption.length}/2200 characters`}
                />
              </Grid>
              
              {/* Hashtags */}
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Hashtags
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <TextField
                      fullWidth
                      placeholder="Add hashtag..."
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value.replace(/\s+/g, ''))}
                      InputProps={{
                        startAdornment: <TagIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddHashtag();
                        }
                      }}
                    />
                    <Button 
                      variant="outlined" 
                      onClick={handleAddHashtag} 
                      sx={{ ml: 1 }}
                      disabled={!hashtagInput}
                    >
                      Add
                    </Button>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {hashtags.map(tag => (
                    <Chip
                      key={tag}
                      label={`#${tag}`}
                      onDelete={() => handleRemoveHashtag(tag)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <CloudUploadIcon />}
            onClick={handleSubmit}
            disabled={loading || success}
          >
            {loading ? 'Scheduling...' : 'Schedule Post'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ExportToPlatformDialog;
