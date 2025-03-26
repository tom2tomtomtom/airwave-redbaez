import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import {
  Create as CreateIcon,
  Mic as MicIcon,
  Image as ImageIcon,
  Movie as MovieIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../store';
import { fetchTemplates } from '../../store/slices/templatesSlice';
import { fetchCampaigns } from '../../store/slices/campaignsSlice';
import CopyGenerationPage from './CopyGenerationPage';
import ImageGenerationPage from './ImageGenerationPage';
import VideoGenerationPage from './VideoGenerationPage';
import LoadingScreen from '../../components/common/LoadingScreen';

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
  
  const { templates, loading: templatesLoading } = useSelector((state: RootState) => state.templates);
  const { campaigns, loading: campaignsLoading } = useSelector((state: RootState) => state.campaigns);
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  
  useEffect(() => {
    // Fetch templates and campaigns for the selected client
    if (selectedClientId) {
      dispatch(fetchTemplates());
      dispatch(fetchCampaigns());
    }
  }, [dispatch, selectedClientId]);

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
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
              <Typography variant="h6" color="text.secondary">
                Voiceover generation is coming soon
              </Typography>
            </Box>
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <ImageGenerationPage />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <VideoGenerationPage />
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
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
