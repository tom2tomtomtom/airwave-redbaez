import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Button,
  Divider,
  SelectChangeEvent
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import { RootState, AppDispatch } from '../../store';
import { Campaign } from '../../types/campaigns';
import { 
  selectAllCampaigns, 
  fetchCampaigns 
} from '../../store/slices/campaignsSlice';

// Mock data for analytics (in a real app, this would come from an API)
const mockViewsData = [
  { date: '2025-02-01', views: 1200, engagement: 320, shares: 45 },
  { date: '2025-02-02', views: 1800, engagement: 390, shares: 52 },
  { date: '2025-02-03', views: 2400, engagement: 580, shares: 78 },
  { date: '2025-02-04', views: 2000, engagement: 400, shares: 64 },
  { date: '2025-02-05', views: 2800, engagement: 670, shares: 92 },
  { date: '2025-02-06', views: 3600, engagement: 890, shares: 145 },
  { date: '2025-02-07', views: 3200, engagement: 750, shares: 98 },
  { date: '2025-02-08', views: 3900, engagement: 920, shares: 156 },
  { date: '2025-02-09', views: 4200, engagement: 1100, shares: 187 },
  { date: '2025-02-10', views: 3800, engagement: 950, shares: 165 },
  { date: '2025-02-11', views: 4600, engagement: 1300, shares: 210 },
  { date: '2025-02-12', views: 5200, engagement: 1450, shares: 245 },
  { date: '2025-02-13', views: 4800, engagement: 1280, shares: 198 },
  { date: '2025-02-14', views: 5500, engagement: 1600, shares: 267 },
];

const mockPlatformData = [
  { name: 'Facebook', value: 35 },
  { name: 'Instagram', value: 40 },
  { name: 'YouTube', value: 15 },
  { name: 'TikTok', value: 10 },
];

const mockPerformanceData = [
  { name: '16:9', views: 5200, engagement: 1450, shares: 245, ctr: 3.8 },
  { name: '9:16', views: 7800, engagement: 2340, shares: 412, ctr: 5.2 },
  { name: '1:1', views: 6200, engagement: 1860, shares: 324, ctr: 4.2 },
  { name: '4:5', views: 4800, engagement: 1440, shares: 262, ctr: 3.6 },
];

const mockAudienceData = [
  { name: 'Male', value: 45 },
  { name: 'Female', value: 55 },
];

