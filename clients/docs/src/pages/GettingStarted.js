import React from 'react';
import { Box, Typography, Paper, Divider, Grid, Card, CardContent, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import {
  Check as CheckIcon,
  Devices as DevicesIcon,
  Language as WebIcon,
  Android as AndroidIcon,
  Apple as AppleIcon,
} from '@mui/icons-material';
import CodeBlock from '../components/CodeBlock';

function PlatformCard({ icon, title, description }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

function GettingStarted() {
  const installationExample = `
# Install the Gringo mobile app
# iOS: Download from the App Store
# Android: Download from Google Play

# For web access
Visit https://gringo.example.com

# For developers
git clone <repository-url>
cd gringo
npm run install-all
npm start
`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Getting Started with Gringo
      </Typography>
      <Typography variant="body1" paragraph>
        Welcome to Gringo, a real-time geospatial social networking platform that connects you with people, places, and experiences around you. This guide will help you understand the platform and get started quickly.
      </Typography>

      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          What is Gringo?
        </Typography>
        <Typography variant="body1" paragraph>
          Gringo is a modern social networking platform that combines real-time communication with location-based features. Whether you're looking to connect with people nearby, discover local events, share your experiences, or build applications on our platform, Gringo provides the tools and infrastructure you need.
        </Typography>
        <Typography variant="body1" paragraph>
          Our platform serves multiple types of users:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Regular Users" 
              secondary="People looking to connect, share, and discover content based on location" 
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Content Creators" 
              secondary="Individuals creating engaging location-based content for followers" 
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Influencers" 
              secondary="Users with large followings who create trends and drive engagement" 
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Businesses" 
              secondary="Companies looking to advertise and engage with local audiences" 
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Developers" 
              secondary="Engineers building applications, bots, and integrations using our API" 
            />
          </ListItem>
        </List>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Platform Overview
      </Typography>
      <Typography variant="body1" paragraph>
        Gringo is available across multiple platforms to ensure you can access it wherever you are:
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <PlatformCard
            icon={<WebIcon color="primary" />}
            title="Web Application"
            description="Access Gringo from any modern web browser at gringo.example.com"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <PlatformCard
            icon={<AndroidIcon color="primary" />}
            title="Android App"
            description="Download the Gringo app from Google Play Store for Android devices"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <PlatformCard
            icon={<AppleIcon color="primary" />}
            title="iOS App"
            description="Download the Gringo app from Apple App Store for iPhone and iPad"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Core Features
      </Typography>
      <Typography variant="body1" paragraph>
        Gringo offers a variety of features designed to enhance your social experience:
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Real-Time Messaging
            </Typography>
            <Typography variant="body2">
              Instantly connect with others through our real-time messaging system powered by Socket.IO.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Geolocation Integration
            </Typography>
            <Typography variant="body2">
              Discover content, people, and events based on your location with our MapBox integration.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Media Sharing
            </Typography>
            <Typography variant="body2">
              Share photos and media with your followers using our Cloudinary integration.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              User Connections
            </Typography>
            <Typography variant="body2">
              Follow other users, grow your audience, and build your network on the platform.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Installation & Setup
      </Typography>
      <Typography variant="body1" paragraph>
        Getting started with Gringo is simple. Choose the platform that works best for you:
      </Typography>

      <CodeBlock code={installationExample} language="bash" />

      <Typography variant="h5" sx={{ mt: 4 }} gutterBottom>
        Next Steps
      </Typography>
      <Typography variant="body1" paragraph>
        Depending on your role, you may want to check out the following resources:
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            <DevicesIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="For Users" 
            secondary="Check out our User Guide to learn how to set up your profile, connect with others, and share content." 
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <DevicesIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="For Content Creators & Influencers" 
            secondary="See our Content Creator Guide to learn best practices for creating engaging content and growing your audience." 
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <DevicesIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="For Businesses" 
            secondary="Review our Advertising Guide to understand how to create effective advertising campaigns on our platform." 
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <DevicesIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="For Developers" 
            secondary="Explore our API documentation, SDKs, and integration guides to build on the Gringo platform." 
          />
        </ListItem>
      </List>
    </Box>
  );
}

export default GettingStarted; 