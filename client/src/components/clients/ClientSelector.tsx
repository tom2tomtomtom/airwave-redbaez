import React, { useEffect, useState } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Tooltip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Menu,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Business as BusinessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
// Import from new client types and hooks
import { Client } from '../../api/types/client.types';
import { useClients } from '../../hooks/useClients';
import ClientDialog from './ClientDialog';

// Fallback client ID for situations where no client is available
const FALLBACK_CLIENT_ID = 'fe418478-806e-411a-ad0b-1b9a537a8081';

// Custom styled component for client logos and colours
export const ClientLogo = ({ client, large = false }: { client: Client, large?: boolean }) => {
  const size = large ? 50 : 40;
  
  if (client.logoUrl) {
    return (
      <Box 
        sx={{ 
          width: size, 
          height: size, 
          borderRadius: '8px', 
          mr: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          padding: '4px',
          boxSizing: 'border-box'
        }}
      >
        <Box
          component="img" 
          src={client.logoUrl} 
          alt={client.name}
          sx={{ 
            maxWidth: '90%', 
            maxHeight: '90%', 
            objectFit: 'contain'
          }}
        />
      </Box>
    );
  }

  // Fallback to colour dot if no logo
  return (
    <Box 
      sx={{ 
        width: size, 
        height: size, 
        borderRadius: '8px', 
        backgroundColor: client.brandColour || '#4285F4',
        mr: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <Typography sx={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: large ? '1.2rem' : '1rem' }}>
        {client.name.substring(0, 2).toUpperCase()}
      </Typography>
    </Box>
  );
};

interface ClientSelectorProps {
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  onSelect?: () => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  fullWidth = false, 
  size = 'medium',
  onSelect
}) => {
  // Use our custom hook instead of Redux
  const { 
    clients, 
    selectedClientId, 
    selectedClient: currentClient,
    loading, 
    selectClient,
    clearSelectedClient,
    loadClients
  } = useClients();
  
  // Dialog states
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [clientForMenu, setClientForMenu] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientsLoaded, setClientsLoaded] = useState(false);

  // Log clients on component mount and whenever clients change
  useEffect(() => {
    console.log('📊 ClientSelector - Clients state:', {
      clientsCount: clients.length,
      clientsEmpty: clients.length === 0,
      firstClientId: clients.length > 0 ? clients[0]?.id : 'none',
      selectedClientId,
      isCurrentClientNull: currentClient === null
    });
    
    // Check if we have any clients but no selected client
    if (clients.length > 0 && !selectedClientId) {
      console.warn('⚠️ ClientSelector - We have clients but no selected client!');
      
      // Use first available client as default selection
      if (clients.length > 0) {
        console.log('🔄 ClientSelector - Auto-selecting first client:', clients[0].id);
        selectClient(clients[0].id);
      }
    }
    
    // Mark clients as loaded when we get them
    if (clients.length > 0 && !clientsLoaded) {
      setClientsLoaded(true);
    }
  }, [clients, selectedClientId, currentClient, selectClient, clientsLoaded]);

  // Load clients on initial mount
  useEffect(() => {
    console.log('🔄 ClientSelector - Component mounted - checking client state:', {
      existingClients: clients.length,
      loading
    });
    
    // Only fetch if we don't already have clients and aren't currently loading
    if (clients.length === 0 && !loading && !clientsLoaded) {
      console.log('🔄 ClientSelector - No clients found, initiating fetch...');
      loadClients();
    }
  }, [clients.length, loading, loadClients, clientsLoaded]);

  const handleClientChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    // Parse the value to ensure we're handling it correctly
    if (value === 'all') {
      // If 'all' is selected, clear the selected client
      clearSelectedClient();
    } else {
      // Otherwise set the selected client ID
      selectClient(value);
      // Call onSelect callback if provided - indicates user explicitly selected a client
      if (onSelect) {
        onSelect();
      }
    }
  };

  const handleOpenManageDialog = () => {
    setIsManageDialogOpen(true);
  };

  const handleCloseManageDialog = () => {
    setIsManageDialogOpen(false);
  };
  
  // Client Dialog handlers
  const handleAddClient = () => {
    console.log('🔄 handleAddClient called');
    setClientToEdit(null);
    setIsClientDialogOpen(true);
  };
  
  const handleEditClient = (client: Client) => {
    // Find the client to be edited and set it for the dialog
    const clientForEdit = clients.find(c => c.id === client.id) || null;
    setClientToEdit(clientForEdit);
    setIsClientDialogOpen(true);
    handleMenuClose();
  };
  
  // Client menu handlers
  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, client: Client) => {
    setMenuAnchorEl(event.currentTarget);
    setClientForMenu(client);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setClientForMenu(null);
  };
  
  // Delete handlers
  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
    handleMenuClose();
  };
  
  const handleConfirmDelete = async () => {
    if (clientForMenu) {
      try {
        // We'll need to implement this once we add the delete functionality
        // to the client service
        console.log('⚠️ Delete client not yet implemented in service layer');
        
        // If the deleted client was selected, clear the selection
        if (selectedClientId === clientForMenu.id) {
          clearSelectedClient();
        }
        
        // Refresh the clients list
        loadClients();
      } catch (error) {
        console.error('❌ Error deleting client:', error);
      }
    }
    setIsDeleteDialogOpen(false);
  };
  
  const menuOpen = Boolean(menuAnchorEl);
  // Use the currentClient variable that's already defined above

  if (loading && clients.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mx: 2 }}>
        <CircularProgress size={24} sx={{ color: 'white' }} />
        <Typography variant="body2" sx={{ ml: 1, color: 'white' }}>
          Loading clients...
        </Typography>
      </Box>
    );
  }

  if (clients.length === 0) {
    return (
      <Box>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddClient}
          sx={{ 
            color: 'white', 
            borderColor: 'rgba(255,255,255,0.5)',
            '&:hover': {
              borderColor: 'white'
            }
          }}
        >
          Add Client
        </Button>
        
        {/* Client Add/Edit Dialog */}
        <ClientDialog
          open={isClientDialogOpen}
          onClose={() => setIsClientDialogOpen(false)}
          /* Passing the client as-is, ClientDialog will handle type conversion */
          client={clientToEdit}
          title={clientToEdit ? 'Edit Client' : 'Add New Client'}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <BusinessIcon sx={{ mr: 1, color: 'white' }} />
      <FormControl 
        variant="outlined" 
        size={size}
        fullWidth={fullWidth}
        sx={{ 
          minWidth: fullWidth ? 'auto' : 200,
          '& .MuiOutlinedInput-root': {
            color: 'white',
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.5)',
            },
            '&:hover fieldset': {
              borderColor: 'white',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'white',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255,255,255,0.7)',
          },
          '& .MuiSvgIcon-root': {
            color: 'white',
          }
        }}
      >
        <InputLabel id="client-select-label">Client</InputLabel>
        <Select
          labelId="client-select-label"
          id="client-select"
          value={selectedClientId || 'all'}
          label="Client"
          onChange={handleClientChange}
          startAdornment={
            currentClient ? <ClientLogo client={currentClient} /> : null
          }
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 300,
              },
            },
          }}
        >
          <MenuItem value="all">All Clients</MenuItem>
          {clients.map((client: Client) => (
            <MenuItem key={client.id} value={client.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <ClientLogo client={client} />
                {client.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Tooltip title="Manage Clients">
        <Button
          sx={{ 
            minWidth: 'auto', 
            ml: 1,
            color: 'white', 
            borderColor: 'rgba(255,255,255,0.5)',
            '&:hover': {
              borderColor: 'white'
            }
          }}
          variant="outlined"
          size="small"
          onClick={handleOpenManageDialog}
        >
          <AddIcon fontSize="small" />
        </Button>
      </Tooltip>

      {/* Client Management Dialog */}
      <Dialog 
        open={isManageDialogOpen} 
        onClose={handleCloseManageDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Manage Clients</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddClient}
          >
            Add Client
          </Button>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : clients.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No clients found. Click "Add Client" to create your first client.
              </Typography>
            </Box>
          ) : (
            <List sx={{ width: '100%' }}>
              {clients.map((client) => (
                <React.Fragment key={client.id}>
                  <ListItem>
                    <ListItemIcon>
                      <ClientLogo client={client} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={client.name} 
                      secondary={client.status === 'active' ? 'Active' : 'Inactive'} 
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={(e) => handleMenuClick(e, client)}>
                        <MoreVertIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component="li" variant="inset" />
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManageDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Client Create/Edit Dialog */}
      <ClientDialog 
        open={isClientDialogOpen} 
        onClose={(clientCreated) => {
          setIsClientDialogOpen(false);
          if (clientCreated) {
            console.log('Client was created/updated, refreshing client list');
            loadClients();
          }
        }}
        client={clientToEdit}
        title={clientToEdit ? 'Edit Client' : 'Add Client'}
      />
      
      {/* Client Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => clientForMenu && handleEditClient(clientForMenu)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the client "{clientForMenu?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* This dialog has been moved above to avoid duplication */}
    </Box>
  );
};

export default ClientSelector;
