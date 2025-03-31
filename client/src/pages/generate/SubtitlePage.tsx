import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Grid,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useClient } from '../../hooks/useClient';
import { useSocket } from '../../contexts/SocketContext';
import { useSnackbar } from 'notistack';
import { api } from '../../services/api';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MovieIcon from '@mui/icons-material/Movie';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import GetAppIcon from '@mui/icons-material/GetApp';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LoadingButton } from '@mui/lab';

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
}));

const UploadBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  cursor: 'pointer',
  minHeight: '200px',
  textAlign: 'center',
  transition: 'border-color 0.3s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
}));

const FilePreview = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  marginBottom: theme.spacing(2),
}));

const VideoPreview = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  '& video': {
    width: '100%',
    maxHeight: '300px',
    objectFit: 'contain',
  },
}));

const SubtitleList = styled(List)(({ theme }) => ({
  maxHeight: '300px',
  overflow: 'auto',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

interface Language {
  code: string;
  name: string;
  native_name?: string;
  flag?: string;
}

interface SubtitleJob {
  jobId: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  message?: string;
  error?: string;
  videoAssetId?: string;
  subtitleAssetId?: string;
  results?: {
    language: string;
    subtitleUrl?: string;
  }[];
}

interface SubtitleEntry {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

const TabPanel = (props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`subtitle-tabpanel-${index}`}
      aria-labelledby={`subtitle-tab-${index}`}
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

const SubtitlePage: React.FC = () => {
  const { client } = useClient();
  const { socket } = useSocket();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Job state
  const [currentJob, setCurrentJob] = useState<SubtitleJob | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  
  // Load available languages on component mount
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await api.get('/api/subtitles/languages', {
          params: { client_id: client?.id }
        });
        
        if (response.data.success) {
          setAvailableLanguages(response.data.data);
        } else {
          setError('Failed to load available languages');
        }
      } catch (err) {
        console.error('Error fetching languages:', err);
        setError('Failed to load languages. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (client?.id) {
      fetchLanguages();
    }
  }, [client?.id]);

  // Socket event listener for job updates
  useEffect(() => {
    if (!socket) return;

    const handleJobProgress = (data: any) => {
      if (data.service === 'subtitle' && currentJob && data.jobId === currentJob.jobId) {
        const updatedJob = {
          ...currentJob,
          status: data.status,
          progress: data.progress,
          message: data.message,
          error: data.error,
        };
        
        // Try to extract results from the message
        try {
          if (data.message && data.message.includes('results')) {
            const jsonStartIndex = data.message.indexOf('{');
            if (jsonStartIndex >= 0) {
              const jsonString = data.message.substring(jsonStartIndex);
              const parsedData = JSON.parse(jsonString);
              if (parsedData.results) {
                updatedJob.results = parsedData.results;
              }
            }
          }
        } catch (err) {
          console.warn('Failed to parse results from message', err);
        }
        
        setCurrentJob(updatedJob);

        if (data.status === 'succeeded') {
          enqueueSnackbar('Subtitles generated successfully!', { variant: 'success' });
          setIsGenerating(false);
          
          // If results available, fetch the subtitles
          if (updatedJob.results && updatedJob.results.length > 0) {
            const firstResult = updatedJob.results[0];
            if (firstResult.subtitleUrl) {
              fetchSubtitles(firstResult.subtitleUrl);
            }
          }
        } else if (data.status === 'failed') {
          enqueueSnackbar(`Subtitle generation failed: ${data.error}`, { variant: 'error' });
          setIsGenerating(false);
        }
      }
    };

    socket.on('jobProgress', handleJobProgress);

    return () => {
      socket.off('jobProgress', handleJobProgress);
    };
  }, [socket, currentJob, enqueueSnackbar]);

  // Parse .srt subtitles from URL
  const fetchSubtitles = async (url: string) => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const parsedSubtitles = parseSRT(text);
      setSubtitles(parsedSubtitles);
    } catch (err) {
      console.error('Error fetching subtitles:', err);
      enqueueSnackbar('Failed to load subtitles', { variant: 'error' });
    }
  };

  // Parse SRT format
  const parseSRT = (srtString: string): SubtitleEntry[] => {
    const lines = srtString.trim().split('\n');
    const entries: SubtitleEntry[] = [];
    let currentEntry: Partial<SubtitleEntry> = {};
    let textLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '') {
        // End of entry
        if (currentEntry.id && currentEntry.startTime && currentEntry.endTime) {
          entries.push({
            id: currentEntry.id,
            startTime: currentEntry.startTime,
            endTime: currentEntry.endTime,
            text: textLines.join(' ')
          });
        }
        
        currentEntry = {};
        textLines = [];
      } else if (!currentEntry.id) {
        // First line is the ID
        currentEntry.id = parseInt(line, 10);
      } else if (!currentEntry.startTime || !currentEntry.endTime) {
        // Second line is the timestamp
        const timestamps = line.split(' --> ');
        if (timestamps.length === 2) {
          currentEntry.startTime = timestamps[0];
          currentEntry.endTime = timestamps[1];
        }
      } else {
        // The rest is the text
        textLines.push(line);
      }
    }
    
    // Don't forget the last entry
    if (currentEntry.id && currentEntry.startTime && currentEntry.endTime) {
      entries.push({
        id: currentEntry.id,
        startTime: currentEntry.startTime,
        endTime: currentEntry.endTime,
        text: textLines.join(' ')
      });
    }
    
    return entries;
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      setFile(selectedFile);
      
      // Create URL for preview
      if (selectedFile.type.startsWith('video/')) {
        const objectUrl = URL.createObjectURL(selectedFile);
        setFilePreview(objectUrl);
      } else {
        setFilePreview(null);
        enqueueSnackbar('Please select a valid video file', { variant: 'warning' });
      }
    }
  };

  // Handle file drop
  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      
      if (droppedFile.type.startsWith('video/')) {
        setFile(droppedFile);
        const objectUrl = URL.createObjectURL(droppedFile);
        setFilePreview(objectUrl);
      } else {
        enqueueSnackbar('Please select a valid video file', { variant: 'warning' });
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle language selection
  const handleLanguageChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedLanguages(event.target.value as string[]);
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle form submission
  const handleGenerateSubtitles = async () => {
    if (!file) {
      enqueueSnackbar('Please upload a video file', { variant: 'warning' });
      return;
    }

    if (selectedLanguages.length === 0) {
      enqueueSnackbar('Please select at least one language', { variant: 'warning' });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('client_id', client?.id || '');
      selectedLanguages.forEach(lang => {
        formData.append('languages[]', lang);
      });

      const response = await api.post('/api/subtitles/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const { jobId } = response.data.data;
        setCurrentJob({
          jobId,
          status: 'pending',
          progress: 0,
          message: 'Starting subtitle generation...'
        });
      } else {
        throw new Error(response.data.message || 'Failed to start subtitle generation');
      }
    } catch (err: any) {
      console.error('Error generating subtitles:', err);
      enqueueSnackbar(`Error: ${err.message || 'Failed to generate subtitles'}`, { variant: 'error' });
      setIsGenerating(false);
      setError(err.message || 'An unexpected error occurred');
    }
  };

  // Download subtitles file
  const handleDownloadSubtitles = (url?: string, language?: string) => {
    if (!url) {
      enqueueSnackbar('Subtitle URL not available', { variant: 'warning' });
      return;
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `subtitles_${language || 'unknown'}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    enqueueSnackbar('Subtitles download started', { variant: 'success' });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Subtitle Generation
      </Typography>
      
      <Typography variant="body1" paragraph>
        Generate accurate subtitles for your videos using AI-powered speech recognition.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <StyledPaper elevation={2}>
        <Typography variant="h6" gutterBottom>
          Upload Video
        </Typography>
        
        {file ? (
          <Box>
            <FilePreview>
              <MovieIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1">{file.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </Typography>
              </Box>
              <Button 
                startIcon={<RefreshIcon />} 
                onClick={() => {
                  setFile(null);
                  setFilePreview(null);
                }}
              >
                Change
              </Button>
            </FilePreview>
            
            {filePreview && (
              <VideoPreview>
                <video controls>
                  <source src={filePreview} type={file.type} />
                  Your browser does not support the video tag.
                </video>
              </VideoPreview>
            )}
          </Box>
        ) : (
          <>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="video/*"
              onChange={handleFileChange}
            />
            <UploadBox
              onClick={handleUploadClick}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Upload Video File
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Drag and drop a video file here, or click to browse
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Supported formats: MP4, AVI, MOV, WMV (Max 500MB)
              </Typography>
            </UploadBox>
          </>
        )}
        
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Language Selection
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="language-select-label">Languages</InputLabel>
            <Select
              labelId="language-select-label"
              multiple
              value={selectedLanguages}
              onChange={handleLanguageChange as any}
              label="Languages"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((langCode) => {
                    const lang = availableLanguages.find(l => l.code === langCode);
                    return (
                      <Chip 
                        key={langCode} 
                        label={lang ? lang.name : langCode} 
                        size="small" 
                      />
                    );
                  })}
                </Box>
              )}
              disabled={isGenerating}
            >
              {availableLanguages.map((language) => (
                <MenuItem key={language.code} value={language.code}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {language.flag && (
                      <Box component="span" sx={{ mr: 1, fontSize: '1.2em' }}>
                        {language.flag}
                      </Box>
                    )}
                    <Typography>
                      {language.name}
                      {language.native_name && language.native_name !== language.name && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({language.native_name})
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        <Box display="flex" justifyContent="flex-end" mt={3}>
          <LoadingButton
            variant="contained"
            color="primary"
            size="large"
            onClick={handleGenerateSubtitles}
            loading={isGenerating}
            disabled={!file || selectedLanguages.length === 0}
            sx={{ px: 4 }}
          >
            Generate Subtitles
          </LoadingButton>
        </Box>
      </StyledPaper>
      
      {currentJob && (
        <StyledPaper elevation={2}>
          <Typography variant="h6" gutterBottom>
            Generation Progress
          </Typography>
          
          <Box display="flex" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
              Status: {currentJob.status}
            </Typography>
            {currentJob.status === 'processing' || currentJob.status === 'pending' ? (
              <CircularProgress size={16} thickness={5} />
            ) : null}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgressWithLabel value={currentJob.progress} />
            </Box>
          </Box>
          
          {currentJob.message && (
            <Typography variant="body2" color="textSecondary" mt={1}>
              {typeof currentJob.message === 'string' && 
                currentJob.message.replace(/\{.*\}/g, '')}
            </Typography>
          )}
          
          {currentJob.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {currentJob.error}
            </Alert>
          )}
          
          {currentJob.results && currentJob.results.length > 0 && (
            <Box mt={3}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Generated Subtitles
              </Typography>
              
              <Box sx={{ width: '100%' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={tabValue} onChange={handleTabChange} aria-label="subtitle language tabs">
                    {currentJob.results.map((result, index) => {
                      const lang = availableLanguages.find(l => l.code === result.language);
                      return (
                        <Tab 
                          key={result.language} 
                          label={lang ? lang.name : result.language} 
                          id={`subtitle-tab-${index}`}
                          aria-controls={`subtitle-tabpanel-${index}`}
                        />
                      );
                    })}
                  </Tabs>
                </Box>
                
                {currentJob.results.map((result, index) => (
                  <TabPanel key={index} value={tabValue} index={index}>
                    <Box display="flex" justifyContent="flex-end" mb={2}>
                      <Button
                        variant="outlined"
                        startIcon={<GetAppIcon />}
                        onClick={() => handleDownloadSubtitles(result.subtitleUrl, result.language)}
                        disabled={!result.subtitleUrl}
                      >
                        Download Subtitles
                      </Button>
                    </Box>
                    
                    {tabValue === index && subtitles.length > 0 ? (
                      <SubtitleList>
                        {subtitles.map((subtitle) => (
                          <ListItem key={subtitle.id} divider>
                            <ListItemText
                              primary={subtitle.text}
                              secondary={`${subtitle.startTime} → ${subtitle.endTime}`}
                            />
                          </ListItem>
                        ))}
                      </SubtitleList>
                    ) : (
                      <Alert severity="info">
                        Click the download button to get the subtitles file
                      </Alert>
                    )}
                  </TabPanel>
                ))}
              </Box>
            </Box>
          )}
        </StyledPaper>
      )}
    </Box>
  );
};

// Helper component for progress bar with label
const LinearProgressWithLabel: React.FC<{ value: number }> = ({ value }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <Box
          sx={{
            height: 10,
            borderRadius: 5,
            backgroundColor: '#e0e0e0',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'primary.main',
              width: `${value}%`,
              transition: 'width 0.4s ease-in-out',
            }}
          />
        </Box>
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="textSecondary">
          {`${Math.round(value)}%`}
        </Typography>
      </Box>
    </Box>
  );
};

export default SubtitlePage;
