import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Typography,
  CircularProgress,
  FormControlLabel,
  Switch,
  InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ColorPicker from '../clients/ColorPicker';
import { Client } from '../../api/types/client.types';
import { useClients } from '../../hooks/useClients';

interface ClientDialogProps {
  open: boolean;
  onClose: (clientCreated?: boolean) => void;
  client?: Client | null;
  title: string;
}

// Extended client data with UI-specific properties
interface ClientFormData {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  brandColour: string;
  secondaryColour: string; // UI field that doesn't exist in API
  description: string;     // UI field that doesn't exist in API
  isActive: boolean;       // Maps to status in API
  clientId?: string;      // May be needed for API
  logo?: File | null;     // For file uploads
}

const ClientDialog: React.FC<ClientDialogProps> = ({ open, onClose, client, title }) => {
  // Use our client service hook instead of Redux
  const { loading, createOrUpdateClient } = useClients();
  
  const [formData, setFormData] = useState<ClientFormData>({
    id: '',
    slug: '',
    name: '',
    logoUrl: '',
    brandColour: '#FFFFFF',
    secondaryColour: '#000000',
    description: '',
    isActive: true,
    clientId: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Reset form when dialog opens with client data
    if (client) {
      // Convert from API client type to form data
      setFormData({
        id: client.id || '',
        clientId: client.id || '', // Use id as clientId if not provided
        slug: client.slug || '',
        name: client.name || '',
        logoUrl: client.logoUrl || '',
        brandColour: client.brandColour || '#FFFFFF',
        secondaryColour: '#000000', // Default value
        description: '', // Default empty description
        // Map API status to UI isActive
        isActive: client.status === 'active',
      });
    } else {
      // Reset form for new client
      setFormData({
        id: '',
        clientId: '',
        slug: '',
        name: '',
        logoUrl: '',
        brandColour: '#FFFFFF',
        secondaryColour: '#000000',
        description: '',
        isActive: true,
      });
    }
    setErrors({});
  }, [client, open]);
  
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }
    
    if (formData.logoUrl && !/^https?:\/\/.*/.test(formData.logoUrl)) {
      newErrors.logoUrl = 'Logo URL must be a valid URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.name, formData.logoUrl]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);
  
  const handleColorChange = useCallback((color: string, field: 'brandColour' | 'secondaryColour') => {
    setFormData(prev => ({
      ...prev,
      [field]: color
    }));
  }, []);
  
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;
    
    try {
      // Construct a Client object from form data
      const clientData: Client = {
        id: formData.id,
        name: formData.name,
        slug: formData.slug,
        logoUrl: formData.logoUrl,
        brandColour: formData.brandColour,
        // Convert UI-specific fields to match our API types
        status: formData.isActive ? 'active' : 'inactive'
      };

      // Create or update using our client service
      console.log(`${client ? 'Updating' : 'Creating'} client with data:`, clientData);
      
      try {
        await createOrUpdateClient(clientData);
        console.log('Client saved successfully');
        onClose(true);
      } catch (serviceError: any) {
        // Handle validation errors from the service
        if (serviceError.errors) {
          const newErrors: Record<string, string> = {};
          Object.entries(serviceError.errors).forEach(([key, message]) => {
            newErrors[key] = message as string;
          });
          setErrors(newErrors);
        }
      }
    } catch (error) {
      console.error('Error saving client:', error);
    }
  }, [validateForm, client, formData, onClose, createOrUpdateClient]);
  
  // Remove all console logs that could cause re-renders
  
  return (
    <Dialog 
      open={open} 
      onClose={(event, reason) => {
        // Only close on explicit user action (not programmatic)
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          onClose();
        }
      }} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <IconButton edge="end" onClick={(e) => onClose()} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box component="form" noValidate sx={{ mt: 1 }} autoComplete="off">
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Client Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            autoFocus
          />
          
          <TextField
            margin="normal"
            fullWidth
            id="logoUrl"
            label="Logo URL"
            name="logoUrl"
            value={formData.logoUrl}
            onChange={handleChange}
            error={!!errors.logoUrl}
            helperText={errors.logoUrl}
            placeholder="https://example.com/logo.png"
          />
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              margin="normal"
              fullWidth
              id="brandColour"
              label="Primary Colour"
              name="brandColour"
              value={formData.brandColour}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ColorPicker 
                      color={formData.brandColour || '#FFFFFF'} 
                      onChange={(color: string) => handleColorChange(color, 'brandColour')} 
                    />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="secondaryColour"
              label="Secondary Colour"
              name="secondaryColour"
              value={formData.secondaryColour}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ColorPicker 
                      color={formData.secondaryColour || '#000000'} 
                      onChange={(color: string) => handleColorChange(color, 'secondaryColour')} 
                    />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <TextField
            margin="normal"
            fullWidth
            id="description"
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={3}
          />
          
          {client && (
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.isActive}
                  onChange={handleChange}
                  name="isActive"
                />
              }
              label="Active"
              sx={{ mt: 2 }}
            />
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={(e) => onClose()} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disableElevation
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          {client ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(ClientDialog);
