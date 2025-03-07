import React from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Button, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import {
  Code as CodeIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Build as BuildIcon,
  Person as UserIcon,
  Campaign as AdvertisingIcon,
  Star as CreatorIcon,
  LocationOn as LocationIcon,
  DevicesOther as DevicesIcon,
} from '@mui/icons-material';

function FeatureCard({ icon, title, description }) {
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

function UserGroupCard({ icon, title, description, linkTo, linkText }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
        <Button
          component={Link}
          to={linkTo}
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
        >
          {linkText}
        </Button>
      </CardContent>
    </Card>
  );
}

function Home() {
  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          background: 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Typography variant="h3" gutterBottom>
          Welcome to Gringo Documentation
        </Typography>
        <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
          The complete guide to Gringo - A real-time geospatial social networking platform
        </Typography>
      </Paper>

      <Typography variant="h4" gutterBottom>
        About Gringo
      </Typography>
      <Typography variant="body1" paragraph>
        Gringo is a modern, full-stack social networking application that combines real-time messaging, 
        geolocation features, and user interactions. Our platform provides a unique social experience 
        centered around location, connecting users, creators, and businesses in meaningful ways.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FeatureCard
            icon={<LocationIcon color="primary" />}
            title="Geospatial"
            description="Location-based social interactions and content discovery"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FeatureCard
            icon={<SpeedIcon color="primary" />}
            title="Real-time"
            description="Instant messaging and live updates powered by Socket.IO"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FeatureCard
            icon={<SecurityIcon color="primary" />}
            title="Secure"
            description="Enterprise-grade security with JWT authentication and data protection"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FeatureCard
            icon={<DevicesIcon color="primary" />}
            title="Multi-platform"
            description="Available on web, iOS, and Android with consistent experience"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />
      
      <Typography variant="h4" gutterBottom>
        Documentation For Everyone
      </Typography>
      <Typography variant="body1" paragraph>
        Whether you're a developer integrating with our API, a user exploring the platform, 
        a content creator building your audience, or a business looking to advertise, 
        we have comprehensive documentation to help you succeed.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <UserGroupCard
            icon={<CodeIcon fontSize="large" color="primary" />}
            title="For Developers"
            description="Comprehensive API documentation, SDKs, integration guides, webhooks, bot development, and platform architecture details to help you build on the Gringo platform."
            linkTo="/authentication"
            linkText="Developer Docs"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <UserGroupCard
            icon={<UserIcon fontSize="large" color="primary" />}
            title="For Users"
            description="Step-by-step guides to using the Gringo platform, setting up your profile, connecting with others, sharing content, and managing your privacy settings."
            linkTo="/user-guide"
            linkText="User Guide"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <UserGroupCard
            icon={<CreatorIcon fontSize="large" color="primary" />}
            title="For Content Creators"
            description="Best practices for creating engaging content, building your audience, leveraging location data, and becoming an influential voice on the platform."
            linkTo="/content-creators"
            linkText="Creator Guide"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <UserGroupCard
            icon={<AdvertisingIcon fontSize="large" color="primary" />}
            title="For Businesses"
            description="Learn how to advertise on Gringo, reach targeted local audiences, create location-based campaigns, and measure performance with our analytics tools."
            linkTo="/advertising"
            linkText="Advertising Guide"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h4" gutterBottom>
        Getting Started
      </Typography>
      <Typography variant="body1" paragraph>
        New to Gringo? Start with our comprehensive getting started guide to understand
        the platform fundamentals and how to make the most of your experience.
      </Typography>
      <Button
        component={Link}
        to="/getting-started"
        variant="contained"
        color="primary"
        size="large"
        sx={{ mt: 1 }}
      >
        Get Started
      </Button>
    </Box>
  );
}

export default Home; 