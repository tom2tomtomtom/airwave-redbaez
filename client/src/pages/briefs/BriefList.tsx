import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { RootState } from '../../store';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Upload as UploadIcon, Psychology as StrategyIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AppDispatch } from '../../store';
import {
  Brief,
  BriefFilters,
  fetchBriefs,
  selectAllBriefs,
  selectBriefsLoading,
  selectBriefsTotalCount,
} from '../../store/slices/briefsSlice';

const BriefList: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const briefs = useSelector(selectAllBriefs);
  const loading = useSelector(selectBriefsLoading);
  const totalCount = useSelector(selectBriefsTotalCount);
  
  // Get the selected client from Redux store
  const { clients, selectedClientId } = useSelector((state: RootState) => state.clients);
  const selectedClient = clients.find(client => client.id === selectedClientId);

  const { user, organisation } = useAuth();

  const [filters, setFilters] = useState<BriefFilters>({
    limit: 10,
    offset: 0,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Only fetch briefs if we have both organisation and client
    if (organisation?.id && selectedClientId) {
      // Fetch briefs with both organisation ID and client ID
      dispatch(fetchBriefs({ 
        organisationId: organisation.id,
        clientId: selectedClientId,
        ...filters 
      }));
    }
  }, [dispatch, filters, organisation?.id, selectedClientId]);

  const handleSearch = () => {
    setFilters((prev) => ({
      ...prev,
      searchTerm,
      offset: 0, // Reset pagination when searching
    }));
  };

  const handleCreateBrief = () => {
    navigate('/briefs/create');
  };

  const handleBriefClick = (briefId: string) => {
    navigate(`/briefs/${briefId}`);
  };

  const getBriefStatusColour = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return theme.palette.info.main;
      case 'analysing':
        return theme.palette.warning.main;
      case 'ready':
        return theme.palette.success.main;
      case 'archived':
        return theme.palette.grey[500];
      default:
        return theme.palette.primary.main;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1">
            Strategy
          </Typography>
          {selectedClient && (
            <Typography variant="subtitle1" color="text.secondary">
              Client: {selectedClient.name}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<StrategyIcon />}
            onClick={() => navigate('/briefs/strategy-development')}
          >
            Strategy Development
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateBrief}
          >
            Create Brief
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          placeholder="Search briefs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: (
              <IconButton onClick={handleSearch}>
                <SearchIcon />
              </IconButton>
            ),
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {briefs.map((brief: Brief) => (
          <Grid item xs={12} key={brief.id}>
            <Card
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out',
                },
              }}
              onClick={() => handleBriefClick(brief.id)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {brief.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 2,
                      }}
                    >
                      {brief.content}
                    </Typography>
                  </Box>
                  <Chip
                    label={brief.status.replace('_', ' ').toUpperCase()}
                    sx={{
                      backgroundColor: getBriefStatusColour(brief.status),
                      color: 'white',
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {brief.tags?.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ backgroundColor: theme.palette.grey[200] }}
                      />
                    ))}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Created: {formatDate(brief.createdAt)}
                  </Typography>
                </Box>

                {brief.analysis && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Key Insights and Recommendations:
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {brief.analysis_results?.key_themes?.join(', ') || 'No insights available'}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Typography>Loading briefs...</Typography>
        </Box>
      )}

      {!loading && briefs.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No briefs found
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateBrief}
          >
            Create your first brief
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default BriefList;
