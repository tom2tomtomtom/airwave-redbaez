import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  Movie as MovieIcon,
  Image as ImageIcon,
  Campaign as CampaignIcon,
  Add as AddIcon,
  BarChart as ChartIcon,
  DesignServices as TemplateIcon,
  FileDownload as ExportIcon
} from '@mui/icons-material';
import { RootState } from '../../store';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Mock data for dashboard - in production, this would come from API calls
  const stats = {
    assets: 42,
    campaigns: 5,
    templates: 12,
    exports: 28
  };
  
  const recentCampaigns = [
    { id: '1', name: 'Summer Collection Launch', client: 'Nike', date: '2025-05-01' },
    { id: '2', name: 'Holiday Promotion', client: 'Adidas', date: '2025-12-01' },
    { id: '3', name: 'Brand Awareness', client: 'Coca-Cola', date: '2025-07-15' }
  ];
  
  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/campaigns/new')}
        >
          New Campaign
        </Button>
      </Box>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: 140,
              bgcolor: 'primary.light',
              color: 'primary.contrastText'
            }}
          >
            <CampaignIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h5" component="div">
              {stats.campaigns}
            </Typography>
            <Typography variant="body2">Active Campaigns</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: 140,
            }}
          >
            <ImageIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
            <Typography variant="h5" component="div">
              {stats.assets}
            </Typography>
            <Typography variant="body2">Assets</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: 140,
            }}
          >
            <TemplateIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
            <Typography variant="h5" component="div">
              {stats.templates}
            </Typography>
            <Typography variant="body2">Templates</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: 140,
            }}
          >
            <ExportIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
            <Typography variant="h5" component="div">
              {stats.exports}
            </Typography>
            <Typography variant="body2">Exported Videos</Typography>
          </Paper>
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Campaigns
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              {recentCampaigns.map((campaign) => (
                <ListItem
                  key={campaign.id}
                  button
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  sx={{ mb: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <CampaignIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={campaign.name}
                    secondary={`${campaign.client} | ${new Date(campaign.date).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/campaigns')}
              >
                View All Campaigns
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Get Started
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Upload Assets
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add videos, images, and voiceovers to your asset library.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => navigate('/assets')}
                >
                  Go to Assets
                </Button>
              </CardActions>
            </Card>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Browse Templates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Explore available templates for different platforms.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => navigate('/templates')}
                >
                  View Templates
                </Button>
              </CardActions>
            </Card>
            
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Create a Campaign
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start generating multiple ad executions at scale.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => navigate('/campaigns/new')}
                >
                  New Campaign
                </Button>
              </CardActions>
            </Card>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;