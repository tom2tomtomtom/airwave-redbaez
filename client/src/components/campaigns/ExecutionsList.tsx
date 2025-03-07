import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PreviewIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/GetApp';

interface ExecutionsListProps {
  campaignId: string;
}

interface Execution {
  id: string;
  name: string;
  status: string;
  preview_url?: string;
  final_url?: string;
  created_at: string;
  updated_at: string;
}

const ExecutionsList: React.FC<ExecutionsListProps> = ({ campaignId }) => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulated fetch of executions for the campaign
    const fetchExecutions = async () => {
      setLoading(true);
      try {
        // In a real implementation, this would be an API call
        // const response = await api.get(`/campaigns/${campaignId}/executions`);
        // setExecutions(response.data);
        
        // Mock data for demonstration
        setTimeout(() => {
          setExecutions([
            {
              id: '1',
              name: 'Instagram Story',
              status: 'completed',
              preview_url: 'https://example.com/preview1',
              final_url: 'https://example.com/final1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '2',
              name: 'YouTube Video',
              status: 'in_progress',
              preview_url: 'https://example.com/preview2',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '3',
              name: 'Facebook Ad',
              status: 'draft',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Failed to load executions');
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [campaignId]);

  const handleCreateExecution = () => {
    // Implementation for creating a new execution
    console.log('Create execution for campaign:', campaignId);
  };

  const handlePreview = (executionId: string, previewUrl?: string) => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    } else {
      console.log('No preview available for execution:', executionId);
    }
  };

  const handleDownload = (executionId: string, finalUrl?: string) => {
    if (finalUrl) {
      window.open(finalUrl, '_blank');
    } else {
      console.log('No final URL available for execution:', executionId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error">
        {error}
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Executions
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateExecution}
        >
          New Execution
        </Button>
      </Box>

      {executions.length === 0 ? (
        <Typography sx={{ p: 2 }}>
          No executions found for this campaign. Create your first execution to get started.
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {executions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>{execution.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={execution.status} 
                      size="small"
                      color={getStatusColor(execution.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(execution.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {new Date(execution.updated_at).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<PreviewIcon />}
                      onClick={() => handlePreview(execution.id, execution.preview_url)}
                      disabled={!execution.preview_url}
                      sx={{ mr: 1 }}
                    >
                      Preview
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(execution.id, execution.final_url)}
                      disabled={!execution.final_url}
                      variant="outlined"
                    >
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ExecutionsList;
