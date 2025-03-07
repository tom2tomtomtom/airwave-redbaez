import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Drawer,
  Divider,
  TextField,
  FormControlLabel,
  Checkbox,
  Card,
  CardMedia,
  CardContent,
  Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import CheckIcon from '@mui/icons-material/Check';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ImageIcon from '@mui/icons-material/Image';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { apiClient } from '../../utils/api';
import { useMatrixOperations } from '../../hooks/useMatrixOperations';
import type { 
  Asset, 
  MatrixSlot, 
  MatrixRow, 
  MatrixColumn, 
  MatrixData, 
  CombinationOptions 
} from '../../hooks/useMatrixOperations';

// Campaign Matrix props interface
interface CampaignMatrixProps {
  campaignId: string;
  matrixId?: string;
  onSave?: (matrixId: string) => void;
}

const initialCombinationOptions: CombinationOptions = {
  maxCombinations: 10,
  varyCopy: true,
  varyVideos: true,
  varyImages: true,
  varyAudio: true,
  varyGraphics: true,
};

const assetTypeIcons = {
  'video': <VideoLibraryIcon />,
  'image': <ImageIcon />,
  'text': <TextFieldsIcon />,
  'audio': <MusicNoteIcon />,
  'graphic': <GraphicEqIcon />,
};

