import React, { useState } from 'react';
import { Box, Typography, Paper, Divider, Grid, Tabs, Tab, List, ListItem, ListItemIcon, ListItemText, Card, CardContent, CardMedia } from '@mui/material';
import {
  Person as ProfileIcon,
  LocationOn as LocationIcon,
  Message as MessageIcon,
  Notifications as NotificationIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  PhotoCamera as CameraIcon,
  Favorite as LikeIcon,
} from '@mui/icons-material';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

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

function UserGuide() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Guide
      </Typography>
      <Typography variant="body1" paragraph>
        Welcome to the Gringo User Guide. This comprehensive resource will help you navigate the platform, set up your profile, connect with others, share content, and manage your privacy settings.
      </Typography>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Getting Started" />
          <Tab label="Profile Setup" />
          <Tab label="Content Sharing" />
          <Tab label="Geolocation" />
          <Tab label="Messaging" />
          <Tab label="Privacy & Settings" />
        </Tabs>

        <TabPanel value={value} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Getting Started with Gringo
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo is a location-based social network that connects you with people, places, and experiences around you. Here's how to get started:
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <ProfileIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Create an Account"
                  secondary="Download the app from your app store or visit our website. Sign up with your email, phone number, or existing social accounts."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Enable Location Services"
                  secondary="Allow Gringo to access your location to discover content and connect with people nearby."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <ProfileIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Complete Your Profile"
                  secondary="Add a profile picture, cover color, and bio to help others get to know you."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SearchIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Discover Content"
                  secondary="Explore the feed to find posts from users in your area or topics of interest."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <MessageIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Start Connecting"
                  secondary="Follow users, engage with content, and start creating your own posts."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Profile Setup
            </Typography>
            <Typography variant="body1" paragraph>
              Your profile is your identity on Gringo. Make it compelling and representative of who you are:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<ProfileIcon color="primary" />}
                  title="Profile Picture"
                  description="Upload a clear, recognizable photo. You can take a new photo with the app or choose from your gallery."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<CameraIcon color="primary" />}
                  title="Cover Color"
                  description="Select a theme color that represents your personality and makes your profile unique."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<MessageIcon color="primary" />}
                  title="Bio Information"
                  description="Write a brief description about yourself, including your interests, location, and what you're looking to share on Gringo."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<SettingsIcon color="primary" />}
                  title="Theme Preferences"
                  description="Choose between light and dark mode for your app experience."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Profile Tips
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Be authentic in your profile information"
                  secondary="Users appreciate genuine connections"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Update your profile regularly"
                  secondary="Keep your information and interests current"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Engage with your followers"
                  secondary="Respond to comments and messages to build community"
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Content Sharing
            </Typography>
            <Typography variant="body1" paragraph>
              Sharing content on Gringo is easy and highly interactive:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Creating Posts
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <MessageIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Text Posts"
                  secondary="Share thoughts, updates, and information with your followers and local community."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CameraIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Photo Sharing"
                  secondary="Take a photo directly in the app or upload one from your gallery to share with others."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Tagging"
                  secondary="Tag your current location or choose a specific place to associate with your post."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Engaging with Content
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <LikeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Likes"
                  secondary="Show appreciation for content by liking posts."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <MessageIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Comments"
                  secondary="Engage in conversations by commenting on posts."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <ProfileIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Following"
                  secondary="Follow users to see their content in your feed regularly."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Geolocation Features
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo's core functionality revolves around location-based social networking. Here's how to make the most of our geolocation features:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<LocationIcon color="primary" />}
                  title="Location Discovery"
                  description="Discover content, users, and events near your current location."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<SearchIcon color="primary" />}
                  title="Map View"
                  description="Explore content on an interactive map to find posts from specific areas."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<LocationIcon color="primary" />}
                  title="Place Tagging"
                  description="Tag specific locations, businesses, or landmarks in your posts."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<NotificationIcon color="primary" />}
                  title="Location Alerts"
                  description="Receive notifications about popular content or events happening nearby."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Privacy Considerations
            </Typography>
            <Typography variant="body1" paragraph>
              While location sharing enhances your experience, your privacy remains important:
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Precise vs. Approximate Location"
                  secondary="Choose whether to share your exact location or just a general area."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Temporary Sharing"
                  secondary="Turn location sharing on only when needed and off when preferred."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={4}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Messaging & Real-Time Communication
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo offers powerful messaging features for connecting with other users:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Direct Messaging
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <MessageIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Starting Conversations"
                  secondary="Message any user directly by visiting their profile and selecting the message option."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CameraIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Media Sharing"
                  secondary="Share photos and media directly in your private conversations."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <NotificationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Typing Indicators"
                  secondary="See when someone is typing a response in real-time."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Sharing"
                  secondary="Share your location with specific users through direct messages."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Group Conversations
            </Typography>
            <Typography variant="body1" paragraph>
              Connect with multiple users simultaneously:
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <ProfileIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Creating Groups"
                  secondary="Create group conversations with multiple users for planning events or discussions."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <NotificationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Notifications"
                  secondary="Customize notifications for different conversations and groups."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={5}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Privacy & Settings
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo gives you control over your data and experience:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Privacy Controls
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Profile Visibility"
                  secondary="Choose who can see your profile, posts, and location information."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Blocking Users"
                  secondary="Block specific users from seeing your content or contacting you."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Privacy"
                  secondary="Control when and how your location is shared with others."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Account Settings
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SettingsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Theme Preferences"
                  secondary="Toggle between light and dark mode."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <NotificationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Notification Settings"
                  secondary="Customize which notifications you receive and how."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Security Settings"
                  secondary="Update your password, enable two-factor authentication, and review active sessions."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <ProfileIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Account Management"
                  secondary="Update your email, phone number, or deactivate your account if needed."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Tips for a Great Experience
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Stay Active
            </Typography>
            <Typography variant="body2">
              Regular posting and engagement help build your network and visibility.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Be Location-Aware
            </Typography>
            <Typography variant="body2">
              Update your location when traveling to discover new content and people.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Respect Community Guidelines
            </Typography>
            <Typography variant="body2">
              Follow our community standards to ensure a positive experience for all users.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default UserGuide; 