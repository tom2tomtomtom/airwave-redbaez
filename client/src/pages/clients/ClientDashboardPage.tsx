import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Chip,
  Alert
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
import { useNavigate, useParams } from 'react-router-dom';
import { RootState, AppDispatch } from '../../store';
import { fetchClients } from '../../store/slices/clientSlice';
import { fetchTemplates, selectAllTemplates } from '../../store/slices/templatesSlice';
import ClientSelector from '../../components/clients/ClientSelector';
import ClientDialog from '../../components/clients/ClientDialog';
import { useClients } from '../../hooks/useClients';
import { Client as ApiClient } from '../../api/types/client.types';
import { Client as ReduxClient } from '../../types/client';
import { Asset } from '../../api/types/asset.types';
import { Template } from '../../types/templates';
import DirectAssetDisplay from '../../components/assets/DirectAssetDisplay';
import AssetList from '../../components/assets/AssetList';
import { useGetAssetsByClientSlugQuery } from '../../store/api/assetsApi';

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
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const {
    data: clientAssets,
    isLoading: assetsLoading,
    error: assetsError,
  } = useGetAssetsByClientSlugQuery({ slug: clientSlug || '' }, {
    skip: !clientSlug,
  });

  const { clients, selectedClientId, loading: clientsLoading } = useSelector((state: RootState) => state.clients);
  const templates = useSelector(selectAllTemplates);
  const { loading: templatesLoading } = useSelector((state: RootState) => state.templates);
  
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
  
  console.log('=== CLIENT DASHBOARD DEBUG ===');
  console.log('Client Slug from URL:', clientSlug);
  console.log('Selected client ID from Redux store:', selectedClientId);
  console.log('Number of clients available:', clients.length);
  console.log('Client IDs available:', clients.map(c => c.id));
  console.log('Client slugs available:', clients.map(c => c.slug));
  console.log('Selected client object found:', selectedClient);
  console.log('Total assets fetched via RTK Query:', clientAssets?.length);
  console.log('First few assets fetched:', clientAssets?.slice(0, 3));
  
  const clientTemplates = useMemo(() => selectedClientId 
    ? templates.filter((template: Template) => template.client_id === selectedClientId)
    : templates, [templates, selectedClientId]);
  
  useEffect(() => {
    if (clients.length === 0 && !clientsLoading) {
      dispatch(fetchClients());
    }
    if (templates.length === 0 && !templatesLoading) { 
      dispatch(fetchTemplates());
    }
  }, [dispatch, clients.length, clientsLoading, templates.length, templatesLoading]);
  
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
  
  const isLoading = clientsLoading || templatesLoading;
  
  const handleOpenEditDialog = () => {
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    // Optionally refetch client data after potential update
  };
  
  // Placeholder for asset selection handling
  const handleAssetSelect = (asset: Asset | null) => {
    console.log('Asset selected:', asset);
    // Implement navigation or display logic here if needed
  };

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
                    onClick={handleOpenEditDialog}
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
                        {clientAssets?.length}
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
              <Typography variant="h6" gutterBottom>Assets</Typography>
              {assetsLoading && <CircularProgress />}
              {assetsError && <Alert severity="error">Error loading assets: {JSON.stringify(assetsError)}</Alert>}
              <AssetList 
                assets={clientAssets || []} 
                isLoading={assetsLoading} 
                onAssetSelect={handleAssetSelect}
                initialType="all"
              />
            </TabPanel>
            
            {/* Templates Tab */}
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>Templates</Typography>
              {templatesLoading && <CircularProgress />}
              {clientTemplates.length === 0 ? (
                <Typography variant="body1" color="text.secondary">
                  No templates found for this client. Create templates to get started.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {clientTemplates.slice(0, 6).map((template: Template) => (
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
            </TabPanel>
            
            {/* Campaigns Tab */}
            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>Campaigns</Typography>
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
