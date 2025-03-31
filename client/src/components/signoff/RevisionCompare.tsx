// client/src/components/signoff/RevisionCompare.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  useTheme,
  Tooltip,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import { format } from 'date-fns';
import axios from 'axios';

export interface Revision {
  id: string;
  assetId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  description: string;
  changeLog: string[];
  previousVersionId: string | null;
  metadata: any;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'revised';
}

export interface RevisionComparison {
  fromRevision: Revision;
  toRevision: Revision;
  differences: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}

interface RevisionCompareProps {
  assetId: string;
  revisions: Revision[];
  onVersionSelect?: (revisionId: string) => void;
}

const RevisionCompare: React.FC<RevisionCompareProps> = ({
  assetId,
  revisions,
  onVersionSelect,
}) => {
  const theme = useTheme();
  const [fromRevisionId, setFromRevisionId] = useState<string>('');
  const [toRevisionId, setToRevisionId] = useState<string>('');
  const [comparison, setComparison] = useState<RevisionComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Set default revisions to compare when the component loads
  useEffect(() => {
    if (revisions.length >= 2) {
      // Set from revision to second most recent and to revision to most recent
      const sortedRevisions = [...revisions].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setFromRevisionId(sortedRevisions[1].id);
      setToRevisionId(sortedRevisions[0].id);
    } else if (revisions.length === 1) {
      // If there's only one revision, set both to the same (will show everything as added)
      setToRevisionId(revisions[0].id);
    }
  }, [revisions]);

  // Fetch comparison data when revisions are selected
  useEffect(() => {
    const fetchComparison = async () => {
      if (!fromRevisionId || !toRevisionId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/revisions/compare?from=${fromRevisionId}&to=${toRevisionId}`);
        setComparison(response.data.data);
      } catch (err: any) {
        console.error('Error fetching revision comparison:', err);
        setError(err.response?.data?.message || 'Failed to fetch comparison data');
        setComparison(null);
      } finally {
        setLoading(false);
      }
    };
    
    if (fromRevisionId && toRevisionId) {
      fetchComparison();
    }
  }, [fromRevisionId, toRevisionId]);

  const formatFieldName = (path: string): string => {
    // Convert camelCase and dot notation to readable format
    // e.g. "content.copy.callToAction" => "Content Copy Call To Action"
    return path
      .split('.')
      .map(part => 
        part
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
      )
      .join(' › ');
  };

  const handleFromRevisionChange = (event: any) => {
    setFromRevisionId(event.target.value);
  };

  const handleToRevisionChange = (event: any) => {
    setToRevisionId(event.target.value);
  };

  const handleSelectVersion = (revisionId: string) => {
    if (onVersionSelect) {
      onVersionSelect(revisionId);
    }
  };

  // Find revision by ID
  const findRevision = (id: string): Revision | undefined => {
    return revisions.find(rev => rev.id === id);
  };

  // Get comparison summary text
  const getComparisonSummary = (): string => {
    if (!comparison) return '';
    
    const { added, removed, modified } = comparison.differences;
    const total = added.length + removed.length + modified.length;
    
    if (total === 0) {
      return 'No differences found';
    }
    
    return `${total} difference${total !== 1 ? 's' : ''} found (${added.length} addition${added.length !== 1 ? 's' : ''}, ${removed.length} removal${removed.length !== 1 ? 's' : ''}, ${modified.length} modification${modified.length !== 1 ? 's' : ''})`;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <CompareArrowsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Version Comparison
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="from-revision-label">From Version</InputLabel>
              <Select
                labelId="from-revision-label"
                value={fromRevisionId}
                label="From Version"
                onChange={handleFromRevisionChange}
              >
                {revisions.map((revision) => (
                  <MenuItem key={`from-${revision.id}`} value={revision.id}>
                    V{revision.versionNumber} - {format(new Date(revision.createdAt), 'PPP')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="to-revision-label">To Version</InputLabel>
              <Select
                labelId="to-revision-label"
                value={toRevisionId}
                label="To Version"
                onChange={handleToRevisionChange}
              >
                {revisions.map((revision) => (
                  <MenuItem key={`to-${revision.id}`} value={revision.id}>
                    V{revision.versionNumber} - {format(new Date(revision.createdAt), 'PPP')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {/* Version Details */}
        {fromRevisionId && toRevisionId && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              {findRevision(fromRevisionId) && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Version {findRevision(fromRevisionId)?.versionNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Created {format(new Date(findRevision(fromRevisionId)?.createdAt || ''), 'PPp')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    By {findRevision(fromRevisionId)?.createdBy.name}
                  </Typography>
                  <Chip 
                    label={findRevision(fromRevisionId)?.reviewStatus === 'approved' ? 'Approved' : 
                           findRevision(fromRevisionId)?.reviewStatus === 'rejected' ? 'Rejected' : 'Pending'}
                    color={findRevision(fromRevisionId)?.reviewStatus === 'approved' ? 'success' : 
                          findRevision(fromRevisionId)?.reviewStatus === 'rejected' ? 'error' : 'default'}
                    size="small"
                  />
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} sm={6}>
              {findRevision(toRevisionId) && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Version {findRevision(toRevisionId)?.versionNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Created {format(new Date(findRevision(toRevisionId)?.createdAt || ''), 'PPp')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    By {findRevision(toRevisionId)?.createdBy.name}
                  </Typography>
                  <Chip 
                    label={findRevision(toRevisionId)?.reviewStatus === 'approved' ? 'Approved' : 
                           findRevision(toRevisionId)?.reviewStatus === 'rejected' ? 'Rejected' : 'Pending'}
                    color={findRevision(toRevisionId)?.reviewStatus === 'approved' ? 'success' : 
                          findRevision(toRevisionId)?.reviewStatus === 'rejected' ? 'error' : 'default'}
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ ml: 2 }}
                    onClick={() => handleSelectVersion(toRevisionId)}
                  >
                    View This Version
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        )}
        
        {/* Change Description */}
        {toRevisionId && findRevision(toRevisionId)?.description && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Change Description:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="body2">
                {findRevision(toRevisionId)?.description}
              </Typography>
            </Paper>
          </Box>
        )}
        
        {/* Comparison Results */}
        <Typography variant="subtitle1" gutterBottom>
          {loading ? 'Loading comparison...' : getComparisonSummary()}
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        ) : comparison ? (
          <>
            {/* Additions */}
            {comparison.differences.added.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.success.main }}>
                  <AddIcon sx={{ verticalAlign: 'middle', fontSize: 20, mr: 0.5 }} />
                  Additions ({comparison.differences.added.length})
                </Typography>
                <List dense>
                  {comparison.differences.added.map((path) => (
                    <ListItem key={`added-${path}`}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <AddIcon sx={{ color: theme.palette.success.main }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={formatFieldName(path)}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {/* Removals */}
            {comparison.differences.removed.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.error.main }}>
                  <RemoveIcon sx={{ verticalAlign: 'middle', fontSize: 20, mr: 0.5 }} />
                  Removals ({comparison.differences.removed.length})
                </Typography>
                <List dense>
                  {comparison.differences.removed.map((path) => (
                    <ListItem key={`removed-${path}`}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <RemoveIcon sx={{ color: theme.palette.error.main }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={formatFieldName(path)}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {/* Modifications */}
            {comparison.differences.modified.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.warning.main }}>
                  <EditIcon sx={{ verticalAlign: 'middle', fontSize: 20, mr: 0.5 }} />
                  Modifications ({comparison.differences.modified.length})
                </Typography>
                <List dense>
                  {comparison.differences.modified.map((path) => (
                    <ListItem key={`modified-${path}`}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <EditIcon sx={{ color: theme.palette.warning.main }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={formatFieldName(path)}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {comparison.differences.added.length === 0 && 
             comparison.differences.removed.length === 0 && 
             comparison.differences.modified.length === 0 && (
              <Alert severity="info">
                <AlertTitle>No Changes</AlertTitle>
                These versions appear to be identical.
              </Alert>
            )}
          </>
        ) : (
          <Alert severity="info">
            <AlertTitle>Select Versions</AlertTitle>
            Please select two versions to compare.
          </Alert>
        )}
      </Paper>
      
      {/* Version History */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Version History
        </Typography>
        
        <List>
          {revisions
            .sort((a, b) => b.versionNumber - a.versionNumber)
            .map((revision) => (
              <React.Fragment key={revision.id}>
                <ListItem
                  secondaryAction={
                    <Tooltip title="View this version">
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => handleSelectVersion(revision.id)}
                      >
                        View
                      </Button>
                    </Tooltip>
                  }
                >
                  <ListItemIcon>
                    <Chip 
                      label={`V${revision.versionNumber}`}
                      color="primary"
                      variant="outlined"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {format(new Date(revision.createdAt), 'PPp')}
                        </Typography>
                        <Chip 
                          label={revision.reviewStatus === 'approved' ? 'Approved' : 
                                revision.reviewStatus === 'rejected' ? 'Rejected' : 'Pending'}
                          color={revision.reviewStatus === 'approved' ? 'success' : 
                                revision.reviewStatus === 'rejected' ? 'error' : 'default'}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" component="span">
                          {revision.description || 'No description provided'}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Created by {revision.createdBy.name}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
        </List>
      </Paper>
    </Box>
  );
};

export default RevisionCompare;
