import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from '@mui/material/styles';

import { 
  AppBar, 
  Box, 
  Toolbar, 
  IconButton, 
  Typography, 
  Drawer, 
  Divider, 
  List, 
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Image as ImageIcon,
  DesignServices as TemplateIcon,
  Campaign as CampaignIcon,
  Add as AddIcon,
  Movie as GenerateIcon,
  FileDownload as ExportIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Description as BriefIcon,
  Business as BusinessIcon,
  VideoLibrary as MovieIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';
import ClientSelector from './clients/ClientSelector';
import { GenerationProvider } from '../features/generation/context/GenerationContext';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: 0,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: drawerWidth,
  }),
}));

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { selectedClientId } = useSelector((state: RootState) => state.clients);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Define all navigation items - all require a client
  const navItems = [
    { text: 'Client', icon: <BusinessIcon />, path: '/client-dashboard' },
    { text: 'Strategy', icon: <BriefIcon />, path: '/briefs/strategy-development' },
    { text: 'Generate', icon: <GenerateIcon />, path: '/generate' },
    { text: 'Image to Video', icon: <MovieIcon />, path: '/generate/image-to-video' },
    { text: 'Assets', icon: <ImageIcon />, path: '/assets' },
    { text: 'Templates', icon: <TemplateIcon />, path: '/templates' },
    { text: 'Campaigns', icon: <CampaignIcon />, path: '/campaigns' },
    { text: 'Matrix', icon: <DashboardIcon />, path: '/matrix' },
    { text: 'Exports', icon: <ExportIcon />, path: '/exports' },
  ];

  // Show all items if a client is selected, otherwise show none
  const menuItems = selectedClientId ? navItems : [];
  
  // Add a special item for client selection when no client is selected
  if (!selectedClientId) {
    menuItems.push({ text: 'Select Client', icon: <BusinessIcon />, path: '/client-selection' });
  }

  const drawer = (
    <>
      <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
        <Box 
          onClick={() => {
            console.log('Logo clicked in drawer - navigating to client selection');
            window.location.href = '/client-selection';
            if (isMobile) setDrawerOpen(false);
          }}
          sx={{ 
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}
        >
          <Box
            component="img"
            src="https://res.cloudinary.com/dkl8kiemy/image/upload/v1742859138/Digital_Video_Camera_Logo_erpcdq.png"
            alt="AIrWAVE Logo"
            sx={{ 
              height: 240,
              width: 'auto',
              objectFit: 'contain',
              maxWidth: '100%'
            }}
          />
        </Box>
      </Toolbar>
      <Divider />
      <List>

        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => {
                console.log(`Navigating to: ${item.path}`);
                
                // All pages require a client except for the client selection page
                if (!selectedClientId && item.path !== '/client-selection') {
                  console.log('No client selected, redirecting to client selection');
                  navigate('/client-selection');
                  return;
                }
                
                // Use the path as defined in the navigation item
                navigate(item.path);
                console.log(`Navigated to: ${item.path}`);
                
                if (isMobile) setDrawerOpen(false);
              }}
              selected={window.location.pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { sm: `${drawerOpen ? drawerWidth : 0}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Box 
            onClick={() => {
              console.log('Header logo clicked - navigating to client selection');
              window.location.href = '/client-selection';
            }}
            sx={{ 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Box
              component="img"
              src="https://res.cloudinary.com/dkl8kiemy/image/upload/v1742859138/Digital_Video_Camera_Logo_erpcdq.png"
              alt="AIrWAVE Logo"
              sx={{ 
                height: 280, 
                mr: 2,
                objectFit: 'contain',
                flexGrow: 0,
                display: 'block',
                maxHeight: '80px'
              }}
            />
          </Box>
          
          <Box sx={{ flexGrow: 1 }}></Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              {user?.name || 'User'}
            </Typography>
            <IconButton color="inherit">
              <AccountIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Main open={drawerOpen} sx={{ flexGrow: 1 }}>
        <Toolbar /> {/* Spacer for the fixed AppBar */}
        <GenerationProvider>
          <Outlet />
        </GenerationProvider>
      </Main>
    </Box>
  );
};

export default Layout;