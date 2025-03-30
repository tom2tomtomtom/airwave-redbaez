import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Container,
  Button, 
  CircularProgress,
  Alert,
  Divider,
  Grid,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  Login as LoginIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';
import ClientDialog from '../../components/clients/ClientDialog';
import ClientListSelector from '../../components/clients/ClientListSelector';
import { useClientContext } from '../../contexts/ClientContext';
import { Client } from '../../types/client';
import { ClientFilters } from '../../api/types/client.types';

const ClientSelectionPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  // Use the ClientContext instead of direct Redux access
  const { 
    clients, 
    selectedClient, 
    selectClient, 
    loading, 
    error, 
    refreshClients,
    getFilteredClients,
    createClient
  } = useClientContext();
  
  // UI state
  const [openClientDialog, setOpenClientDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Create filters object for the client context
  const filters: ClientFilters = useMemo(() => ({
    search: searchQuery,
    sortBy: sortField,
    sortDirection: sortDirection,
    status: statusFilter === 'all' ? undefined : statusFilter
  }), [searchQuery, sortField, sortDirection, statusFilter]);
  
  // Filtered clients based on current filters
  const filteredClients = useMemo(() => 
    getFilteredClients(filters),
  [getFilteredClients, filters]);
  
  // Load clients when component mounts
  useEffect(() => {
    if (isAuthenticated && !loading && clients.length === 0) {
      console.log('Loading clients on ClientSelectionPage mount');
      refreshClients(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
  
  // Handle navigation after client selection
  useEffect(() => {
    if (!selectedClient || clients.length === 0) return;
    
    // Get the stored 'from' location if available
    const state = location.state as { from?: { pathname: string } } | null;
    const fromPath = state?.from?.pathname;
    
    // If we have a stored destination, navigate there
    if (fromPath) {
      console.log('Returning to original location:', fromPath);
      navigate(fromPath, { replace: true });
    } else {
      // Otherwise go to dashboard
      console.log('No stored destination, going to dashboard');
      navigate('/client-dashboard', { replace: true });
    }
  }, [selectedClient, clients.length, navigate, location]);
  
  // If not authenticated, redirect to login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleCreateClientClick = useCallback(() => {
    setOpenClientDialog(true);
  }, []);

  const handleCloseClientDialog = useCallback((newClient?: Client) => {
    setOpenClientDialog(false);
    
    // If a client was created, refresh the client list
    if (newClient) {
      console.log('Client was created, refreshing client list...');
      refreshClients(filters);
      
      // Optionally select the newly created client
      if (newClient.id) {
        selectClient(newClient.id);
      }
    }
  }, [refreshClients, filters, selectClient]);
  
  const handleRetryLoad = () => {
    console.log('Retrying client loading');
    refreshClients(filters);
  };
  
  const handleClientSelected = (clientId: string) => {
    console.log('Client selected:', clientId);
    selectClient(clientId);
  };
  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleBackClick = () => {
    // If we have a from location, go back there
    const state = location.state as { from?: { pathname: string } } | null;
    if (state?.from) {
      navigate(-1); // Go back in history
    } else {
      navigate('/client-dashboard');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page header with back button */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        {selectedClient && (
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={handleBackClick}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
        )}
        <Typography variant="h4" component="h1">
          Client Selection
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Main content area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4, height: '100%', borderRadius: 2, boxShadow: 2 }}>
            {/* Error alerts */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                action={
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={handleRetryLoad}
                  >
                    Retry
                  </Button>
                }
              >
                Error loading clients: {error}
              </Alert>
            )}
            
            {/* Welcome area */}
            <Box 
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                mb: 4
              }}
            >
              <Box
                component="img"
                src="https://res.cloudinary.com/dkl8kiemy/image/upload/v1742859138/Digital_Video_Camera_Logo_erpcdq.png"
                alt="AIrWAVE Logo"
                sx={{ 
                  width: '240px',
                  height: 'auto',
                  mb: 3,
                  objectFit: 'contain'
                }}
              />
              <Typography variant="h5" gutterBottom>
                Welcome to AIrWAVE
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mb: 4 }}>
                Select a client to manage their content or create a new client to get started.
              </Typography>
            </Box>

            {/* Loading state */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading clients...</Typography>
              </Box>
            )}

            {/* Empty state */}
            {!loading && clients.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <BusinessIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>No Clients Found</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Create your first client to start generating content.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={handleCreateClientClick}
                  sx={{ mt: 2 }}
                >
                  Create New Client
                </Button>
              </Box>
            )}

            {/* Filter and sort controls */}
            {!loading && clients.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  {/* Search input */}
                  <TextField
                    placeholder="Search clients..."
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ flexGrow: 1, minWidth: '200px' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setSearchQuery('')}
                            edge="end"
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    }}
                  />
                  
                  {/* Status filter */}
                  <FormControl size="small" sx={{ minWidth: '120px' }}>
                    <InputLabel id="status-filter-label">Status</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      value={statusFilter}
                      label="Status"
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {/* Sort field selector */}
                  <FormControl size="small" sx={{ minWidth: '150px' }}>
                    <InputLabel id="sort-field-label">Sort By</InputLabel>
                    <Select
                      labelId="sort-field-label"
                      value={sortField}
                      label="Sort By"
                      onChange={(e) => setSortField(e.target.value)}
                    >
                      <MenuItem value="name">Name</MenuItem>
                      <MenuItem value="createdAt">Created Date</MenuItem>
                      <MenuItem value="updatedAt">Updated Date</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {/* Sort direction toggle */}
                  <Tooltip title={`Sort ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}>
                    <IconButton 
                      color="primary"
                      onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    >
                      <SortIcon sx={{ 
                        transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s'
                      }} />
                    </IconButton>
                  </Tooltip>
                  
                  {/* Reset filters button */}
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => {
                      setSearchQuery('');
                      setSortField('name');
                      setSortDirection('asc');
                      setStatusFilter('all');
                    }}
                    startIcon={<ClearIcon />}
                  >
                    Reset
                  </Button>
                </Box>
                
                {/* Active filters display */}
                {(searchQuery || statusFilter !== 'all') && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mr: 1 }}>
                      Active filters:
                    </Typography>
                    {searchQuery && (
                      <Chip 
                        size="small" 
                        label={`Search: ${searchQuery}`}
                        onDelete={() => setSearchQuery('')}
                      />
                    )}
                    {statusFilter !== 'all' && (
                      <Chip 
                        size="small" 
                        label={`Status: ${statusFilter}`}
                        onDelete={() => setStatusFilter('all')}
                      />
                    )}
                  </Box>
                )}
              </Box>
            )}
            
            {/* Client List */}
            {!loading && filteredClients.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Available Clients ({filteredClients.length})
                </Typography>
                <ClientListSelector 
                  clients={filteredClients}
                  vertical={true}
                  showSearch={false} // We have our own search functionality now
                  maxHeight={500}
                  onClientSelected={handleClientSelected}
                  onCreateClientClick={handleCreateClientClick}
                />
              </Box>
            )}
            
            {/* No results after filtering */}
            {!loading && clients.length > 0 && filteredClients.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FilterIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                <Typography variant="h6">No matching clients</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Try adjusting your filters to see more results
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Create New Client
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              Add a new client to start creating and managing content for them. Each client can have unique branding and content.
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<AddIcon />}
              onClick={handleCreateClientClick}
              sx={{ mt: 2 }}
            >
              Create New Client
            </Button>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" gutterBottom>
              Need Help?
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              View our documentation or contact support if you have any questions.
            </Typography>

            <Button
              variant="outlined"
              fullWidth
              sx={{ mb: 2 }}
              onClick={() => window.open('https://docs.airwave.ai', '_blank')}
            >
              View Documentation
            </Button>
            
            <Button
              variant="outlined"
              fullWidth
              onClick={() => window.open('mailto:support@airwave.ai')}
            >
              Contact Support
            </Button>
            
            <Divider sx={{ my: 4 }} />
            
            <Button
              variant="text"
              color="inherit"
              fullWidth
              startIcon={<LoginIcon />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Client creation dialog */}
      {openClientDialog && (
        <ClientDialog 
          open={true} 
          onClose={(client?: Client) => handleCloseClientDialog(client)} 
          title="Create New Client"
          onCreateClient={createClient} 
          useContext={true} // Flag to use ClientContext instead of direct API calls
        />
      )}
    </Container>
  );
};

export default ClientSelectionPage;