const CampaignMatrix: React.FC<CampaignMatrixProps> = ({ campaignId, matrixId, onSave }) => {
  // State for matrix data
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [renderingAll, setRenderingAll] = useState(false);
  
  // State for asset selection
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MatrixSlot | null>(null);
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [assetFilter, setAssetFilter] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  
  // State for combination generation
  const [combinationOptions, setCombinationOptions] = useState<CombinationOptions>(initialCombinationOptions);
  const [combinationDialogOpen, setCombinationDialogOpen] = useState(false);
  const [generatingCombinations, setGeneratingCombinations] = useState(false);
  
  // Use our custom hook for matrix operations
  const { 
    matrixData, 
    loading, 
    error, 
    saving, 
    renderingAll,
    loadMatrixData,
    saveMatrix,
    addRow,
    deleteRow,
    duplicateRow,
    toggleSlotLock,
    toggleRowLock,
    setSlotAsset,
    renderRow,
    renderAllRows,
    generateCombinations
  } = useMatrixOperations(campaignId, matrixId);
  
  // Load matrix data on component mount
  useEffect(() => {
    loadMatrixData();
  }, [loadMatrixData]);
  
  // Create an empty matrix structure
  const createEmptyMatrix = (): MatrixData => {
    // Define default column types for a new matrix
    const defaultColumns = [
      { id: `col-${Date.now()}-1`, type: 'video', name: 'Video' },
      { id: `col-${Date.now()}-2`, type: 'image', name: 'Image' },
      { id: `col-${Date.now()}-3`, type: 'text', name: 'Copy' },
      { id: `col-${Date.now()}-4`, type: 'audio', name: 'Music' },
      { id: `col-${Date.now()}-5`, type: 'audio', name: 'Voice Over' },
    ] as { id: string, type: 'video' | 'image' | 'audio' | 'text' | 'graphic', name: string }[];
    
    // Create slots for a single row based on the columns
    const slots = defaultColumns.map(col => ({
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: col.type,
      assetId: null,
      locked: false,
      name: col.name,
    }));
    
    // Create the matrix with one row
    return {
      id: `matrix-${Date.now()}`,
      name: 'New Campaign Matrix',
      campaignId,
      columns: defaultColumns,
      rows: [
        {
          id: `row-${Date.now()}-1`,
          slots,
          locked: false,
          renderStatus: 'idle',
        },
      ],
    };
  };
  
  // Load assets for selector
  const loadAssets = async (type: 'video' | 'image' | 'audio' | 'text' | 'graphic' | 'all' = 'all') => {
    if (!selectedSlot) return;
    
    try {
      setAssetsLoading(true);
      
      const filters: Record<string, any> = {};
      if (type !== 'all') {
        filters.type = type;
      } else if (selectedSlot.type) {
        filters.type = selectedSlot.type;
      }
      
      const response = await apiClient.assets.getAll(filters);
      setAssets(response.data.data);
    } catch (err: any) {
      console.error('Error loading assets:', err);
      setError(err.response?.data?.message || 'Failed to load assets');
    } finally {
      setAssetsLoading(false);
    }
  };
  
  // Open asset selector for a slot
  const handleOpenAssetSelector = (slot: MatrixSlot) => {
    setSelectedSlot(slot);
    setAssetSelectorOpen(true);
    setAssetFilter('');
    setAssetTypeFilter('all');
    loadAssets(slot.type);
  };
  
  // Close asset selector
  const handleCloseAssetSelector = () => {
    setAssetSelectorOpen(false);
    setSelectedSlot(null);
  };
  
  // Select an asset for a slot
  const handleSelectAsset = (asset: Asset) => {
    if (!selectedSlot || !matrixData) return;
    
    // Update the matrix with the selected asset
    const updatedMatrix = {
      ...matrixData,
      rows: matrixData.rows.map(row => ({
        ...row,
        slots: row.slots.map(slot => 
          slot.id === selectedSlot.id 
            ? { ...slot, assetId: asset.id } 
            : slot
        )
      }))
    };
    
    setMatrixData(updatedMatrix);
    handleCloseAssetSelector();
  };
  
  // Toggle slot lock
  const handleToggleSlotLock = (rowId: string, slotId: string) => {
    if (!matrixData) return;
    
    // Update the matrix with the toggled lock state
    const updatedMatrix = {
      ...matrixData,
      rows: matrixData.rows.map(row => 
        row.id === rowId
          ? {
              ...row,
              slots: row.slots.map(slot => 
                slot.id === slotId
                  ? { ...slot, locked: !slot.locked }
                  : slot
              )
            }
          : row
      )
    };
    
    setMatrixData(updatedMatrix);
  };
  
  // Toggle row lock
  const handleToggleRowLock = (rowId: string) => {
    if (!matrixData) return;
    
    // Update the matrix with the toggled lock state
    const updatedMatrix = {
      ...matrixData,
      rows: matrixData.rows.map(row => 
        row.id === rowId
          ? { ...row, locked: !row.locked }
          : row
      )
    };
    
    setMatrixData(updatedMatrix);
  };
  
  // Add a new row
  const handleAddRow = () => {
    if (!matrixData) return;
    
    // Create slots for the new row based on the existing columns
    const newSlots = matrixData.columns.map(col => ({
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: col.type,
      assetId: null,
      locked: false,
      name: col.name,
    }));
    
    // Add the new row to the matrix
    const updatedMatrix = {
      ...matrixData,
      rows: [
        ...matrixData.rows,
        {
          id: `row-${Date.now()}-${matrixData.rows.length + 1}`,
          slots: newSlots,
          locked: false,
          renderStatus: 'idle',
        }
      ]
    };
    
    setMatrixData(updatedMatrix);
  };
  
  // Delete a row
  const handleDeleteRow = (rowId: string) => {
    if (!matrixData) return;
    
    // Remove the row from the matrix
    const updatedMatrix = {
      ...matrixData,
      rows: matrixData.rows.filter(row => row.id !== rowId)
    };
    
    setMatrixData(updatedMatrix);
  };
  
  // Duplicate a row
  const handleDuplicateRow = (rowId: string) => {
    if (!matrixData) return;
    
    // Find the row to duplicate
    const rowToDuplicate = matrixData.rows.find(row => row.id === rowId);
    if (!rowToDuplicate) return;
    
    // Create a duplicate of the row with new IDs
    const duplicatedRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      slots: rowToDuplicate.slots.map(slot => ({
        ...slot,
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        locked: false
      })),
      locked: false,
      renderStatus: 'idle',
    };
    
    // Add the duplicated row to the matrix
    const updatedMatrix = {
      ...matrixData,
      rows: [...matrixData.rows, duplicatedRow]
    };
    
    setMatrixData(updatedMatrix);
  };
  
  // Save the matrix
  const handleSave = async () => {
    try {
      const savedMatrixId = await saveMatrix();
      if (savedMatrixId && onSave) {
        onSave(savedMatrixId);
      }
    } catch (err) {
      console.error('Error in handleSave:', err);
    }
  };
  
  // Render a single row
  const handleRenderRow = (rowId: string) => {
    renderRow(rowId);
  };
  
  // Render all rows
  const handleRenderAll = () => {
    renderAllRows();
  };
  
  // Open combinations dialog
  const handleOpenCombinationsDialog = () => {
    setCombinationDialogOpen(true);
  };
  
  // Handle combination option changes
  const handleCombinationOptionChange = (name: keyof CombinationOptions, value: any) => {
    setCombinationOptions(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Generate combinations
  const handleGenerateCombinations = async () => {
    try {
      setGeneratingCombinations(true);
      
      // Use our hook to generate combinations
      const success = await generateCombinations(combinationOptions);
      
      if (success) {
        setCombinationDialogOpen(false);
      }
    } catch (err) {
      console.error('Error in handleGenerateCombinations:', err);
    } finally {
      setGeneratingCombinations(false);
    }
  };
  
  // Get the asset for a slot
  const getAssetForSlot = (assetId: string | null) => {
    if (!assetId) return null;
    return assets.find(asset => asset.id === assetId);
  };
  
  // Handle asset filter change
  const handleAssetFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAssetFilter(event.target.value);
  };
  
  // Handle asset type filter change
  const handleAssetTypeFilterChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newType = event.target.value as string;
    setAssetTypeFilter(newType);
    loadAssets(newType as any);
  };
  
  // Filter assets based on search and type
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(assetFilter.toLowerCase());
    const matchesType = assetTypeFilter === 'all' || asset.type === assetTypeFilter;
    return matchesSearch && matchesType;
  });
  
  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }
  
  // Render no matrix data state
  if (!matrixData) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No matrix data available. Please create a new matrix.
      </Alert>
    );
  }
  
  return (
    <Box sx={{ mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Campaign Matrix
          </Typography>
          
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<ShuffleIcon />}
              onClick={handleOpenCombinationsDialog}
              sx={{ mr: 2 }}
            >
              Generate Combinations
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleRenderAll}
              disabled={renderingAll || matrixData.rows.length === 0}
            >
              {renderingAll ? 'Rendering...' : 'Render All'}
            </Button>
          </Box>
        </Box>
        
        {/* Matrix Table */}
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}>#</TableCell>
                {matrixData.columns.map(column => (
                  <TableCell key={column.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {assetTypeIcons[column.type]}
                      <Box sx={{ ml: 1 }}>{column.name}</Box>
                    </Box>
                  </TableCell>
                ))}
                <TableCell width={100}>Preview</TableCell>
                <TableCell width={150}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matrixData.rows.map((row, rowIndex) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {rowIndex + 1}
                      <IconButton 
                        size="small" 
                        onClick={() => handleToggleRowLock(row.id)}
                        sx={{ ml: 1 }}
                      >
                        {row.locked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                      </IconButton>
                    </Box>
                  </TableCell>
                  
                  {row.slots.map(slot => (
                    <TableCell key={slot.id}>
                      <Box sx={{ position: 'relative' }}>
                        <Box 
                          sx={{ 
                            border: '1px dashed #ccc', 
                            p: 1, 
                            borderRadius: 1,
                            minHeight: '60px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            backgroundColor: slot.locked ? '#f5f5f5' : 'transparent',
                            '&:hover': {
                              backgroundColor: slot.locked ? '#f5f5f5' : '#f9f9f9'
                            }
                          }}
                          onClick={() => !slot.locked && handleOpenAssetSelector(slot)}
                        >
                          {slot.assetId ? (
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="body2" noWrap>
                                {getAssetForSlot(slot.assetId)?.name || 'Asset Selected'}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Click to select a {slot.type}
                            </Typography>
                          )}
                        </Box>
                        
                        {slot.locked && (
                          <LockIcon 
                            fontSize="small" 
                            sx={{ 
                              position: 'absolute', 
                              top: 5, 
                              right: 5, 
                              color: 'action.disabled' 
                            }} 
                          />
                        )}
                        
                        {!slot.locked && slot.assetId && (
                          <IconButton
                            size="small"
                            sx={{ position: 'absolute', top: 0, right: 0 }}
                            onClick={() => handleToggleSlotLock(row.id, slot.id)}
                          >
                            <LockOpenIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  ))}
                  
                  <TableCell>
                    {row.renderStatus === 'rendering' ? (
                      <CircularProgress size={24} />
                    ) : row.renderStatus === 'complete' && row.previewUrl ? (
                      <Tooltip title="View Preview">
                        <IconButton>
                          <PlayCircleOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Render">
                        <IconButton onClick={() => handleRenderRow(row.id)}>
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex' }}>
                      <Tooltip title="Duplicate Row">
                        <IconButton onClick={() => handleDuplicateRow(row.id)}>
                          <FileCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Delete Row">
                        <IconButton 
                          onClick={() => handleDeleteRow(row.id)}
                          disabled={row.locked}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddRow}
          >
            Add Row
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />}
          >
            {saving ? 'Saving...' : 'Save Matrix'}
          </Button>
        </Box>
      </Paper>
      
      {/* Asset Selector Drawer */}
      <Drawer
        anchor="right"
        open={assetSelectorOpen}
        onClose={handleCloseAssetSelector}
        sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 400 } } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select {selectedSlot?.type}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Search Assets"
                  value={assetFilter}
                  onChange={handleAssetFilterChange}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="asset-type-filter-label">Asset Type</InputLabel>
                  <Select
                    labelId="asset-type-filter-label"
                    value={assetTypeFilter}
                    onChange={handleAssetTypeFilterChange as any}
                    label="Asset Type"
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="video">Videos</MenuItem>
                    <MenuItem value="image">Images</MenuItem>
                    <MenuItem value="audio">Audio</MenuItem>
                    <MenuItem value="text">Text</MenuItem>
                    <MenuItem value="graphic">Graphics</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
          
          {assetsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredAssets.length === 0 ? (
            <Alert severity="info">
              No assets found. Try a different search or filter.
            </Alert>
          ) : (
            <Box sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
              <Grid container spacing={2}>
                {filteredAssets.map(asset => (
                  <Grid item xs={12} key={asset.id}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 3 }
                      }}
                      onClick={() => handleSelectAsset(asset)}
                    >
                      <Box sx={{ display: 'flex' }}>
                        {(asset.type === 'image' || asset.type === 'video') && asset.thumbnailUrl && (
                          <CardMedia
                            component="img"
                            sx={{ width: 100, height: 80, objectFit: 'cover' }}
                            image={asset.thumbnailUrl}
                            alt={asset.name}
                          />
                        )}
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2">
                            {asset.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                            {asset.duration && ` • ${Math.floor(asset.duration / 60)}:${(asset.duration % 60).toString().padStart(2, '0')}`}
                          </Typography>
                          {asset.tags && asset.tags.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              {asset.tags.map(tag => (
                                <Chip 
                                  key={tag} 
                                  label={tag} 
                                  size="small" 
                                  sx={{ mr: 0.5, mb: 0.5 }} 
                                />
                              ))}
                            </Box>
                          )}
                        </CardContent>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleCloseAssetSelector}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Drawer>
      
      {/* Combinations Dialog */}
      <Dialog 
        open={combinationDialogOpen} 
        onClose={() => setCombinationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Combinations</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Generate multiple combinations of assets based on your selections. Locked slots will not be changed.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Maximum Combinations"
                type="number"
                InputProps={{ inputProps: { min: 1, max: 50 } }}
                value={combinationOptions.maxCombinations}
                onChange={(e) => handleCombinationOptionChange('maxCombinations', parseInt(e.target.value))}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Asset Types to Vary
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={combinationOptions.varyVideos}
                    onChange={(e) => handleCombinationOptionChange('varyVideos', e.target.checked)}
                  />
                }
                label="Videos"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={combinationOptions.varyImages}
                    onChange={(e) => handleCombinationOptionChange('varyImages', e.target.checked)}
                  />
                }
                label="Images"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={combinationOptions.varyCopy}
                    onChange={(e) => handleCombinationOptionChange('varyCopy', e.target.checked)}
                  />
                }
                label="Copy"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={combinationOptions.varyAudio}
                    onChange={(e) => handleCombinationOptionChange('varyAudio', e.target.checked)}
                  />
                }
                label="Audio"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={combinationOptions.varyGraphics}
                    onChange={(e) => handleCombinationOptionChange('varyGraphics', e.target.checked)}
                  />
                }
                label="Graphics"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCombinationDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleGenerateCombinations}
            disabled={generatingCombinations}
            startIcon={generatingCombinations ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {generatingCombinations ? 'Generating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CampaignMatrix;