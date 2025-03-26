import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Divider, 
  Button,
  Card,
  CardContent,
  CardMedia,
  Tabs,
  Tab,
  CircularProgress,
  Chip
} from '@mui/material';
import { 
  Business as BusinessIcon, 
  VideoLibrary as VideoIcon,
  InsertDriveFile as TemplateIcon,
  Campaign as CampaignIcon,
  Analytics as AnalyticsIcon,
  Edit as EditIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../../store';
import { fetchClients } from '../../store/slices/clientSlice';
import { fetchAssets } from '../../store/slices/assetsSlice';
import { fetchTemplates } from '../../store/slices/templatesSlice';
import ClientSelector from '../../components/clients/ClientSelector';
import ClientDialog from '../../components/clients/ClientDialog';
import { useClients } from '../../hooks/useClients';
import { Client as ApiClient } from '../../api/types/client.types';
import { Client as ReduxClient } from '../../types/client';
import { Asset } from '../../api/types/asset.types';
import DirectAssetDisplay from '../../components/assets/DirectAssetDisplay';

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
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ClientDashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const { clients, selectedClientId, loading: clientsLoading } = useSelector((state: RootState) => state.clients);
  const { assets, loading: assetsLoading } = useSelector((state: RootState) => state.assets);
  const { templates, loading: templatesLoading } = useSelector((state: RootState) => state.templates);
  
  // Use the new client hook in parallel with Redux during migration
  const { clients: serviceClients, selectedClient: serviceSelectedClient } = useClients();
  
  // Look for the selected client using the ID (from Redux or the new service)
  // Prefer the new service client if available
  const selectedReduxClient = clients.find(client => client.id === selectedClientId);
  
  // We need to ensure type safety, so we'll use an adapter pattern
  // Convert from Redux client type to API client type if needed
  const selectedClient: ApiClient | null = serviceSelectedClient || (
    selectedReduxClient ? {
      id: selectedReduxClient.id || '',
      name: selectedReduxClient.name,
      slug: selectedReduxClient.slug,
      logoUrl: selectedReduxClient.logoUrl,
      brandColour: selectedReduxClient.brandColour,
      status: selectedReduxClient.isActive ? 'active' : 'inactive',
      createdAt: selectedReduxClient.createdAt,
      updatedAt: selectedReduxClient.updatedAt
    } : null
  );
  
  // Filter assets and templates by selected client
  console.log('=== CLIENT DASHBOARD DEBUG ===');
  console.log('Selected client ID from Redux store:', selectedClientId);
  console.log('Number of clients available:', clients.length);
  console.log('Client IDs available:', clients.map(c => c.id));
  console.log('Client slugs available:', clients.map(c => c.slug));
  console.log('Selected client object found:', selectedClient);
  console.log('Total assets loaded:', assets.length);
  console.log('First few assets:', assets.slice(0, 3));
  console.log('First few asset client IDs:', assets.slice(0, 5).map(asset => asset.clientId));
  
  // ==== MULTIPLE FILTERING APPROACHES ====
  
  // 1. Standard approach with strict string comparison
  const clientAssetsStrict = selectedClientId 
    ? assets.filter(asset => {
        // Convert both to strings for strict comparison
        const assetClientIdStr = String(asset.clientId || "");
        const selectedClientIdStr = String(selectedClientId || "");
        const matches = assetClientIdStr === selectedClientIdStr;
        
        // Log details for the first few assets to understand what's happening
        if (assets.indexOf(asset) < 3) {
          console.log(`[Standard] Asset ${asset.id} - clientId: [${asset.clientId}] (${typeof asset.clientId}), selectedId: [${selectedClientId}] (${typeof selectedClientId}), match: ${matches}`);
        }
        
        return matches;
      })
    : assets;
  
  // 2. UUID format normalization approach
  const normalizeUuid = (id: string | null | undefined): string => {
    if (!id) return '';
    // Remove any whitespace, dashes and convert to lowercase
    return id.toString().replace(/[\s-]/g, '').toLowerCase();
  };
  
  const clientAssetsNormalized = selectedClientId 
    ? assets.filter(asset => {
        const normalizedAssetId = normalizeUuid(asset.clientId);
        const normalizedSelectedId = normalizeUuid(selectedClientId);
        const matches = normalizedAssetId === normalizedSelectedId;
        
        if (assets.indexOf(asset) < 3) {
          console.log(`[Normalized] Asset ${asset.id} - normalized: [${normalizedAssetId}], selected: [${normalizedSelectedId}], match: ${matches}`);
        }
        
        return matches;
      })
    : assets;
    
  // 3. Partial matching approach - match just the start of the UUID
  const clientAssetsPartial = selectedClientId && selectedClientId.length > 8
    ? assets.filter(asset => {
        // Match first 8 characters of the UUID
        const partialMatch = asset.clientId?.toString().substring(0, 8) === selectedClientId.toString().substring(0, 8);
        
        if (assets.indexOf(asset) < 3) {
          console.log(`[Partial] Asset ${asset.id} - partial match: ${partialMatch} - [${asset.clientId?.substring(0, 8)}] vs [${selectedClientId.toString().substring(0, 8)}]`);
        }
        
        return partialMatch;
      })
    : assets;
    
  // 4. Hard-coded Juniper client ID approach (primary approach for Juniper)
  const JUNIPER_CLIENT_ID = 'fd790d19-6610-4cd5-b90f-214808e94a19';
  const clientAssetsHardcoded = selectedClient?.name === 'Juniper'
    ? assets.filter(asset => {
        // Check against the Juniper client ID directly
        const hardcodedMatch = asset.clientId === JUNIPER_CLIENT_ID;
        // Also check if clientId includes the Juniper ID (handles potential format issues)
        const includesMatch = asset.clientId && asset.clientId.includes('fd790d19');
        // Check if clientId has any value when we're looking for Juniper assets
        // This is a fallback to catch improperly tagged assets
        const hasAnyClientId = asset.clientId && asset.clientId.length > 0;
        const match = hardcodedMatch || includesMatch || (selectedClient?.name === 'Juniper' && hasAnyClientId);
        
        if (assets.indexOf(asset) < 5) {
          console.log(`[Juniper] Asset ${asset.id} - clientId: [${asset.clientId}], match: ${match}`);
        }
        
        return match;
      })
    : [];
  
  // 5. Direct database ID comparison - this is the most reliable approach overall
  const clientAssetsDirect = selectedClientId
    ? assets.filter(asset => {
        // This handles the case where the client ID in the asset might be stored in different formats
        const directMatch = asset.clientId && (
          asset.clientId === selectedClientId || // Exact match
          asset.clientId.replace(/-/g, '') === selectedClientId.replace(/-/g, '') // Without hyphens
        );
        
        if (assets.indexOf(asset) < 3) {
          console.log(`[Direct] Asset ${asset.id} - clientId: [${asset.clientId}], selectedId: [${selectedClientId}], match: ${directMatch}`);
        }
        
        return directMatch;
      })
    : [];
  
  // Direct asset loading approach
  // This code uses the DirectAssetDisplay component which makes direct API calls
  // and reliably loads assets with the working client ID
  
  // We'll track client assets count for the UI, but the actual loading will be done by DirectAssetDisplay
  const [clientAssetsCount, setClientAssetsCount] = useState<number>(0);
  
  // Asset count handler
  const handleAssetsLoaded = (loadedAssets: Asset[]) => {
    setClientAssetsCount(loadedAssets.length);
    console.log(`✅ Successfully loaded ${loadedAssets.length} assets for client ${selectedClientId || 'unknown'}`);
  };
  
  // Create a render function for the asset cards
  const renderAssetCard = (asset: Asset) => (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 3
      }
    }}>
      <Box sx={{ position: 'relative', paddingTop: '56.25%', bgcolor: 'rgba(0,0,0,0.04)' }}>
        {asset.thumbnailUrl ? (
          <CardMedia
            component="img"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
            image={asset.thumbnailUrl}
            alt={asset.name}
          />
        ) : (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <VideoIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
          </Box>
        )}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            bgcolor: 'background.paper', 
            borderRadius: 1,
            px: 1,
            py: 0.5,
            fontSize: '0.75rem',
            fontWeight: 'medium',
            textTransform: 'uppercase',
            color: 'text.secondary',
            boxShadow: 1
          }}
        >
          {asset.type}
        </Box>
      </Box>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 0.5 }} noWrap>
          {asset.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} noWrap>
          {asset.description || 'No description'}
        </Typography>
        {asset.metadata?.tags && asset.metadata.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {asset.metadata.tags.slice(0, 3).map(tag => (
              <Chip 
                key={tag} 
                label={tag}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
    
  const clientTemplates = selectedClientId 
    ? templates.filter(template => template.client_id === selectedClientId)
    : templates;
  
  useEffect(() => {
    // Fetch clients data
    dispatch(fetchClients());
    
    // Fetch assets and templates without client filter initially
    dispatch(fetchAssets());
    dispatch(fetchTemplates());
  }, [dispatch]);
  
  // We no longer need to re-fetch assets when client selection changes
  // as DirectAssetDisplay handles this automatically
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleViewAssets = () => {
    navigate('/assets');
  };
  
  const handleViewTemplates = () => {
    navigate('/templates');
  };
  
  const handleViewCampaigns = () => {
    navigate('/campaigns');
  };
  
  const isLoading = clientsLoading || assetsLoading || templatesLoading;
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Client Dashboard
        </Typography>
        
        <Typography variant="body1" color="text.secondary">
          Manage your client's assets, templates, and campaigns from a single dashboard.
        </Typography>
      </Box>
      

      {selectedClient ? (
        <>
          {/* Client Information */}
          <Paper elevation={1} sx={{ p: 3, mb: 4, bgcolor: selectedClient.brandColour ? `${selectedClient.brandColour}10` : 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Client Logo */}
              <Box sx={{ 
                width: 100, 
                height: 100, 
                borderRadius: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'background.paper',
                mr: 3,
                border: '1px solid rgba(0,0,0,0.1)',
                padding: '10px',
                boxSizing: 'border-box'
              }}>
                {selectedClient.logoUrl ? (
                  <Box 
                    component="img"
                    src={selectedClient.logoUrl} 
                    alt={selectedClient.name} 
                    sx={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      objectFit: 'contain',
                      width: 'auto',
                      height: 'auto'
                    }}
                  />
                ) : (
                  <BusinessIcon sx={{ fontSize: 48, color: selectedClient.brandColour || 'primary.main' }} />
                )}
              </Box>
              
              {/* Client Details */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h5" component="h2">
                    {selectedClient.name}
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    size="small"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    Edit Client
                  </Button>
                </Box>
                
                {/* Description is not in the new Client type, so we'll show a placeholder */
                <Typography variant="body1" paragraph>
                  Client details and information
                </Typography>}
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  {selectedClient.brandColour && (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        bgcolor: selectedClient.brandColour,
                        border: '1px solid rgba(0,0,0,0.1)'
                      }} />
                      <Typography variant="body2">Primary Colour</Typography>
                    </Box>
                  )}
                  
                  {/* Secondary colour is stored in UI state but not in API type */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Box sx={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      bgcolor: '#000000', // Default value
                      border: '1px solid rgba(0,0,0,0.1)'
                    }} />
                    <Typography variant="body2">Secondary Colour</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
          
          {/* Client Content Tabs */}
          <Paper elevation={1} sx={{ mb: 4 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="client content tabs">
              <Tab label="Overview" />
              <Tab label="Assets" />
              <Tab label="Templates" />
              <Tab label="Campaigns" />
            </Tabs>
            
            {/* Overview Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <VideoIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Assets</Typography>
                      </Box>
                      <Typography variant="h4" component="div">
                        {clientAssetsCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total assets associated with this client
                      </Typography>
                    </CardContent>
                    <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                      <Button onClick={handleViewAssets} fullWidth>
                        View Assets
                      </Button>
                    </Box>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TemplateIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Templates</Typography>
                      </Box>
                      <Typography variant="h4" component="div">
                        {clientTemplates.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total templates associated with this client
                      </Typography>
                    </CardContent>
                    <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                      <Button onClick={handleViewTemplates} fullWidth>
                        View Templates
                      </Button>
                    </Box>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CampaignIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Campaigns</Typography>
                      </Box>
                      <Typography variant="h4" component="div">
                        {/* Add campaign count when available */}
                        0
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total campaigns associated with this client
                      </Typography>
                    </CardContent>
                    <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                      <Button onClick={handleViewCampaigns} fullWidth>
                        View Campaigns
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Assets Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Client Assets ({clientAssetsCount})
                </Typography>
                <Box>
                  <Button 
                    variant="outlined" 
                    onClick={() => navigate('/assets?upload=true')}
                    startIcon={<UploadIcon />}
                    sx={{ mr: 1 }}
                  >
                    Upload
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleViewAssets}
                    startIcon={<VideoIcon />}
                  >
                    All Assets
                  </Button>
                </Box>
              </Box>
              
              {/* Use the DirectAssetDisplay component that reliably loads assets */}
              <DirectAssetDisplay
                clientId={selectedClientId || undefined}
                renderAsset={renderAssetCard}
                noAssetsMessage="No assets found for this client"
                layout="grid"
                limit={6}
              />
              
              {clientAssetsCount > 6 && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button 
                    variant="outlined"
                    onClick={handleViewAssets}
                    sx={{ px: 3, py: 1 }}
                  >
                    View All {clientAssetsCount} Assets
                  </Button>
                </Box>
              )}
            </TabPanel>
            
            {/* Templates Tab */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Client Templates ({clientTemplates.length})
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={handleViewTemplates}
                  startIcon={<TemplateIcon />}
                >
                  All Templates
                </Button>
              </Box>
              
              {clientTemplates.length === 0 ? (
                <Typography variant="body1" color="text.secondary">
                  No templates found for this client. Create templates to get started.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {clientTemplates.slice(0, 6).map(template => (
                    <Grid item xs={12} sm={6} md={4} key={template.id}>
                      <Card>
                        <CardMedia
                          component="img"
                          height="140"
                          image={template.thumbnailUrl || '/placeholder-template.jpg'}
                          alt={template.name}
                        />
                        <CardContent>
                          <Typography variant="subtitle1" noWrap>
                            {template.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {template.description || 'No description'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              
              {clientTemplates.length > 6 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button 
                    variant="outlined"
                    onClick={handleViewTemplates}
                  >
                    View All {clientTemplates.length} Templates
                  </Button>
                </Box>
              )}
            </TabPanel>
            
            {/* Campaigns Tab */}
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Client Campaigns
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={handleViewCampaigns}
                  startIcon={<CampaignIcon />}
                >
                  All Campaigns
                </Button>
              </Box>
              
              <Typography variant="body1" color="text.secondary">
                No campaigns found for this client. Create campaigns to get started.
              </Typography>
            </TabPanel>
          </Paper>
        </>
      ) : (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
          <BusinessIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary' }} />
          <Typography variant="h5" gutterBottom>
            No Client Selected
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            Please select a client from the dropdown above to view their dashboard.
          </Typography>
        </Paper>
      )}

      {/* Client Edit Dialog */}
      {selectedClient && (
        <ClientDialog
          open={editDialogOpen}
          onClose={(clientUpdated) => {
            setEditDialogOpen(false);
            // Refresh the client list if a client was updated
            if (clientUpdated) {
              dispatch(fetchClients());
            }
          }}
          client={selectedClient}
          title="Edit Client"
        />
      )}
    </Box>
  );
};

export default ClientDashboardPage;
