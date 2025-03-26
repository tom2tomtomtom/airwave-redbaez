import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Paper,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchTemplates, deleteTemplate } from '../../store/slices/templatesSlice';
import TemplateCard from '../../components/templates/TemplateCard';
import TemplateDetailDialog from '../../components/templates/TemplateDetailDialog';
import ImportTemplateDialog from '../../components/templates/ImportTemplateDialog';
import ClientSelector from '../../components/clients/ClientSelector';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`templates-tabpanel-${index}`}
      aria-labelledby={`templates-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const platformOptions = [
  { value: 'all', label: 'All Platforms' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
];

const formatOptions = [
  { value: 'all', label: 'All Formats' },
  { value: 'square', label: 'Square' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'story', label: 'Story' },
];

const TemplatesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { templates, loading, error } = useSelector((state: RootState) => state.templates);
  const { selectedClientId } = useSelector((state: RootState) => state.clients);
  
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [openTemplateDetail, setOpenTemplateDetail] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  useEffect(() => {
    console.log('Fetching templates...');
    dispatch(fetchTemplates());
  }, [dispatch]);
  
  // Debug logger for templates with validation
  useEffect(() => {
    if (templates.length > 0) {
      console.log('Templates loaded:', templates.length);
      console.log('Format values:', templates.map(t => ({ id: t.id, name: t.name, format: t.format })));
      
      // Check for problematic templates
      const problematicTemplates = templates.filter(t => {
        // Check for templates with missing required properties or invalid formats
        return !t.id || !t.name || 
               !t.format || !['square', 'landscape', 'portrait', 'story'].includes(t.format) || 
               !t.platforms || !Array.isArray(t.platforms);
      });
      
      if (problematicTemplates.length > 0) {
        console.warn('Found problematic templates:', problematicTemplates);
      }
    }
  }, [templates]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handlePlatformChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPlatform(event.target.value);
  };

  const handleFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFormat(event.target.value);
  };

  const handleTemplateClick = (template: any) => {
    setSelectedTemplate(template);
    setOpenTemplateDetail(true);
  };

  const handleCloseTemplateDetail = () => {
    setOpenTemplateDetail(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    dispatch(deleteTemplate(templateId));
  };

  // Filter templates based on search query, platform, format, and client
  // Also filter out any invalid templates that might cause rendering issues
  const filteredTemplates = templates.filter(template => {
    // Skip invalid templates
    if (!template.id || !template.name || 
        !template.format || !['square', 'landscape', 'portrait', 'story'].includes(template.format) || 
        !template.platforms || !Array.isArray(template.platforms)) {
      return false;
    }
    
    // Make sure template has the required description property
    const description = template.description || '';
    
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          description.toLowerCase().includes(searchQuery.toLowerCase());
    // Fix platform filtering - ensure we properly check if platforms array exists and contains the selected platform
    const matchesPlatform = selectedPlatform === 'all' || 
      (Array.isArray(template.platforms) && template.platforms.some(p => 
        p.toLowerCase() === selectedPlatform.toLowerCase()
      ));
    const matchesFormat = selectedFormat === 'all' || template.format === selectedFormat;
    
    // Filter by client if one is selected
    const matchesClient = !selectedClientId || template.client_id === selectedClientId;
    
    return matchesSearch && matchesPlatform && matchesFormat && matchesClient;
  });

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Template Browser
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setOpenImportDialog(true)}
            disabled={loading}
          >
            Import Template
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={() => dispatch(fetchTemplates())}
            disabled={loading}
          >
            Refresh Templates
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="template tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All Templates" />
          <Tab label="Recent" />
          <Tab label="Favorites" />
        </Tabs>

        <Box sx={{ p: 2, mb: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter by Client
          </Typography>
          <ClientSelector />
        </Box>

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
            label="Platform"
            value={selectedPlatform}
            onChange={handlePlatformChange}
            size="small"
            sx={{ minWidth: 150 }}
          >
            {platformOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
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
      </Paper>

      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">Error loading templates: {error}</Typography>
        ) : filteredTemplates.length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              bgcolor: 'background.paper',
              borderRadius: 1
            }}
          >
            <Typography variant="h6" gutterBottom>
              No templates found
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {searchQuery || selectedPlatform !== 'all' || selectedFormat !== 'all'
                ? 'No templates match your current filters. Try adjusting your search criteria.'
                : 'No templates are available. Contact your administrator to add templates.'}
            </Typography>
          </Box>
        ) : (
          <Grid 
            container 
            spacing={3} 
            sx={{ 
              position: 'relative',
              mt: 1,
              mb: 4, // Add bottom margin to prevent overlap with any content below
              '& .MuiGrid-item': {
                // Add padding to grid items to prevent hover effects from getting cut off
                paddingTop: 1,
                paddingBottom: 1,
              }
            }}
          >
            {filteredTemplates.map((template) => (
              <Grid 
                item 
                xs={12} 
                sm={6} 
                md={4} 
                key={template.id}
                sx={{ 
                  overflow: 'visible' // Allow hover effects to overflow
                }}
              >
                <TemplateCard 
                  template={template}
                  onClick={() => handleTemplateClick(template)}
                  onDelete={handleDeleteTemplate}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredTemplates.length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              bgcolor: 'background.paper',
              borderRadius: 1
            }}
          >
            <Typography variant="h6" gutterBottom>
              No recent templates
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Recently viewed templates will appear here
            </Typography>
          </Box>
        ) : (
          <Grid 
            container 
            spacing={3} 
            sx={{ 
              position: 'relative',
              mt: 1,
              mb: 4,
              '& .MuiGrid-item': {
                paddingTop: 1,
                paddingBottom: 1,
              }
            }}
          >
            {/* Filter for recent templates - sorted by most recently updated */}
            {filteredTemplates
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 12) // Show only the 12 most recent templates
              .map((template) => (
                <Grid 
                  item 
                  xs={12} 
                  sm={6} 
                  md={4} 
                  key={template.id}
                  sx={{ 
                    overflow: 'visible'
                  }}
                >
                  <TemplateCard 
                    template={template}
                    onClick={() => handleTemplateClick(template)}
                    onDelete={handleDeleteTemplate}
                  />
                </Grid>
              ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredTemplates.filter(t => t.isFavorite).length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              bgcolor: 'background.paper',
              borderRadius: 1
            }}
          >
            <Typography variant="h6" gutterBottom>
              No favourites yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click the heart icon on templates to add them to your favourites
            </Typography>
          </Box>
        ) : (
          <Grid 
            container 
            spacing={3} 
            sx={{ 
              position: 'relative',
              mt: 1,
              mb: 4,
              '& .MuiGrid-item': {
                paddingTop: 1,
                paddingBottom: 1,
              }
            }}
          >
            {/* Show only favorite templates */}
            {filteredTemplates
              .filter(template => template.isFavorite)
              .map((template) => (
                <Grid 
                  item 
                  xs={12} 
                  sm={6} 
                  md={4} 
                  key={template.id}
                  sx={{ 
                    overflow: 'visible'
                  }}
                >
                  <TemplateCard 
                    template={template}
                    onClick={() => handleTemplateClick(template)}
                    onDelete={handleDeleteTemplate}
                  />
                </Grid>
              ))}
          </Grid>
        )}
      </TabPanel>

      {/* Template Detail Dialog */}
      {selectedTemplate && (
        <TemplateDetailDialog
          open={openTemplateDetail}
          onClose={handleCloseTemplateDetail}
          template={selectedTemplate}
        />
      )}
      
      {/* Import Template Dialog */}
      <ImportTemplateDialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
      />
    </Box>
  );
};

export default TemplatesPage;