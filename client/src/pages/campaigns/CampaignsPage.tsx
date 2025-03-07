import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  IconButton,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { RootState } from '../../store';
import { fetchCampaigns, deleteCampaign } from '../../store/slices/campaignsSlice';
import PageHeader from '../../components/layout/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { campaigns, loading, error } = useSelector((state: RootState) => state.campaigns);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

  useEffect(() => {
    // @ts-ignore
    dispatch(fetchCampaigns());
  }, [dispatch]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleCreateClick = () => {
    navigate('/campaigns/create');
  };

  const handleEditClick = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  const handleDeleteClick = (campaignId: string) => {
    setCampaignToDelete(campaignId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (campaignToDelete) {
      // @ts-ignore
      dispatch(deleteCampaign(campaignToDelete));
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setCampaignToDelete(null);
  };

  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (campaign.client && campaign.client.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (campaign.description && campaign.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && campaigns.length === 0) {
    return <LoadingScreen message="Loading campaigns..." />;
  }

  return (
    <Box sx={{ padding: 3 }}>
      <PageHeader 
        title="Campaigns" 
        description="Create and manage your campaigns"
        actionButton={
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
          >
            Create Campaign
          </Button>
        }
      />

      {error && (
        <Typography color="error" sx={{ my: 2 }}>
          Error loading campaigns: {error}
        </Typography>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search campaigns..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {filteredCampaigns.length === 0 ? (
          <Grid item xs={12}>
            <Typography align="center" sx={{ my: 4 }}>
              No campaigns found. Create your first campaign to get started.
            </Typography>
          </Grid>
        ) : (
          filteredCampaigns.map(campaign => (
            <Grid item xs={12} sm={6} md={4} key={campaign.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {campaign.name}
                  </Typography>
                  {campaign.client && (
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Client: {campaign.client}
                    </Typography>
                  )}
                  {campaign.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {campaign.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    {campaign.platforms && campaign.platforms.map(platform => (
                      <Chip 
                        key={platform} 
                        label={platform} 
                        size="small" 
                        variant="outlined" 
                      />
                    ))}
                  </Box>
                  <Chip 
                    label={campaign.status || 'draft'} 
                    size="small"
                    color={campaign.status === 'active' ? 'success' : 'default'}
                  />
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleEditClick(campaign.id)}
                    aria-label="edit"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteClick(campaign.id)}
                    aria-label="delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Campaign"
        content="Are you sure you want to delete this campaign? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </Box>
  );
};

export default CampaignsPage;
