import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  AutoAwesome as GenerateIcon,
  LightbulbOutlined,
  TrendingUp,
} from '@mui/icons-material';
import { AppDispatch } from '../../store';
import {
  Brief,
  fetchBriefById,
  analyzeBrief,
  generateContent,
  selectCurrentBrief,
  selectBriefsLoading,
  selectGeneratedContent,
} from '../../store/slices/briefsSlice';

interface AnalysisResults {
  tone_recommendations: string[];
  key_themes: string[];
  content_suggestions: string[];
  improvement_areas: string[];
}

const BriefDetail: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { organisation } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis'>('overview');

  const currentBrief = useSelector(selectCurrentBrief);
  const loading = useSelector(selectBriefsLoading);
  const generatedContent = useSelector(selectGeneratedContent);

  const [selectedContentType, setSelectedContentType] = useState<'copy' | 'headline' | 'tagline' | 'cta'>('copy');
  const [toneOfVoice, setToneOfVoice] = useState('professional');
  const [targetLength, setTargetLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  useEffect(() => {
    if (!organisation?.id || !id) return;
    if (id) {
      dispatch(fetchBriefById(id));
    }
  }, [dispatch, id]);

  const handleAnalyse = async () => {
    if (id) {
      await dispatch(analyzeBrief(id));
    }
  };

  const handleGenerateContent = async () => {
    if (id) {
      await dispatch(generateContent({
        id,
        contentType: selectedContentType,
        count: 3,
        toneOfVoice,
        targetLength,
        additionalInstructions
      }));
    }
  };

  const handleEdit = () => {
    navigate(`/briefs/${id}/edit`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!currentBrief) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Loading brief...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Brief Details
        </Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={handleEdit}
        >
          Edit Brief
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Brief Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {currentBrief.title}
              </Typography>
              <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                {currentBrief.tags?.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{ backgroundColor: theme.palette.grey[200] }}
                  />
                ))}
              </Box>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {currentBrief.content}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Analysis Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">AI Analysis</Typography>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={handleAnalyse}
                  disabled={loading}
                >
                  {currentBrief.analysis ? 'Reanalyse' : 'Analyse'}
                </Button>
              </Box>

              {currentBrief.analysis ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Target Audience
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {currentBrief.analysis.targetAudience.map((audience, index) => (
                        <Chip key={index} label={audience} size="small" />
                      ))}
                    </Box>

                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Key Messages
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {currentBrief.analysis.keyMessages.map((message, index) => (
                        <Chip key={index} label={message} size="small" />
                      ))}
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Tone of Voice
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {currentBrief.analysis.toneOfVoice.map((tone, index) => (
                        <Chip key={index} label={tone} size="small" />
                      ))}
                    </Box>

                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Campaign Objectives
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {currentBrief.analysis.campaignObjectives.map((objective, index) => (
                        <Chip key={index} label={objective} size="small" />
                      ))}
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Insights & Recommendations
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {currentBrief.analysis.insightsAndRecommendations}
                    </Typography>

                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Suggested Visual Direction
                    </Typography>
                    <Typography variant="body2">
                      {currentBrief.analysis.suggestedVisualDirection}
                    </Typography>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No analysis available. Click 'Analyse' to generate insights.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Content Generation Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Content Generation
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Content Type</InputLabel>
                    <Select
                      value={selectedContentType}
                      onChange={(e) => setSelectedContentType(e.target.value as typeof selectedContentType)}
                      label="Content Type"
                    >
                      <MenuItem value="copy">Ad Copy</MenuItem>
                      <MenuItem value="headline">Headlines</MenuItem>
                      <MenuItem value="tagline">Taglines</MenuItem>
                      <MenuItem value="cta">Call to Action</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tone of Voice</InputLabel>
                    <Select
                      value={toneOfVoice}
                      onChange={(e) => setToneOfVoice(e.target.value)}
                      label="Tone of Voice"
                    >
                      <MenuItem value="professional">Professional</MenuItem>
                      <MenuItem value="casual">Casual</MenuItem>
                      <MenuItem value="friendly">Friendly</MenuItem>
                      <MenuItem value="authoritative">Authoritative</MenuItem>
                      <MenuItem value="humorous">Humorous</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Length</InputLabel>
                    <Select
                      value={targetLength}
                      onChange={(e) => setTargetLength(e.target.value as typeof targetLength)}
                      label="Length"
                    >
                      <MenuItem value="short">Short</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="long">Long</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Additional Instructions"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Add any specific requirements or preferences..."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<GenerateIcon />}
                    onClick={handleGenerateContent}
                    disabled={loading || generatedContent.loading}
                  >
                    Generate Content
                  </Button>
                </Grid>
              </Grid>

              {generatedContent.content.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Generated Content
                  </Typography>
                  <Grid container spacing={2}>
                    {generatedContent.content.map((content, index) => (
                      <Grid item xs={12} key={index}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography variant="body1" sx={{ flex: 1 }}>
                                {content}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => copyToClipboard(content)}
                                sx={{ ml: 1 }}
                              >
                                <CopyIcon />
                              </IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default BriefDetail;
