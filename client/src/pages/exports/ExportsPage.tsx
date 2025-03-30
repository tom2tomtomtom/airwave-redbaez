import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Tabs, 
  Tab, 
  Button, 
  Card, 
  CardContent, 
  CardActions, 
  Chip, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  CircularProgress,
  Alert,
  SelectChangeEvent,
  Snackbar,
  IconButton
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import ShareIcon from '@mui/icons-material/Share';
import InfoIcon from '@mui/icons-material/Info';
import SendIcon from '@mui/icons-material/Send';

import { RootState, AppDispatch } from '../../store';
import { fetchCampaignExports, downloadExport } from '../../store/slices/exportsSlice';
import { selectAllCampaigns, fetchCampaigns } from '../../store/slices/campaignsSlice';
import { Campaign } from '../../types/campaigns';

import ExportDetailsDialog from '../../components/exports/ExportDetailsDialog';
import ExportToPlatformDialog from '../../components/exports/ExportToPlatformDialog';

const ExportsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { exports, loading, error } = useSelector((state: RootState) => state.exports);
  const campaigns = useSelector(selectAllCampaigns);
  
  const [tabValue, setTabValue] = useState(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // For dialogs
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<any>(null);

  useEffect(() => {
    dispatch(fetchCampaigns());
  }, [dispatch]);

  useEffect(() => {
    if (selectedCampaignId) {
      dispatch(fetchCampaignExports(selectedCampaignId));
    }
  }, [dispatch, selectedCampaignId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCampaignChange = (event: SelectChangeEvent<string>) => {
    setSelectedCampaignId(event.target.value);
  };

  const handlePlatformChange = (event: SelectChangeEvent<string>) => {
    setSelectedPlatform(event.target.value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleDownload = async (exportId: string) => {
    try {
      const resultAction = await dispatch(downloadExport(exportId));
      if (downloadExport.fulfilled.match(resultAction)) {
        const { url, filename } = resultAction.payload;
        
        // Create a temporary link element to trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setSnackbarMessage('Download started successfully');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Download failed:', error);
      setSnackbarMessage('Download failed. Please try again.');
      setSnackbarOpen(true);
    }
  };

  const handleShareLink = (exportUrl: string) => {
    navigator.clipboard.writeText(exportUrl)
      .then(() => {
        setSnackbarMessage('Link copied to clipboard');
        setSnackbarOpen(true);
      })
      .catch(() => {
        setSnackbarMessage('Failed to copy link');
        setSnackbarOpen(true);
      });
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  const handleOpenDetailsDialog = (exportItem: any) => {
    setSelectedExport(exportItem);
    setDetailsDialogOpen(true);
  };
  
  const handleOpenPlatformDialog = (exportItem: any) => {
    setSelectedExport(exportItem);
    setPlatformDialogOpen(true);
  };

  // Filter exports based on selected platform and search term
  const filteredExports = exports.filter(exportItem => {
    const matchesPlatform = selectedPlatform === 'all' || exportItem.platform === selectedPlatform;
    const matchesSearch = exportItem.format.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exportItem.platform.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  // Group exports by platform for the "By Platform" tab
  const groupedByPlatform: Record<string, typeof exports> = {};
  exports.forEach(exportItem => {
    if (!groupedByPlatform[exportItem.platform]) {
      groupedByPlatform[exportItem.platform] = [];
    }
    groupedByPlatform[exportItem.platform].push(exportItem);
  });

  // Get unique platforms for the filter dropdown
  const platforms = ['all', ...new Set(exports.map(exportItem => exportItem.platform))];

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Video Exports
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="campaign-select-label">Select Campaign</InputLabel>
              <Select
                labelId="campaign-select-label"
                value={selectedCampaignId}
                onChange={handleCampaignChange}
                label="Select Campaign"
              >
                <MenuItem value="">
                  <em>Select a campaign</em>
                </MenuItem>
                {campaigns.map((campaign: Campaign) => (
                  <MenuItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="platform-filter-label">Filter by Platform</InputLabel>
              <Select
                labelId="platform-filter-label"
                value={selectedPlatform}
                onChange={handlePlatformChange}
                label="Filter by Platform"
                startAdornment={<FilterListIcon sx={{ mr: 1 }} />}
              >
                {platforms.map(platform => (
                  <MenuItem key={platform} value={platform}>
                    {platform === 'all' ? 'All Platforms' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              label="Search exports"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </Grid>
        </Grid>
      </Paper>
      
      {selectedCampaignId ? (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="export tabs">
              <Tab label="All Exports" />
              <Tab label="By Platform" />
              <Tab label="Recent" />
            </Tabs>
          </Box>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : (
            <>
              {/* Tab 1: All Exports */}
              {tabValue === 0 && (
                <Grid container spacing={3}>
                  {filteredExports.length > 0 ? (
                    filteredExports.map(exportItem => (
                      <Grid item xs={12} sm={6} md={4} key={exportItem.id}>
                        <Card>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                              <Typography variant="h6" component="div">
                                {exportItem.format} Format
                              </Typography>
                              <Chip 
                                label={exportItem.platform.toUpperCase()} 
                                color="primary" 
                                size="small" 
                              />
                            </Box>
                            
                            <Typography color="text.secondary" gutterBottom>
                              Created: {new Date(exportItem.createdAt).toLocaleDateString()}
                            </Typography>
                            
                            <Typography variant="body2">
                              Status: {exportItem.status.charAt(0).toUpperCase() + exportItem.status.slice(1)}
                            </Typography>
                          </CardContent>
                          <CardActions sx={{ justifyContent: 'space-between' }}>
                            <Box>
                              <IconButton 
                                size="small" 
                                onClick={() => handleOpenDetailsDialog(exportItem)}
                                title="View details"
                              >
                                <InfoIcon fontSize="small" />
                              </IconButton>
                              <Button 
                                size="small" 
                                startIcon={<CloudDownloadIcon />}
                                onClick={() => handleDownload(exportItem.id)}
                              >
                                Download
                              </Button>
                              <Button 
                                size="small"
                                startIcon={<ShareIcon />}
                                onClick={() => handleShareLink(exportItem.url)}
                              >
                                Share
                              </Button>
                            </Box>
                            <Button 
                              size="small"
                              startIcon={<SendIcon />}
                              onClick={() => handleOpenPlatformDialog(exportItem)}
                              color="primary"
                            >
                              Post
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        No exports found matching your filters.
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              )}
              
              {/* Tab 2: By Platform */}
              {tabValue === 1 && (
                <Box>
                  {Object.keys(groupedByPlatform).length > 0 ? (
                    Object.entries(groupedByPlatform).map(([platform, platformExports]) => (
                      <Box key={platform} sx={{ mb: 4 }}>
                        <Typography variant="h5" component="h2" gutterBottom>
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </Typography>
                        <Grid container spacing={3}>
                          {platformExports.map(exportItem => (
                            <Grid item xs={12} sm={6} md={4} key={exportItem.id}>
                              <Card>
                                <CardContent>
                                  <Typography variant="h6" component="div">
                                    {exportItem.format} Format
                                  </Typography>
                                  <Typography color="text.secondary" gutterBottom>
                                    Created: {new Date(exportItem.createdAt).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="body2">
                                    Status: {exportItem.status.charAt(0).toUpperCase() + exportItem.status.slice(1)}
                                  </Typography>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'space-between' }}>
                                  <Box>
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleOpenDetailsDialog(exportItem)}
                                      title="View details"
                                    >
                                      <InfoIcon fontSize="small" />
                                    </IconButton>
                                    <Button 
                                      size="small" 
                                      startIcon={<CloudDownloadIcon />}
                                      onClick={() => handleDownload(exportItem.id)}
                                    >
                                      Download
                                    </Button>
                                  </Box>
                                  <Button 
                                    size="small"
                                    startIcon={<SendIcon />}
                                    onClick={() => handleOpenPlatformDialog(exportItem)}
                                    color="primary"
                                  >
                                    Post
                                  </Button>
                                </CardActions>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    ))
                  ) : (
                    <Alert severity="info">
                      No exports found. Generate some exports first.
                    </Alert>
                  )}
                </Box>
              )}
              
              {/* Tab 3: Recent */}
              {tabValue === 2 && (
                <Grid container spacing={3}>
                  {filteredExports.length > 0 ? (
                    [...filteredExports]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 9) // Take only the 9 most recent
                      .map(exportItem => (
                        <Grid item xs={12} sm={6} md={4} key={exportItem.id}>
                          <Card>
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6" component="div">
                                  {exportItem.format} Format
                                </Typography>
                                <Chip 
                                  label={exportItem.platform.toUpperCase()} 
                                  color="primary" 
                                  size="small" 
                                />
                              </Box>
                              
                              <Typography color="text.secondary" gutterBottom>
                                Created: {new Date(exportItem.createdAt).toLocaleDateString()}
                              </Typography>
                              
                              <Typography variant="body2">
                                Status: {exportItem.status.charAt(0).toUpperCase() + exportItem.status.slice(1)}
                              </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'space-between' }}>
                              <Box>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleOpenDetailsDialog(exportItem)}
                                  title="View details"
                                >
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                                <Button 
                                  size="small" 
                                  startIcon={<CloudDownloadIcon />}
                                  onClick={() => handleDownload(exportItem.id)}
                                >
                                  Download
                                </Button>
                              </Box>
                              <Button 
                                size="small"
                                startIcon={<SendIcon />}
                                onClick={() => handleOpenPlatformDialog(exportItem)}
                                color="primary"
                              >
                                Post
                              </Button>
                            </CardActions>
                          </Card>
                        </Grid>
                      ))
                  ) : (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        No recent exports found.
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              )}
            </>
          )}
        </>
      ) : (
        <Alert severity="info">
          Please select a campaign to view its exports.
        </Alert>
      )}
      
      {/* Details Dialog */}
      <ExportDetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        exportItem={selectedExport}
        onDownload={handleDownload}
        onShare={handleShareLink}
      />
      
      {/* Export to Platform Dialog */}
      <ExportToPlatformDialog
        open={platformDialogOpen}
        onClose={() => setPlatformDialogOpen(false)}
        campaignId={selectedCampaignId}
        exportItems={exports}
      />
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default ExportsPage;
