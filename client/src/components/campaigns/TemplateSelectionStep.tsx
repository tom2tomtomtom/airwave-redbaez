import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  MenuItem,
  Chip,
  Button,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  VideoLibrary as VideoLibraryIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { fetchTemplates, selectAllTemplates } from '../../store/slices/templatesSlice';
import { RootState, AppDispatch } from '../../store';
import { Template } from '../../types/templates';
import TemplateDetailDialog from '../templates/TemplateDetailDialog';

interface TemplateSelectionStepProps {
  selectedTemplates: string[];
  platforms: string[];
  onChange: (selectedTemplates: string[]) => void;
}

const formatOptions = [
  { value: 'all', label: 'All Formats' },
  { value: 'square', label: 'Square' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'story', label: 'Story' },
];

const TemplateSelectionStep: React.FC<TemplateSelectionStepProps> = ({
  selectedTemplates,
  platforms,
  onChange
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const templates = useSelector(selectAllTemplates);
  const { loading, error } = useSelector((state: RootState) => state.templates);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [selectedTemplatesMap, setSelectedTemplatesMap] = useState<Record<string, boolean>>({});
  const [showOnlyCompatible, setShowOnlyCompatible] = useState(true);
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  
  // Initialize selected templates map from props
  useEffect(() => {
    const initialMap: Record<string, boolean> = {};
    selectedTemplates.forEach(id => {
      initialMap[id] = true;
    });
    setSelectedTemplatesMap(initialMap);
  }, []);
  
  // Fetch templates if not already loaded
  useEffect(() => {
    if (templates.length === 0 && !loading && !error) {
      dispatch(fetchTemplates());
    }
  }, [dispatch, templates.length, loading, error]);
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handleFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFormat(event.target.value);
  };
  
  const handleTemplateSelect = (templateId: string) => {
    const newSelectedTemplatesMap = {
      ...selectedTemplatesMap,
      [templateId]: !selectedTemplatesMap[templateId]
    };
    
    setSelectedTemplatesMap(newSelectedTemplatesMap);
    
    // Convert the map back to an array of selected template IDs
    const newSelectedTemplates = Object.keys(newSelectedTemplatesMap).filter(
      id => newSelectedTemplatesMap[id]
    );
    
    onChange(newSelectedTemplates);
  };
  
  const handleSelectAll = (selected: boolean) => {
    const newSelectedTemplatesMap: Record<string, boolean> = {};
    
    filteredTemplates.forEach((template: Template) => {
      newSelectedTemplatesMap[template.id] = selected;
    });
    
    // Keep previously selected templates that aren't in the current filtered view
    Object.keys(selectedTemplatesMap).forEach(id => {
      if (!filteredTemplates.some((template: Template) => template.id === id) && selectedTemplatesMap[id]) {
        newSelectedTemplatesMap[id] = true;
      }
    });
    
    setSelectedTemplatesMap(newSelectedTemplatesMap);
    
    // Convert the map back to an array of selected template IDs
    const newSelectedTemplates = Object.keys(newSelectedTemplatesMap).filter(
      id => newSelectedTemplatesMap[id]
    );
    
    onChange(newSelectedTemplates);
  };

  const handleShowTemplateDetail = (template: Template) => {
    setDetailTemplate(template);
    setOpenDetail(true);
  };

  const handleCloseTemplateDetail = () => {
    setOpenDetail(false);
  };
  
  // Check if template is compatible with selected platforms
  const isTemplateCompatible = (template: Template) => {
    if (platforms.length === 0) return true;
    return template.platforms.some(platform => platforms.includes(platform));
  };
  
  // Filter templates based on search query, format, and platform compatibility
  const filteredTemplates = templates.filter((template: Template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFormat = selectedFormat === 'all' || template.format === selectedFormat;
    const matchesCompatibility = !showOnlyCompatible || isTemplateCompatible(template);
    
    return matchesSearch && matchesFormat && matchesCompatibility;
  });
  
  // Check if all filtered templates are selected
  const allSelected = filteredTemplates.length > 0 && 
    filteredTemplates.every((template: Template) => selectedTemplatesMap[template.id]);
  
  // Count the total number of selected templates
  const selectedCount = Object.values(selectedTemplatesMap).filter(Boolean).length;
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Choose templates for your ad executions
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={() => dispatch(fetchTemplates())}
          disabled={loading}
        >
          Refresh Templates
        </Button>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search templates..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
          <TextField
            select
            label="Format"
            value={selectedFormat}
            onChange={handleFormatChange}
            size="small"
            sx={{ minWidth: 150 }}
          >
            {formatOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <IconButton aria-label="filter">
            <FilterIcon />
          </IconButton>
        </Box>
        
        <Divider />
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  indeterminate={selectedCount > 0 && !allSelected}
                />
              }
              label={`Select All${selectedCount > 0 ? ` (${selectedCount} selected)` : ''}`}
            />
            
            {platforms.length > 0 && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showOnlyCompatible}
                    onChange={(e) => setShowOnlyCompatible(e.target.checked)}
                  />
                }
                label="Show only compatible templates"
              />
            )}
          </Box>
          
          <Chip
            icon={<VideoLibraryIcon />}
            label={`${selectedCount} templates selected`}
            color="primary"
            variant={selectedCount > 0 ? 'filled' : 'outlined'}
          />
        </Box>
      </Paper>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2 }}>
          <Typography color="error">Error loading templates: {error}</Typography>
        </Box>
      ) : filteredTemplates.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1">No templates found matching your criteria.</Typography>
          {showOnlyCompatible && platforms.length > 0 && (
            <Button
              variant="text"
              color="primary"
              onClick={() => setShowOnlyCompatible(false)}
              sx={{ mt: 1 }}
            >
              Show all templates
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredTemplates.map((template: Template) => {
            const isCompatible = isTemplateCompatible(template);
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={template.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    cursor: 'pointer',
                    border: selectedTemplatesMap[template.id] ? '2px solid' : '1px solid',
                    borderColor: selectedTemplatesMap[template.id] ? 'primary.main' : 'divider',
                    opacity: !isCompatible ? 0.7 : 1,
                    '&:hover': {
                      borderColor: selectedTemplatesMap[template.id] ? 'primary.main' : 'primary.light',
                      boxShadow: 2
                    }
                  }}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  {selectedTemplatesMap[template.id] && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1,
                        bgcolor: 'primary.main',
                        borderRadius: '50%',
                        p: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CheckCircleIcon sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                  )}
                  
                  <CardMedia
                    component="img"
                    height="140"
                    image={template.thumbnailUrl}
                    alt={template.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  
                  <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="subtitle2" noWrap title={template.name}>
                        {template.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowTemplateDetail(template);
                        }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        label={template.format}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                      
                      {template.platforms.slice(0, 2).map((platform: string) => (
                        <Chip
                          key={platform}
                          label={platform}
                          size="small"
                          color={platforms.includes(platform) ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      ))}
                      
                      {template.platforms.length > 2 && (
                        <Chip
                          label={`+${template.platforms.length - 2}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                    
                    {!isCompatible && showOnlyCompatible && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                        Not compatible with selected platforms
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
      
      {detailTemplate && (
        <TemplateDetailDialog
          open={openDetail}
          onClose={handleCloseTemplateDetail}
          template={detailTemplate}
        />
      )}
    </Box>
  );
};

export default TemplateSelectionStep;