import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Grid,
  FormControlLabel,
  Switch,
  Tooltip,
  Autocomplete,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon,
  Save as SaveIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../store';
import { Template } from '../../types/templates';
import { Asset } from '../../types/assets';
import { selectAllAssets } from '../../store/slices/assetsSlice';
import { selectAllTemplates, fetchTemplates } from '../../store/slices/templatesSlice';

interface ExecutionSettingsStepProps {
  executions: any[];
  templates: string[];
  assets: string[];
  onChange: (executions: any[]) => void;
}

interface Execution {
  id: string;
  name: string;
  templateId: string;
  platform: string;
  assetMappings: {
    parameterName: string;
    assetId?: string;
    value?: string;
  }[];
  settings: {
    exportFormat: string;
    quality: string;
    includeAudio: boolean;
  };
}

const ExecutionSettingsStep: React.FC<ExecutionSettingsStepProps> = ({
  executions,
  templates,
  assets,
  onChange
}) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const templateEntities = useSelector(selectAllTemplates);
  const templatesLoading = useSelector((state: RootState) => state.templates.loading);
  const templatesError = useSelector((state: RootState) => state.templates.error);
  const allAssets = useSelector(selectAllAssets);
  
  const [localExecutions, setLocalExecutions] = useState<Execution[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingExecution, setEditingExecution] = useState<Execution | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
  const [previewExecution, setPreviewExecution] = useState<Execution | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  
  useEffect(() => {
    // Fetch templates if they are not loaded
    if (templateEntities.length === 0) {
        dispatch(fetchTemplates());
    }
  }, [dispatch, templateEntities.length]);

  useEffect(() => {
    if (executions.length > 0) {
      setLocalExecutions(executions);
    } else if (templates.length > 0) {
      // If no executions but templates exist, auto-create executions for each template
      const newExecutions = templates.map((templateId, index) => {
        const template = templateEntities.find(t => t.id === templateId);
        
        const execution: Execution = {
          id: `execution-${Date.now()}-${index}`,
          name: template ? `${template.name} Execution` : `Execution ${index + 1}`,
          templateId,
          platform: template?.platforms[0] || '',
          assetMappings: template?.parameters?.map(param => ({
            parameterName: param.name,
            assetId: undefined,
            value: param.default || undefined
          })) || [],
          settings: {
            exportFormat: 'mp4',
            quality: 'high',
            includeAudio: true
          }
        };
        
        return execution;
      });
      
      setLocalExecutions(newExecutions);
      onChange(newExecutions);
    }
  }, [executions, templates, templateEntities]);
  
  const handleAddExecution = () => {
    // Create a new execution with the first template
    if (templates.length === 0) {
      return;
    }
    
    const templateId = templates[0];
    const template = templateEntities.find(t => t.id === templateId);
    
    const newExecution: Execution = {
      id: `execution-${Date.now()}`,
      name: template ? `${template.name} Execution` : `New Execution`,
      templateId,
      platform: template?.platforms[0] || '',
      assetMappings: template?.parameters?.map(param => ({
        parameterName: param.name,
        assetId: undefined,
        value: param.default || undefined
      })) || [],
      settings: {
        exportFormat: 'mp4',
        quality: 'high',
        includeAudio: true
      }
    };
    
    setEditingExecution(newExecution);
    setEditingIndex(null);
    setOpenDialog(true);
  };
  
  const handleEditExecution = (execution: Execution, index: number) => {
    setEditingExecution({ ...execution });
    setEditingIndex(index);
    setOpenDialog(true);
  };
  
  const handleDeleteExecution = (index: number) => {
    const newExecutions = [...localExecutions];
    newExecutions.splice(index, 1);
    setLocalExecutions(newExecutions);
    onChange(newExecutions);
  };
  
  const handlePreviewExecution = (execution: Execution) => {
    setPreviewExecution(execution);
    setPreviewLoading(true);
    setOpenPreviewDialog(true);
    
    // Simulate loading a preview
    setTimeout(() => {
      const template = templateEntities.find(t => t.id === execution.templateId);
      if (template) {
        setPreviewUrl(template.previewUrl);
      }
      setPreviewLoading(false);
    }, 1500);
  };
  
  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingExecution(null);
    setEditingIndex(null);
  };
  
  const handlePreviewDialogClose = () => {
    setOpenPreviewDialog(false);
    setPreviewExecution(null);
    setPreviewUrl('');
  };
  
  const handleSaveExecution = () => {
    if (!editingExecution) return;
    
    const newExecutions = [...localExecutions];
    
    if (editingIndex !== null) {
      // Update existing
      newExecutions[editingIndex] = editingExecution;
    } else {
      // Add new
      newExecutions.push(editingExecution);
    }
    
    setLocalExecutions(newExecutions);
    onChange(newExecutions);
    handleDialogClose();
  };
  
  const handleExecutionChange = (field: keyof Execution, value: any) => {
    if (!editingExecution) return;
    
    if (field === 'templateId') {
      // Update template-dependent fields
      const template = templateEntities.find(t => t.id === value);
      
      setEditingExecution({
        ...editingExecution,
        templateId: value,
        platform: template?.platforms[0] || editingExecution.platform,
        assetMappings: template?.parameters?.map(param => ({
          parameterName: param.name,
          assetId: undefined,
          value: param.default || undefined
        })) || []
      });
    } else {
      setEditingExecution({
        ...editingExecution,
        [field]: value
      });
    }
  };
  
  const handleAssetMappingChange = (index: number, field: string, value: any) => {
    if (!editingExecution) return;
    
    const newMappings = [...editingExecution.assetMappings];
    newMappings[index] = {
      ...newMappings[index],
      [field]: value
    };
    
    setEditingExecution({
      ...editingExecution,
      assetMappings: newMappings
    });
  };
  
  const handleSettingChange = (field: string, value: any) => {
    if (!editingExecution) return;
    
    setEditingExecution({
      ...editingExecution,
      settings: {
        ...editingExecution.settings,
        [field]: value
      }
    });
  };
  
  const getAssetName = (assetId?: string) => {
    if (!assetId) return 'None';
    const asset = allAssets.find(a => a.id === assetId);
    return asset ? asset.name : 'Unknown';
  };
  
  const getTemplateName = (templateId: string) => {
    const template = templateEntities.find(t => t.id === templateId);
    return template ? template.name : 'Unknown';
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Configure ad executions
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddExecution}
          disabled={templates.length === 0}
        >
          Add Execution
        </Button>
      </Box>
      
      {templates.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please select at least one template in the previous step to create executions.
        </Alert>
      ) : null}
      
      {allAssets.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          You haven't selected any assets. You can still create executions, but you'll need to manually enter values for template parameters.
        </Alert>
      ) : null}
      
      {localExecutions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" paragraph>
            No executions configured yet.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddExecution}
            disabled={templates.length === 0}
          >
            Add Your First Execution
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Assets</TableCell>
                <TableCell>Settings</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {localExecutions.map((execution, index) => {
                const template = templateEntities.find(t => t.id === execution.templateId);
                const mappedAssetCount = execution.assetMappings.filter(m => m.assetId).length;
                const totalParamCount = execution.assetMappings.length;
                
                return (
                  <TableRow key={execution.id}>
                    <TableCell>{execution.name}</TableCell>
                    <TableCell>{getTemplateName(execution.templateId)}</TableCell>
                    <TableCell>
                      <Chip
                        label={execution.platform}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">
                          {mappedAssetCount}/{totalParamCount} mapped
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(mappedAssetCount / totalParamCount) * 100} 
                          sx={{ width: 50, ml: 1, height: 8, borderRadius: 5 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${execution.settings.quality} / ${execution.settings.exportFormat}`}
                        size="small"
                        icon={<SettingsIcon />}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Preview">
                        <IconButton
                          size="small"
                          onClick={() => handlePreviewExecution(execution)}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditExecution(execution, index)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteExecution(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Execution Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingIndex !== null ? 'Edit Execution' : 'New Execution'}
        </DialogTitle>
        <DialogContent>
          {editingExecution && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Execution Name"
                    value={editingExecution.name}
                    onChange={(e) => handleExecutionChange('name', e.target.value)}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Template"
                    value={editingExecution.templateId}
                    onChange={(e) => handleExecutionChange('templateId', e.target.value)}
                    margin="normal"
                  >
                    {templates.map((templateId) => {
                      const template = templateEntities.find(t => t.id === templateId);
                      return (
                        <MenuItem key={templateId} value={templateId}>
                          {template ? template.name : templateId}
                        </MenuItem>
                      );
                    })}
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Platform"
                    value={editingExecution.platform}
                    onChange={(e) => handleExecutionChange('platform', e.target.value)}
                    margin="normal"
                  >
                    {templateEntities
                      .find(t => t.id === editingExecution.templateId)
                      ?.platforms.map(platform => (
                        <MenuItem key={platform} value={platform}>
                          {platform}
                        </MenuItem>
                      )) || []}
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Export Format"
                    value={editingExecution.settings.exportFormat}
                    onChange={(e) => handleSettingChange('exportFormat', e.target.value)}
                    margin="normal"
                  >
                    <MenuItem value="mp4">MP4</MenuItem>
                    <MenuItem value="mov">MOV</MenuItem>
                    <MenuItem value="gif">GIF</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Quality"
                    value={editingExecution.settings.quality}
                    onChange={(e) => handleSettingChange('quality', e.target.value)}
                    margin="normal"
                  >
                    <MenuItem value="low">Low (Fast)</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingExecution.settings.includeAudio}
                        onChange={(e) => handleSettingChange('includeAudio', e.target.checked)}
                      />
                    }
                    label="Include Audio"
                    sx={{ mt: 2 }}
                  />
                </Grid>
              </Grid>
              
              <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                Asset Mappings
              </Typography>
              
              {editingExecution.assetMappings.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  This template doesn't have any configurable parameters.
                </Typography>
              ) : (
                editingExecution.assetMappings.map((mapping, index) => {
                  const template = templateEntities.find(t => t.id === editingExecution.templateId);
                  const parameter = template?.parameters?.find(p => p.name === mapping.parameterName);
                  const parameterType = parameter?.type || 'text';
                  
                  return (
                    <Box
                      key={mapping.parameterName}
                      sx={{
                        p: 2,
                        mb: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="subtitle2">
                        {mapping.parameterName}
                        {parameter?.required && <Typography component="span" color="error"> *</Typography>}
                      </Typography>
                      
                      {parameter?.description && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
                          {parameter.description}
                        </Typography>
                      )}
                      
                      {parameterType === 'text' && (
                        <TextField
                          fullWidth
                          label="Text Value"
                          value={mapping.value || ''}
                          onChange={(e) => handleAssetMappingChange(index, 'value', e.target.value)}
                          margin="normal"
                        />
                      )}
                      
                      {(parameterType === 'image' || parameterType === 'video' || parameterType === 'audio') && (
                        <Autocomplete
                          fullWidth
                          options={allAssets.filter(a => a.type === parameterType)}
                          getOptionLabel={(option) => option.name}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          value={allAssets.find(a => a.id === mapping.assetId) || null}
                          onChange={(_, newValue) => {
                            handleAssetMappingChange(index, 'assetId', newValue?.id || undefined);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={`Select ${parameterType}`}
                              margin="normal"
                            />
                          )}
                        />
                      )}
                      
                      {parameterType === 'color' && (
                        <TextField
                          fullWidth
                          label="Color Value"
                          value={mapping.value || '#FFFFFF'}
                          onChange={(e) => handleAssetMappingChange(index, 'value', e.target.value)}
                          margin="normal"
                          InputProps={{
                            startAdornment: (
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  mr: 1,
                                  bgcolor: mapping.value || '#FFFFFF',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 1
                                }}
                              />
                            ),
                          }}
                        />
                      )}
                    </Box>
                  );
                })
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveExecution}
          >
            Save Execution
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog
        open={openPreviewDialog}
        onClose={handlePreviewDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {previewExecution?.name || 'Preview'}
        </DialogTitle>
        <DialogContent>
          {previewLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography>Generating preview...</Typography>
            </Box>
          ) : previewUrl ? (
            <Box
              component="video"
              src={previewUrl}
              controls
              autoPlay
              sx={{ width: '100%', maxHeight: 500 }}
            />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography>No preview available</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePreviewDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExecutionSettingsStep;