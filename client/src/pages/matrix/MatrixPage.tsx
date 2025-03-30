import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Skeleton
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Preview as PreviewIcon, Error as ErrorIcon } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchClients } from '../../store/slices/clientSlice';
import { selectAllCampaigns, fetchCampaigns } from '../../store/slices/campaignsSlice';
import { Campaign as CampaignType, Execution } from '../../types/campaigns';
import apiClient from '../../api/apiClient';
import TemplateCard from '../../components/templates/TemplateCard';
import { VirtualizedAssetGrid } from '../../components/matrix/VirtualizedAssetGrid';

interface Asset {
  id: string;
  name: string;
  type: string;
  client_id: string;
  thumbnailUrl?: string;
  content?: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  format: string;
  duration?: number;
  thumbnailUrl?: string;
  variables?: TemplateVariable[];
  client_id: string;
}

interface TemplateVariable {
  name: string;
  type: string;
  label?: string;
  description?: string;
}

const MatrixPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedClientId, clients } = useSelector((state: RootState) => state.clients);

  // Use the selector for campaigns
  const reduxCampaigns = useSelector(selectAllCampaigns); 
  const campaignsLoading = useSelector((state: RootState) => state.campaigns.loading);
  
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignType | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignType[]>([]);
  const [assetsByType, setAssetsByType] = useState<{[key: string]: Asset[]}>({});
  const [selectedAssets, setSelectedAssets] = useState<{[key: string]: string | null}>({});
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    if (selectedClientId) {
      console.log('Client selected, fetching templates and campaigns:', selectedClientId);
      fetchTemplatesData();
      dispatch(fetchCampaigns(selectedClientId));
    }
  }, [selectedClientId, dispatch]);
  
  const fetchTemplatesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/templates', {
        params: { clientId: selectedClientId }
      });
      setTemplates(response.data);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      setError(error?.response?.data?.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };
  
  // Use campaigns from Redux store
  useEffect(() => {
    if (reduxCampaigns.length > 0) {
      // Filter campaigns by client ID if needed
      const clientCampaigns = reduxCampaigns.filter(campaign => 
        campaign.client === selectedClientId || !campaign.client);
      setCampaigns(clientCampaigns);
    }
  }, [reduxCampaigns, selectedClientId]);
  
  useEffect(() => {
    // Fetch campaigns if not already loaded
    if (reduxCampaigns.length === 0 && selectedClientId) {
      dispatch(fetchCampaigns(selectedClientId));
    }
  }, [dispatch, reduxCampaigns.length, selectedClientId]);

  const handleTemplateSelect = async (templateId: string) => {
    try {
      console.log('Template selected:', templateId);
      setLoading(true);
      const response = await apiClient.get(`/api/templates/${templateId}`);
      console.log('Template data received:', response.data);
      setSelectedTemplate(response.data);
      
      // Extract template variables
      let variables = response.data.variables || [];
      console.log('Template variables:', variables);
      
      // If no variables are defined, add some placeholders to demonstrate the UI
      if (variables.length === 0) {
        console.log('No variables found in template, adding placeholders');
        variables = [
          {
            name: 'background',
            label: 'Background Video',
            type: 'video',
            description: 'Select main background footage'
          },
          {
            name: 'headline',
            label: 'Headline Copy',
            type: 'text',
            description: 'Select headline text for your ad'
          },
          {
            name: 'product',
            label: 'Product Image',
            type: 'image',
            description: 'Select product to feature'
          }
        ];
        
        // Create demo assets for the placeholders if needed
        // Directly update the state instead of using setTimeout to avoid race conditions
        try {
          // Get the client ID from the current selection
          const clientId = selectedClientId || '';
          
          // Build proper Asset objects with all required properties
          const createAsset = (id: string, name: string, assetType: string, content?: string): Asset => ({
            id,
            name,
            client_id: clientId,
            type: assetType,
            thumbnailUrl: undefined,
            content: content || undefined
          });
          
          const demoAssets: {[key: string]: Asset[]} = {
            'video': [
              createAsset('v1', 'Beach Sunset', 'video'),
              createAsset('v2', 'Mountain Lake', 'video'),
              createAsset('v3', 'Urban Street', 'video'),
              createAsset('v4', 'Forest Path', 'video')
            ],
            'text': [
              createAsset('t1', 'Summer Vibes Are Here', 'text', 'Summer Vibes Are Here'),
              createAsset('t2', 'Escape To Paradise', 'text', 'Escape To Paradise'),
              createAsset('t3', 'Make This Summer Count', 'text', 'Make This Summer Count')
            ],
            'image': [
              createAsset('i1', 'Classic Bottle', 'image'),
              createAsset('i2', 'Summer Edition', 'image'),
              createAsset('i3', 'Product Range', 'image'),
              createAsset('i4', 'Beach Bundle', 'image')
            ]
          };
          setAssetsByType(demoAssets);
        } catch (error) {
          console.error('Error setting demo assets:', error);
          setAssetsByType({
            'video': [],
            'text': [],
            'image': []
          });
        }
      }
      
      setTemplateVariables(variables);
      
      // Initialise selected assets
      const initialSelectedAssets: {[key: string]: string | null} = {};
      variables.forEach((variable: TemplateVariable) => {
        initialSelectedAssets[variable.name] = null;
      });
      setSelectedAssets(initialSelectedAssets);
      
      // Fetch assets by type for each variable
      fetchAssetsByTypes(variables.map((v: TemplateVariable) => v.type));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching template details:', error);
      setLoading(false);
    }
  };
  
  const fetchAssetsByTypes = async (types: string[]) => {
    const uniqueTypes = [...new Set(types)];
    console.log('Fetching assets for types:', uniqueTypes);
    const assetsByTypeObj: {[key: string]: Asset[]} = {};
    
    setLoading(true);
    for (const type of uniqueTypes) {
      try {
        const response = await apiClient.get('/api/assets', {
          params: { 
            clientId: selectedClientId,
            type: type
          }
        });
        console.log(`Assets received for type ${type}:`, response.data);
        assetsByTypeObj[type] = response.data;
      } catch (error) {
        console.error(`Error fetching ${type} assets:`, error);
        assetsByTypeObj[type] = [];
      }
    }
    
    setAssetsByType(assetsByTypeObj);
    setLoading(false);
  };
  
  const handleAssetSelect = (variableName: string, assetId: string) => {
    setSelectedAssets({
      ...selectedAssets,
      [variableName]: assetId
    });
  };
  
  const handleCampaignSelect = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign) {
      setSelectedCampaign(campaign);
    }
  };

  // Helper function to convert format strings to CSS aspect ratio values
  const getAspectRatio = (format: string): string => {
    switch (format) {
      case 'square':
        return '1 / 1';
      case 'landscape':
        return '16 / 9';
      case 'portrait':
        return '4 / 5';
      case 'story':
        return '9 / 16';
      default:
        return '1 / 1';
    }
  };
  
  const handleGeneratePreview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.post('/api/creatomate/preview', {
        templateId: selectedTemplate?.id,
        modifications: Object.entries(selectedAssets).map(([key, value]) => ({
          name: key,
          assetId: value
        }))
      });
      
      setPreviewUrl(response.data.previewUrl);
    } catch (error: any) {
      console.error('Error generating preview:', error);
      setError(error?.response?.data?.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveToExecution = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.post(`/api/campaigns/${selectedCampaign?.id}/executions`, {
        templateId: selectedTemplate?.id,
        assetSelections: selectedAssets
      });
      
      // Success notification would be added here
      window.alert('Execution saved successfully!');
    } catch (error: any) {
      console.error('Error saving execution:', error);
      setError(error?.response?.data?.message || 'Failed to save execution');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Visual Asset Matrix
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Create combinations of visual and copy assets to generate multiple ad variations
      </Typography>
      
      <Grid container spacing={3}>
        {/* Template selection */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              1. Select Template
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2">{error}</Typography>
                <Button size="small" onClick={fetchTemplatesData} sx={{ mt: 1 }}>Try Again</Button>
              </Alert>
            ) : (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Template</InputLabel>
                <Select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => handleTemplateSelect(e.target.value as string)}
                  label="Template"
                  disabled={loading}
                >
                  {templates.length > 0 ? templates.map(template => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  )) : (
                    <MenuItem value="" disabled>No templates available</MenuItem>
                  )}
                </Select>
              </FormControl>
            )}
            
            {selectedTemplate && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Template Preview
                </Typography>
                <Card sx={{ bgcolor: 'black', p: 2 }}>
                  {/* Container for thumbnail and aspect ratio */}
                  <Box sx={{ 
                    position: 'relative',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mb: 2
                  }}>
                    <Box sx={{
                      position: 'relative',
                      width: '220px',
                      maxWidth: '95%',
                    }}>
                      {/* Thumbnail image if available */}
                      {selectedTemplate.thumbnailUrl && (
                        <Box 
                          component="img"
                          src={selectedTemplate.thumbnailUrl}
                          alt={selectedTemplate.name}
                          sx={{
                            width: '100%',
                            height: 'auto',
                            aspectRatio: getAspectRatio(selectedTemplate.format || 'square'),
                            objectFit: 'cover',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: 1,
                            border: '4px solid white',
                            borderRadius: '4px',
                          }}
                        />
                      )}
                      
                      {/* Aspect ratio container - always visible */}
                      <Box
                        sx={{
                          width: '100%',
                          aspectRatio: getAspectRatio(selectedTemplate.format || 'square'),
                          border: '4px solid white',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          boxShadow: '0 0 20px rgba(255,255,255,0.3)',
                          position: 'relative',
                          backgroundColor: selectedTemplate.thumbnailUrl ? 'rgba(0,0,0,0.5)' : '#111',
                          zIndex: selectedTemplate.thumbnailUrl ? 2 : 1,
                        }}
                      >
                        {/* Aspect ratio text */}
                        <Typography 
                          variant="h4" 
                          component="div" 
                          textAlign="center" 
                          fontWeight="bold" 
                          color="white"
                          sx={{ 
                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                            letterSpacing: '1px',
                            zIndex: 3,
                          }}
                        >
                          {selectedTemplate.format === 'square' && '1:1'}
                          {selectedTemplate.format === 'landscape' && '16:9'}
                          {selectedTemplate.format === 'portrait' && '4:5'}
                          {selectedTemplate.format === 'story' && '9:16'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <CardContent>
                    <Typography variant="h6">{selectedTemplate.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTemplate.description}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" display="block">
                        Format: {selectedTemplate.format}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Duration: {selectedTemplate.duration}s
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Campaign selection */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              2. Choose Campaign
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Campaign</InputLabel>
              <Select
                value={selectedCampaign?.id || ''}
                onChange={(e) => handleCampaignSelect(e.target.value as string)}
                label="Campaign"
                disabled={!selectedTemplate || loading}
              >
                {campaigns.map(campaign => (
                  <MenuItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedCampaign && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Campaign Details
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body1">{selectedCampaign.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedCampaign.description}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label={`${selectedCampaign.executions?.length || 0} Executions`} />
                    <Chip size="small" label={selectedCampaign.status} color={
                      selectedCampaign.status === 'active' ? 'success' : 
                      selectedCampaign.status === 'draft' ? 'default' : 'primary'
                    } />
                    <Chip size="small" label={selectedCampaign.platforms && selectedCampaign.platforms.length > 0 ? selectedCampaign.platforms[0] : 'No platform'} />
                  </Stack>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Asset configuration */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              3. Configure & Generate
            </Typography>
            
            <Button 
              variant="contained" 
              startIcon={<PreviewIcon />} 
              fullWidth
              onClick={handleGeneratePreview}
              disabled={!selectedTemplate || !selectedCampaign || Object.values(selectedAssets).some(v => !v) || loading}
              sx={{ mb: 2 }}
            >
              Generate Preview
            </Button>
            
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />} 
              fullWidth
              onClick={handleSaveToExecution}
              disabled={!selectedTemplate || !selectedCampaign || Object.values(selectedAssets).some(v => !v) || loading}
              sx={{ mb: 3 }}
            >
              Save to Campaign
            </Button>
            
            {previewUrl && (
              <Box sx={{ mt: 2, mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Preview
                </Typography>
                <Box sx={{ position: 'relative', pt: '56.25%' }}>
                  <Box
                    component="iframe"
                    src={previewUrl}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: 1
                    }}
                  />
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Generate Content Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/generate')}
          disabled={!selectedClientId}
        >
          Generate Content
        </Button>
      </Box>
      
      {/* Asset selection matrix */}
      {selectedTemplate && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
            Asset Selection Matrix
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select assets for each template variable to create your ad execution
          </Typography>
          
          <Grid container spacing={3}>
            {templateVariables.map(variable => (
              <Grid item xs={12} md={4} key={variable.name}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {variable.label || variable.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 2 }}>
                  {variable.description || `Select a ${variable.type} asset`}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>{variable.label || variable.name}</InputLabel>
                    <Select
                      value={selectedAssets[variable.name] || ''}
                      onChange={(e) => handleAssetSelect(variable.name, e.target.value as string)}
                      label={variable.label || variable.name}
                      disabled={loading}
                    >
                      {Array.isArray(assetsByType[variable.type]) ? assetsByType[variable.type].map(asset => (
                        <MenuItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </MenuItem>
                      )) : <MenuItem value="">No assets available</MenuItem>}
                    </Select>
                  </FormControl>
                </Box>
                
                <VirtualizedAssetGrid 
                  assets={assetsByType[variable.type] || []} 
                  selectedAssetId={selectedAssets[variable.name]}
                  onAssetSelect={(assetId) => handleAssetSelect(variable.name, assetId)} // Pass handler bound to variable
                  assetType={variable.type}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default MatrixPage;
