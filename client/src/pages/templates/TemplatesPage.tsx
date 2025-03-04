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
import { fetchTemplates } from '../../store/slices/templatesSlice';
import TemplateCard from '../../components/templates/TemplateCard';
import TemplateDetailDialog from '../../components/templates/TemplateDetailDialog';

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
  
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [openTemplateDetail, setOpenTemplateDetail] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

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

  // Filter templates based on search query, platform, and format
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = selectedPlatform === 'all' || template.platforms.includes(selectedPlatform);
    const matchesFormat = selectedFormat === 'all' || template.format === selectedFormat;
    
    return matchesSearch && matchesPlatform && matchesFormat;
  });

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Template Browser
        </Typography>
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
          <Grid container spacing={3}>
            {filteredTemplates.map((template) => (
              <Grid item xs={12} sm={6} md={4} key={template.id}>
                <TemplateCard 
                  template={template}
                  onClick={() => handleTemplateClick(template)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography>Recent templates will appear here</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography>Favorite templates will appear here</Typography>
      </TabPanel>

      {/* Template Detail Dialog */}
      {selectedTemplate && (
        <TemplateDetailDialog
          open={openTemplateDetail}
          onClose={handleCloseTemplateDetail}
          template={selectedTemplate}
        />
      )}
    </Box>
  );
};

export default TemplatesPage;