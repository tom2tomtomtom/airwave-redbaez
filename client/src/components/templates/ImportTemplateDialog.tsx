import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { fetchTemplates } from '../../store/slices/templatesSlice';
import { AppDispatch } from '../../store';
import { supabase } from '../../lib/supabase';

interface ImportTemplateDialogProps {
  open: boolean;
  onClose: () => void;
}

// Helper function to get the current Supabase token
const getAuthToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || localStorage.getItem('airwave_auth_token');
};

const ImportTemplateDialog: React.FC<ImportTemplateDialogProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [format, setFormat] = useState('square');

  const handleImport = async () => {
    if (!templateId.trim()) {
      setError('Please enter a valid Creatomate template ID');
      return;
    }

    if (!templateName.trim()) {
      setError('Please enter a name for this template');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.post('/api/templates/import-by-id', 
        {
          creatomateTemplateId: templateId,
          name: templateName,
          format: format
        }, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setSuccess(true);
      dispatch(fetchTemplates()); // Refresh the templates list
      
      // Clear form after successful import
      setTemplateId('');
      setTemplateName('');
      
      // Close dialog after short delay
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import template. Please check the template ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTemplateId('');
      setTemplateName('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
        }
      }}
    >
      <DialogTitle>
        <Typography variant="h6">Import Creatomate Template</Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Template imported successfully!
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" paragraph>
            Enter the ID of your Creatomate template to import it into the system.
          </Typography>

          <TextField
            label="Creatomate Template ID"
            fullWidth
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            margin="normal"
            variant="outlined"
            disabled={loading}
            placeholder="e.g., abcd1234-5678-efgh-9101"
            helperText="This is the unique identifier for your template in Creatomate"
          />
          
          <TextField
            label="Template Name"
            fullWidth
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            margin="normal"
            variant="outlined"
            disabled={loading}
            placeholder="e.g., My Marketing Template"
            helperText="Enter a descriptive name for this template"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="format-select-label">Format</InputLabel>
            <Select
              labelId="format-select-label"
              value={format}
              label="Format"
              onChange={(e) => setFormat(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="square">Square (1:1)</MenuItem>
              <MenuItem value="portrait">Portrait (4:5)</MenuItem>
              <MenuItem value="landscape">Landscape (16:9)</MenuItem>
              <MenuItem value="story">Story (9:16)</MenuItem>
            </Select>
            <FormHelperText>Select the aspect ratio of this template</FormHelperText>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Importing...' : 'Import Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportTemplateDialog;
