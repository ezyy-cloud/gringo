import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Build as BuildIcon,
  BugReport as BugReportIcon,
  Webhook as WebhookIcon,
  Person as PersonIcon,
  Campaign as CampaignIcon,
  SmartToy as BotIcon,
  ExpandLess,
  ExpandMore,
  SupportAgent as SupportIcon,
  Architecture as ArchitectureIcon,
  Star as StarIcon,
  Storage as StorageIcon,
  PhoneAndroid as MobileIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

import Home from '../pages/Home';
import Authentication from '../pages/Authentication';
import Endpoints from '../pages/Endpoints';
import Analytics from '../pages/Analytics';
import BotDevelopment from '../pages/BotDevelopment';
import ErrorHandling from '../pages/ErrorHandling';
import Webhooks from '../pages/Webhooks';
import GettingStarted from '../pages/GettingStarted';
import UserGuide from '../pages/UserGuide';
import ContentCreators from '../pages/ContentCreators';
import InfluencerGuide from '../pages/InfluencerGuide';
import Advertising from '../pages/Advertising';
import PlatformArchitecture from '../pages/PlatformArchitecture';
import MobileIntegration from '../pages/MobileIntegration';
import GeolocationFeatures from '../pages/GeolocationFeatures';
import DataModels from '../pages/DataModels';

const drawerWidth = 280;

const menuSections = [
  {
    title: "Getting Started",
    items: [
      { text: 'Home', icon: <HomeIcon />, path: '/' },
      { text: 'Getting Started', icon: <SupportIcon />, path: '/getting-started' },
    ]
  },
  {
    title: "For Developers",
    items: [
      { text: 'Authentication', icon: <SecurityIcon />, path: '/authentication' },
      { text: 'API Endpoints', icon: <CodeIcon />, path: '/endpoints' },
      { text: 'Bot Development', icon: <BotIcon />, path: '/bot-development' },
      { text: 'Webhooks', icon: <WebhookIcon />, path: '/webhooks' },
      { text: 'Error Handling', icon: <BugReportIcon />, path: '/error-handling' },
      { text: 'Platform Architecture', icon: <ArchitectureIcon />, path: '/platform-architecture' },
      { text: 'Data Models', icon: <StorageIcon />, path: '/data-models' },
      { text: 'Mobile Integration', icon: <MobileIcon />, path: '/mobile-integration' },
      { text: 'Geolocation Features', icon: <LocationIcon />, path: '/geolocation-features' },
    ]
  },
  {
    title: "For Users",
    items: [
      { text: 'User Guide', icon: <PersonIcon />, path: '/user-guide' },
      { text: 'Analytics & Insights', icon: <AnalyticsIcon />, path: '/analytics' },
    ]
  },
  {
    title: "For Content Creators",
    items: [
      { text: 'Content Creator Guide', icon: <BuildIcon />, path: '/content-creators' },
      { text: 'Influencer Guide', icon: <StarIcon />, path: '/influencer-guide' },
    ]
  },
  {
    title: "For Businesses",
    items: [
      { text: 'Advertising', icon: <CampaignIcon />, path: '/advertising' },
    ]
  },
];

function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState({});

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSectionToggle = (sectionTitle) => {
    setOpenSections({
      ...openSections,
      [sectionTitle]: !openSections[sectionTitle]
    });
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Gringo Documentation
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuSections.map((section) => (
          <React.Fragment key={section.title}>
            <ListItem 
              button 
              onClick={() => handleSectionToggle(section.title)}
              sx={{ bgcolor: 'rgba(0, 0, 0, 0.04)' }}
            >
              <ListItemText primary={section.title} />
              {openSections[section.title] ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={openSections[section.title] !== false} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {section.items.map((item) => (
                  <ListItem
                    button
                    component={Link}
                    to={item.path}
                    key={item.text}
                    onClick={isMobile ? handleDrawerToggle : undefined}
                    sx={{ pl: 4 }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItem>
                ))}
              </List>
            </Collapse>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Gringo Platform Documentation
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
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

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/getting-started" element={<GettingStarted />} />
          <Route path="/authentication" element={<Authentication />} />
          <Route path="/endpoints" element={<Endpoints />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/bot-development" element={<BotDevelopment />} />
          <Route path="/error-handling" element={<ErrorHandling />} />
          <Route path="/webhooks" element={<Webhooks />} />
          <Route path="/user-guide" element={<UserGuide />} />
          <Route path="/content-creators" element={<ContentCreators />} />
          <Route path="/influencer-guide" element={<InfluencerGuide />} />
          <Route path="/advertising" element={<Advertising />} />
          <Route path="/platform-architecture" element={<PlatformArchitecture />} />
          <Route path="/mobile-integration" element={<MobileIntegration />} />
          <Route path="/geolocation-features" element={<GeolocationFeatures />} />
          <Route path="/data-models" element={<DataModels />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default Layout; 