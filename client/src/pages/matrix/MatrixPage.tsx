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
  IconButton
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Preview as PreviewIcon } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchClients } from '../../store/slices/clientSlice';
import apiClient from '../../api/apiClient';

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

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  platform: string;
  client_id: string;
  executions?: any[];
}

const MatrixPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedClientId, clients } = useSelector((state: RootState) => state.clients);
  
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assetsByType, setAssetsByType] = useState<{[key: string]: Asset[]}>({});
  const [selectedAssets, setSelectedAssets] = useState<{[key: string]: string | null}>({});
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  useEffect(() => {
    if (selectedClientId) {
      fetchTemplatesData();
      fetchCampaignsData();
    }
  }, [selectedClientId]);
  
  const fetchTemplatesData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/templates', {
        params: { clientId: selectedClientId }
      });
      setTemplates(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setLoading(false);
    }
  };
  
  const fetchCampaignsData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/campaigns', {
        params: { clientId: selectedClientId }
      });
      setCampaigns(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setLoading(false);
    }
  };
  
  const handleTemplateSelect = async (templateId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/templates/${templateId}`);
      setSelectedTemplate(response.data);
      
      // Extract template variables
      const variables = response.data.variables || [];
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
  
  const handleGeneratePreview = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/api/creatomate/preview', {
        templateId: selectedTemplate?.id,
        modifications: Object.entries(selectedAssets).map(([key, value]) => ({
          name: key,
          assetId: value
        }))
      });
      
      setPreviewUrl(response.data.previewUrl);
      setLoading(false);
    } catch (error) {
      console.error('Error generating preview:', error);
      setLoading(false);
    }
  };
  
  const handleSaveToExecution = async () => {
    try {
      setLoading(true);
      await apiClient.post(`/api/campaigns/${selectedCampaign?.id}/executions`, {
        templateId: selectedTemplate?.id,
        assetSelections: selectedAssets
      });
      
      // Success notification would be added here
      setLoading(false);
    } catch (error) {
      console.error('Error saving execution:', error);
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
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Template</InputLabel>
              <Select
                value={selectedTemplate?.id || ''}
                onChange={(e) => handleTemplateSelect(e.target.value as string)}
                label="Template"
                disabled={loading}
              >
                {templates.map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedTemplate && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Template Preview
                </Typography>
                <Card>
                  <CardMedia
                    component="img"
                    height="140"
                    image={selectedTemplate.thumbnailUrl || '/placeholder-template.jpg'}
                    alt={selectedTemplate.name}
                  />
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
                    <Chip size="small" label={selectedCampaign.platform} />
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
      
      {/* Asset selection matrix */}
      {selectedTemplate && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Asset Selection Matrix
          </Typography>
          
          <Grid container spacing={3}>
            {templateVariables.map(variable => (
              <Grid item xs={12} md={4} key={variable.name}>
                <Typography variant="subtitle1" gutterBottom>
                  {variable.label || variable.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
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
                      {(assetsByType[variable.type] || []).map(asset => (
                        <MenuItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  <Grid container spacing={1}>
                    {(assetsByType[variable.type] || []).map(asset => (
                      <Grid item xs={6} key={asset.id}>
                        <Card 
                          sx={{ 
                            cursor: 'pointer',
                            border: selectedAssets[variable.name] === asset.id ? '2px solid #1976d2' : '2px solid transparent'
                          }}
                          onClick={() => handleAssetSelect(variable.name, asset.id)}
                        >
                          {variable.type === 'image' || variable.type === 'video' ? (
                            <CardMedia
                              component="img"
                              height="80"
                              image={asset.thumbnailUrl || '/placeholder-asset.jpg'}
                              alt={asset.name}
                            />
                          ) : (
                            <Box sx={{ p: 2, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
                              <Typography variant="body2" noWrap>
                                {asset.content || asset.name}
                              </Typography>
                            </Box>
                          )}
                          <CardContent sx={{ py: 1 }}>
                            <Typography variant="caption" noWrap>
                              {asset.name}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default MatrixPage;