const mockAgeData = [
  { name: '18-24', value: 22 },
  { name: '25-34', value: 38 },
  { name: '35-44', value: 26 },
  { name: '45-54', value: 10 },
  { name: '55+', value: 4 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AnalyticsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  // Use selector
  const campaigns = useSelector(selectAllCampaigns);
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30days');
  
  // In a real app, we would fetch analytics data based on selectedCampaignId and dateRange
  
  // Load campaigns on component mount
  useEffect(() => {
    // Fetch campaigns if not already loaded
    if (campaigns.length === 0) {
      dispatch(fetchCampaigns());
    }
  }, [dispatch, campaigns.length]);
  
  // Simulated data loading effect
  useEffect(() => {
    if (selectedCampaignId) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [selectedCampaignId, dateRange]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleCampaignChange = (event: SelectChangeEvent<string>) => {
    setSelectedCampaignId(event.target.value);
  };
  
  const handleDateRangeChange = (event: SelectChangeEvent<string>) => {
    setDateRange(event.target.value);
  };
  
  const formatDateString = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Summary metrics calculated from mock data
  const getTotalViews = () => {
    return mockViewsData.reduce((sum, item) => sum + item.views, 0);
  };
  
  const getTotalEngagement = () => {
    return mockViewsData.reduce((sum, item) => sum + item.engagement, 0);
  };
  
  const getTotalShares = () => {
    return mockViewsData.reduce((sum, item) => sum + item.shares, 0);
  };
  
  const getEngagementRate = () => {
    const totalViews = getTotalViews();
    const totalEngagement = getTotalEngagement();
    return totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : 0;
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Campaign Analytics
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="campaign-select-label">Select Campaign</InputLabel>
              <Select
                labelId="campaign-select-label"
                value={selectedCampaignId}
                onChange={handleCampaignChange}
                label="Select Campaign"
              >
                <MenuItem value="">
                  <em>Select a campaign</em>
                </MenuItem>
                {/* Add Campaign type */}
                {campaigns.map((campaign: Campaign) => (
                  <MenuItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="date-range-select-label">Date Range</InputLabel>
              <Select
                labelId="date-range-select-label"
                value={dateRange}
                onChange={handleDateRangeChange}
                label="Date Range"
                startAdornment={<CalendarMonthIcon sx={{ mr: 1 }} />}
              >
                <MenuItem value="7days">Last 7 Days</MenuItem>
                <MenuItem value="14days">Last 14 Days</MenuItem>
                <MenuItem value="30days">Last 30 Days</MenuItem>
                <MenuItem value="90days">Last 90 Days</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {selectedCampaignId ? (
        loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      Total Views
                    </Typography>
                    <Typography variant="h4" component="div" color="primary">
                      {getTotalViews().toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Across all platforms
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      Total Engagement
                    </Typography>
                    <Typography variant="h4" component="div" color="primary">
                      {getTotalEngagement().toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Likes, comments, clicks
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      Engagement Rate
                    </Typography>
                    <Typography variant="h4" component="div" color="primary">
                      {getEngagementRate()}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vs. industry avg 3.2%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      Total Shares
                    </Typography>
                    <Typography variant="h4" component="div" color="primary">
                      {getTotalShares().toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Across all platforms
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Tabs for different analytics views */}
            <Box sx={{ width: '100%', mb: 3 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  aria-label="analytics tabs"
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab label="Performance Over Time" />
                  <Tab label="Platform Breakdown" />
                  <Tab label="Format Comparison" />
                  <Tab label="Audience Insights" />
                </Tabs>
              </Box>
              
              {/* Tab 1: Performance Over Time */}
              {tabValue === 0 && (
                <Box sx={{ pt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Performance Metrics Over Time
                  </Typography>
                  
                  <Box sx={{ height: 400, mt: 3 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={mockViewsData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDateString}
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString(), '']}
                          labelFormatter={(label) => `Date: ${formatDateString(label)}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="views"
                          stroke="#8884d8"
                          name="Views"
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="engagement"
                          stroke="#82ca9d"
                          name="Engagement"
                        />
                        <Line
                          type="monotone"
                          dataKey="shares"
                          stroke="#ffc658"
                          name="Shares"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button startIcon={<DownloadIcon />} variant="outlined" sx={{ mr: 1 }}>
                      Export Data
                    </Button>
                    <Button startIcon={<ShareIcon />} variant="outlined">
                      Share Report
                    </Button>
                  </Box>
                </Box>
              )}
              
              {/* Tab 2: Platform Breakdown */}
              {tabValue === 1 && (
                <Box sx={{ pt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Performance by Platform
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={mockPlatformData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {mockPlatformData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        Platform Performance Summary
                      </Typography>
                      
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Facebook', views: 15400, engagement: 4200 },
                              { name: 'Instagram', views: 18200, engagement: 5800 },
                              { name: 'YouTube', views: 7600, engagement: 1900 },
                              { name: 'TikTok', views: 3800, engagement: 1400 },
                            ]}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="views" name="Views" fill="#8884d8" />
                            <Bar dataKey="engagement" name="Engagement" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              {/* Tab 3: Format Comparison */}
              {tabValue === 2 && (
                <Box sx={{ pt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Performance by Format
                  </Typography>
                  
                  <Box sx={{ height: 400, mt: 3 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={mockPerformanceData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="views" name="Views" fill="#8884d8" />
                        <Bar dataKey="engagement" name="Engagement" fill="#82ca9d" />
                        <Bar dataKey="shares" name="Shares" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  <Typography variant="subtitle1" sx={{ mt: 4, mb: 2 }}>
                    Format CTR Comparison
                  </Typography>
                  
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={mockPerformanceData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}%`, 'CTR']} />
                        <Legend />
                        <Bar dataKey="ctr" name="Click-Through Rate (%)" fill="#ff7300" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              )}
              
              {/* Tab 4: Audience Insights */}
              {tabValue === 3 && (
                <Box sx={{ pt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Audience Demographics
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        Gender Distribution
                      </Typography>
                      
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={mockAudienceData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {mockAudienceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        Age Distribution
                      </Typography>
                      
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={mockAgeData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {mockAgeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Audience Engagement by Platform
                      </Typography>
                      
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Male 18-24', facebook: 22, instagram: 35, youtube: 18, tiktok: 25 },
                              { name: 'Male 25-34', facebook: 30, instagram: 25, youtube: 22, tiktok: 15 },
                              { name: 'Female 18-24', facebook: 18, instagram: 38, youtube: 15, tiktok: 32 },
                              { name: 'Female 25-34', facebook: 28, instagram: 32, youtube: 20, tiktok: 18 },
                            ]}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="facebook" name="Facebook" fill="#4267B2" />
                            <Bar dataKey="instagram" name="Instagram" fill="#C13584" />
                            <Bar dataKey="youtube" name="YouTube" fill="#FF0000" />
                            <Bar dataKey="tiktok" name="TikTok" fill="#69C9D0" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          </>
        )
      ) : (
        <Alert severity="info">
          Please select a campaign to view analytics data.
        </Alert>
      )}
    </Box>
  );
};

export default AnalyticsPage;
