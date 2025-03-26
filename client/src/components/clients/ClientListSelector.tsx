import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText,
  Avatar, 
  Button, 
  TextField,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { Client } from '../../types/client';
import ClientDialog from './ClientDialog';

interface ClientListSelectorProps {
  vertical?: boolean;  // Controls layout direction
  showSearch?: boolean; // Control search visibility
  dense?: boolean;     // More compact view
  maxHeight?: number;  // Container max height
  onClientSelected?: (clientId: string) => void; // Optional callback
  onCreateClientClick?: () => void; // Optional callback for create client button
}

const ClientListSelector: React.FC<ClientListSelectorProps> = ({
  vertical = true,
  showSearch = true,
  dense = false,
  maxHeight,
  onClientSelected,
  onCreateClientClick
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { clients, selectedClientId, loading } = useSelector((state: RootState) => state.clients);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [openClientDialog, setOpenClientDialog] = useState(false);
  
  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    
    const query = searchQuery.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(query) || 
      client.description?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);
  
  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    if (onClientSelected) {
      onClientSelected(clientId);
    }
  };
  
  // Determine if search should be shown
  const shouldShowSearch = showSearch && clients.length > 5;
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Client list heading */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
          px: 1
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          Clients
        </Typography>
        
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            if (onCreateClientClick) {
              onCreateClientClick();
            } else {
              setOpenClientDialog(true);
            }
          }}
          sx={{ minWidth: 0, p: '4px' }}
        >
          Add
        </Button>
      </Box>
      
      {/* Search field */}
      {shouldShowSearch && (
        <Box sx={{ mb: 2, px: 1 }}>
          <TextField
            fullWidth
            placeholder="Search clients..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
              sx: { borderRadius: 1 }
            }}
          />
        </Box>
      )}
      
      {/* Loading state */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      
      {/* Empty state */}
      {!loading && clients.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 2, px: 1 }}>
          <Typography variant="body2" color="text.secondary">
            No clients found.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenClientDialog(true)}
            sx={{ mt: 1 }}
          >
            Create Client
          </Button>
        </Box>
      )}
      
      {/* Client list */}
      {!loading && filteredClients.length > 0 && (
        <Paper 
          variant="outlined" 
          sx={{ 
            maxHeight: maxHeight || 'auto', 
            overflow: 'auto',
            borderRadius: 1
          }}
        >
          <List dense={dense} disablePadding>
            {filteredClients.map((client, index) => (
              <React.Fragment key={client.id || client.slug}>
                <ListItem 
                  button
                  selected={client.id === selectedClientId}
                  onClick={() => handleClientSelect(client.id || client.slug)}
                  sx={{
                    borderRadius: 0,
                    pl: 2,
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      '&:hover': {
                        bgcolor: 'primary.main',
                      },
                    }
                  }}
                >
                  <ListItemAvatar>
                    {client.logoUrl ? (
                      <Avatar 
                        src={client.logoUrl} 
                        alt={client.name}
                        sx={{ 
                          width: dense ? 28 : 36, 
                          height: dense ? 28 : 36 
                        }}
                      />
                    ) : (
                      <Avatar 
                        sx={{ 
                          width: dense ? 28 : 36, 
                          height: dense ? 28 : 36,
                          bgcolor: client.brandColour || 'primary.main'
                        }}
                      >
                        <BusinessIcon sx={{ fontSize: dense ? 16 : 20 }} />
                      </Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText 
                    primary={client.name}
                    secondary={client.description}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: client.id === selectedClientId ? 600 : 400,
                      color: client.id === selectedClientId ? 'primary.contrastText' : 'text.primary'
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      noWrap: true,
                      color: client.id === selectedClientId ? 'primary.contrastText' : 'text.secondary',
                      sx: { opacity: 0.8 }
                    }}
                  />
                </ListItem>
                {index < filteredClients.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      
      {/* Create client dialog */}
      {openClientDialog && (
        <ClientDialog
          open={openClientDialog}
          onClose={(clientCreated) => {
            setOpenClientDialog(false);
            // If a client was created, it will be selected automatically
          }}
          title="Create New Client"
        />
      )}
    </Box>
  );
};

export default ClientListSelector;
