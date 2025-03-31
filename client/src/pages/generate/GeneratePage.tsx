import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper,
  Container,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Button
} from '@mui/material';
import {
  Create as CreateIcon,
  Mic as MicIcon,
  Image as ImageIcon,
  Movie as MovieIcon,
  Palette as PaletteIcon,
  AutoFixHigh as AutoFixHighIcon,
  Cameraswitch as CameraswitchIcon,
  ViewQuilt as ViewQuiltIcon,
  MusicNote as MusicNoteIcon
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../store';
import { Template } from '../../types/templates';
import { Campaign } from '../../types/campaigns';
import { 
  selectAllCampaigns,
  fetchCampaigns 
} from '../../store/slices/campaignsSlice';
import { fetchTemplates, selectAllTemplates } from '../../store/slices/templatesSlice';
import CopyGenerationPage from './CopyGenerationPage';
import ImageGenerationPage from './ImageGenerationPage';
import VideoGenerationPage from './VideoGenerationPage';
import LoadingScreen from '../../components/common/LoadingScreen';

// Lazy load the new generation pages
const VoiceoverGenerationPage = lazy(() => import('./VoiceoverGenerationPage'));
const MusicGenerationPage = lazy(() => import('./MusicGenerationPage'));
const TextToImagePage = lazy(() => import('./TextToImagePage'));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`generate-tabpanel-${index}`}
      aria-labelledby={`generate-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const GeneratePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const templates = useSelector(selectAllTemplates);
  const { loading: templatesLoading } = useSelector((state: RootState) => state.templates);
  const campaigns = useSelector(selectAllCampaigns);
  const campaignsLoading = useSelector((state: RootState) => state.campaigns.loading);
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  
  useEffect(() => {
    // Fetch templates and campaigns for the selected client
    if (selectedClientId) {
      dispatch(fetchTemplates());
    }
    // Fetch campaigns if needed
    if (selectedClientId && campaigns.length === 0) {
      dispatch(fetchCampaigns(selectedClientId));
    }
  }, [dispatch, templates.length, campaigns.length, selectedClientId]);

  // Filter campaigns based on selected client
  const clientCampaigns = campaigns.filter(campaign => campaign.client === selectedClientId);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleNavigateToMatrix = () => {
    navigate('/matrix');
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Generate Content
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create and manage various content types for your campaigns
        </Typography>
      </Box>

      {/* Quick links to advanced generation tools */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Advanced Generation Tools
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea onClick={() => setTabValue(3)}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'primary.light'
                  }}
                >
                  <AutoFixHighIcon sx={{ fontSize: 60, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Text to Image
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate images from text prompts with brand style matching
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea onClick={() => setTabValue(4)}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'secondary.light'
                  }}
                >
                  <CameraswitchIcon sx={{ fontSize: 60, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Image to Video
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Convert static images to dynamic videos with motion effects
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea onClick={() => navigate('/matrix')}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'success.light'
                  }}
                >
                  <ViewQuiltIcon sx={{ fontSize: 60, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Campaign Matrix
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create combinations of assets for campaign variations
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea onClick={() => setTabValue(2)}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'warning.light'
                  }}
                >
                  <MusicNoteIcon sx={{ fontSize: 60, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Music Generation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate original music from text descriptions
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea onClick={() => navigate('/generate/unified')}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'info.light'
                  }}
                >
                  <MovieIcon sx={{ fontSize: 60, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h6" component="div">
                    Unified Generation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create complex multimedia content with multiple generation tools
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="generate content tabs"
        >
          <Tab icon={<CreateIcon />} label="Copy" />
          <Tab icon={<MicIcon />} label="Voiceover" />
          <Tab icon={<MusicNoteIcon />} label="Music" />
          <Tab icon={<ImageIcon />} label="Images" />  
          <Tab icon={<MovieIcon />} label="Video" /> 
          <Tab icon={<PaletteIcon />} label="Background" disabled />
        </Tabs>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <LoadingScreen message="Loading content generator..." />
      ) : (
        <Box>
          <TabPanel value={tabValue} index={0}>
            <CopyGenerationPage />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <Suspense fallback={<LoadingScreen message="Loading voiceover generator..." />}>
              <VoiceoverGenerationPage />
            </Suspense>
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <Suspense fallback={<LoadingScreen message="Loading music generator..." />}>
              <MusicGenerationPage />
            </Suspense>
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <Suspense fallback={<LoadingScreen message="Loading image generator..." />}>
              <TextToImagePage />
            </Suspense>
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            <VideoGenerationPage />
          </TabPanel>
          <TabPanel value={tabValue} index={5}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
              <Typography variant="h6" color="text.secondary">
                Background modifications are coming soon
              </Typography>
            </Box>
          </TabPanel>
        </Box>
      )}
    </Container>
  );
};

export default GeneratePage;
