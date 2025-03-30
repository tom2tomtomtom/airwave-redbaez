import React, { useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Button, 
  CircularProgress, 
  Alert, 
  Paper, 
  Grid, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Divider 
} from '@mui/material';
import { useGeneration } from '../../features/generation/context/GenerationContext';
import { TextToImageRequest, TextToImageResult } from '../../features/generation/types/generation.types'; // Example types
import { CheckCircleOutline, ErrorOutline, HourglassEmpty } from '@mui/icons-material';

// Assuming a generic structure for now, specific types might be needed
// if we want to display different results differently.
// Using TextToImage types as a placeholder.
type CurrentRequestType = TextToImageRequest;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CurrentResultType = TextToImageResult;

const UnifiedGenerationPage: React.FC = () => {
  const {
    availablePlugins,
    selectedPluginId,
    selectPlugin,
    currentRequest,
    updateRequest,
    triggerGeneration,
    isLoading,
    error,
    history,
    selectedPlugin, // Get the selected plugin object
    clearHistory // Add clear history function
  } = useGeneration<CurrentRequestType, CurrentResultType>();

  const SelectedFormComponent = selectedPlugin?.getFormComponent();

  useEffect(() => {
    // Optionally select the first plugin by default
    if (!selectedPluginId && availablePlugins.length > 0) {
      selectPlugin(availablePlugins[0].getId());
    }
  }, [availablePlugins, selectedPluginId, selectPlugin]);

  const handlePluginChange = (event: any) => {
    selectPlugin(event.target.value as string);
  };

  const handleFormChange = (data: Partial<CurrentRequestType>) => {
    updateRequest(data);
  };
  
  const handleGenerateClick = () => {
    triggerGeneration();
  };
  
  const handleClearHistory = () => {
    clearHistory();
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Unified Generation
      </Typography>

      <Grid container spacing={4}>
        {/* Left Column: Configuration & Action */}
        <Grid item xs={12} md={5}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Configure</Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="plugin-select-label">Generation Type</InputLabel>
              <Select
                labelId="plugin-select-label"
                value={selectedPluginId || ''}
                label="Generation Type"
                onChange={handlePluginChange}
                disabled={isLoading}
              >
                {availablePlugins.map((plugin) => (
                  <MenuItem key={plugin.getId()} value={plugin.getId()}>
                    {/* Optionally add plugin icon here */}
                    {plugin.getName()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedPlugin && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedPlugin.getDescription()}
                </Typography>
                <Divider sx={{ my: 2 }}/>
                {SelectedFormComponent && (
                  <SelectedFormComponent
                    requestData={currentRequest}
                    onRequestChange={handleFormChange}
                    // Pass disabled state if needed based on isLoading
                  />
                )}
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateClick}
                disabled={isLoading || !selectedPluginId}
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column: History & Results */}
        <Grid item xs={12} md={7}>
          <Paper elevation={2} sx={{ p: 3, maxHeight: '80vh', overflowY: 'auto' }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                 <Typography variant="h6">History</Typography>
                 <Button 
                    size="small" 
                    onClick={handleClearHistory}
                    disabled={history.length === 0 || isLoading}
                  >
                   Clear History
                 </Button>
             </Box>
            {history.length === 0 ? (
              <Typography color="text.secondary">No generation history yet.</Typography>
            ) : (
              <List dense>
                {history.map((item) => {
                  const plugin = availablePlugins.find(p => p.getId() === item.pluginId);
                  const result = item.result as CurrentResultType | undefined; // Type assertion
                  
                  return (
                    <React.Fragment key={item.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemIcon sx={{mt: 1}}>
                          {item.status === 'pending' && <HourglassEmpty color="action" />}
                          {item.status === 'success' && <CheckCircleOutline color="success" />}
                          {item.status === 'error' && <ErrorOutline color="error" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={`${plugin?.getName() || 'Unknown Plugin'} - ${new Date(item.timestamp).toLocaleString()}`}
                          secondary={
                            <Box component="span" sx={{ display: 'block' }}> 
                              <Typography variant="body2" component="span" display="block" sx={{ wordBreak: 'break-word', mb: 1 }}>
                                {/* Cast stringified JSON to string to satisfy ReactNode type */}
                                Request: {JSON.stringify(item.request) as string}
                              </Typography>
                              {item.status === 'success' && result?.previewUrl && (
                                <Box sx={{ my: 1 }}>
                                  <img src={result.previewUrl} alt="Generated preview" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '4px' }} />
                                </Box>
                              )}
                              {item.status === 'success' && result?.data && (
                                <Typography variant="caption" component="span" display="block">
                                  Data: {JSON.stringify(result.data) as string}
                                </Typography>
                              )}
                              {item.status === 'error' && result?.error && (
                                <Typography variant="caption" component="span" display="block" color="error">
                                  Error: {JSON.stringify(result.error) as string}
                                </Typography>
                              )}
                              {item.status === 'pending' && (
                                <Typography variant="caption" component="span" display="block" color="text.secondary">
                                  Generation in progress...
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UnifiedGenerationPage;
