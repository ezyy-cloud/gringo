import React, { useState } from 'react';
import { Box, Typography, Paper, Divider, Grid, Tabs, Tab, List, ListItem, ListItemIcon, ListItemText, Card, CardContent } from '@mui/material';
import {
  LocationOn as LocationIcon,
  MyLocation as PreciseLocationIcon,
  Map as MapIcon,
  Search as SearchIcon,
  NotificationsActive as NotificationIcon,
  Security as SecurityIcon,
  Code as CodeIcon,
  Timeline as AnalyticsIcon,
  Speed as PerformanceIcon,
} from '@mui/icons-material';
import CodeBlock from '../components/CodeBlock';

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

function GeolocationFeatures() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const proximityQueryCode = `
// Finding messages within 2km of a specific location
db.messages.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-74.0060, 40.7128]  // Manhattan
      },
      $maxDistance: 2000  // 2km radius
    }
  }
})
  
// Using geoWithin for a custom polygon area (e.g., a neighborhood)
db.messages.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-74.01, 40.71],  // Array of coordinate pairs defining polygon vertices
          [-74.01, 40.73],
          [-73.98, 40.73],
          [-73.98, 40.71],
          [-74.01, 40.71]   // First and last points must be identical to close the polygon
        ]]
      }
    }
  }
})
  
// Finding nearby users from a given point with sorting by distance
db.users.aggregate([
  {
    $geoNear: {
      near: {
        type: "Point",
        coordinates: [-74.0060, 40.7128]
      },
      distanceField: "distance",
      maxDistance: 5000,
      spherical: true
    }
  },
  {
    $sort: { distance: 1 }  // Sort by closest first
  },
  {
    $limit: 20              // Return only 20 nearest users
  }
])`;

  const geofencingCode = `
// Client-side geofencing check
function isWithinGeofence(userLocation, geofence) {
  const { latitude, longitude } = userLocation;
  
  // For circular geofence
  if (geofence.type === 'circle') {
    const distance = calculateDistance(
      latitude, 
      longitude,
      geofence.center.latitude,
      geofence.center.longitude
    );
    return distance <= geofence.radius;
  }
  
  // For polygon geofence
  if (geofence.type === 'polygon') {
    return isPointInPolygon([longitude, latitude], geofence.coordinates);
  }
  
  return false;
}

// Server-side geofence notification trigger
app.post('/api/v1/location/update', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;
    
    // Update user's location
    await User.findByIdAndUpdate(userId, {
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });
    
    // Check for any geofence triggers
    const activeGeofences = await Geofence.find({
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    for (const fence of activeGeofences) {
      const isInside = await checkIfLocationInGeofence(
        [longitude, latitude], 
        fence
      );
      
      if (isInside) {
        // Trigger notification or event
        await createGeofenceNotification(userId, fence);
      }
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});`;

  const mapIntegrationCode = `
// React component for location map with Mapbox
import React, { useState, useEffect } from 'react';
import ReactMapGL, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

function LocationMap({ userLocation, nearbyPosts }) {
  const [viewport, setViewport] = useState({
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    zoom: 14,
    bearing: 0,
    pitch: 0
  });
  
  const [selectedPost, setSelectedPost] = useState(null);
  
  return (
    <ReactMapGL
      {...viewport}
      width="100%"
      height="100%"
      mapStyle="mapbox://styles/mapbox/streets-v11"
      mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
      onViewportChange={nextViewport => setViewport(nextViewport)}
    >
      {/* User location marker */}
      <Marker 
        latitude={userLocation.latitude} 
        longitude={userLocation.longitude}
      >
        <div className="user-marker">
          <img src="/user-marker.svg" alt="You are here" />
        </div>
      </Marker>
      
      {/* Post markers */}
      {nearbyPosts.map(post => (
        <Marker 
          key={post.id}
          latitude={post.location.coordinates[1]} 
          longitude={post.location.coordinates[0]}
        >
          <div 
            className="post-marker"
            onClick={() => setSelectedPost(post)}
          >
            <img src="/post-marker.svg" alt="Post" />
          </div>
        </Marker>
      ))}
      
      {/* Popup for selected post */}
      {selectedPost && (
        <Popup
          latitude={selectedPost.location.coordinates[1]}
          longitude={selectedPost.location.coordinates[0]}
          onClose={() => setSelectedPost(null)}
          closeOnClick={false}
        >
          <div>
            <h3>{selectedPost.title}</h3>
            <p>{selectedPost.content.substring(0, 100)}...</p>
            <p>Posted by: {selectedPost.username}</p>
          </div>
        </Popup>
      )}
    </ReactMapGL>
  );
}`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Geolocation Features
      </Typography>
      <Typography variant="body1" paragraph>
        Gringo's geolocation capabilities are core to the platform's functionality, enabling location-based 
        content discovery, proximity-based social networking, and contextual experiences. This documentation 
        explains how our geolocation features work and how to implement them in your applications.
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
          <Tab label="Core Features" />
          <Tab label="Proximity Search" />
          <Tab label="Geofencing" />
          <Tab label="Map Integration" />
          <Tab label="Implementation" />
          <Tab label="Privacy & Security" />
        </Tabs>

        <TabPanel value={value} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Core Geolocation Features
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo's platform is built around several key geolocation capabilities that enable 
              location-aware social networking:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <FeatureCard
                  icon={<LocationIcon color="primary" />}
                  title="Location-Based Content"
                  description="All content can be associated with specific locations, enabling contextual discovery and geographic organization."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FeatureCard
                  icon={<SearchIcon color="primary" />}
                  title="Proximity Search"
                  description="Find content, users, and places near a specific location using powerful geospatial querying capabilities."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FeatureCard
                  icon={<NotificationIcon color="primary" />}
                  title="Geofencing"
                  description="Create virtual boundaries that trigger notifications and actions when users enter or exit defined areas."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FeatureCard
                  icon={<MapIcon color="primary" />}
                  title="Interactive Maps"
                  description="Visualize content and users on interactive maps using MapBox integration for rich geographic context."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FeatureCard
                  icon={<PreciseLocationIcon color="primary" />}
                  title="Location Tracking"
                  description="Optional real-time user location tracking for enhanced location-based features and user experiences."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FeatureCard
                  icon={<AnalyticsIcon color="primary" />}
                  title="Location Analytics"
                  description="Insights into content performance and user engagement across different geographic areas."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Geospatial Data Structure
            </Typography>
            <Typography variant="body1" paragraph>
              Our platform uses GeoJSON-compatible structures for storing location data:
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Point Locations"
                  secondary="Precise coordinates stored as [longitude, latitude] arrays representing exact locations."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Polygon Areas"
                  secondary="Arrays of coordinate pairs defining boundaries of neighborhoods, districts, or custom areas."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Place References"
                  secondary="Named locations with unique placeId values that can be referenced across the platform."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="2dsphere Indexing"
                  secondary="MongoDB 2dsphere indexes enable efficient geospatial queries on location data."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Proximity Search
            </Typography>
            <Typography variant="body1" paragraph>
              Proximity search is a core functionality that enables users to discover content and connections
              based on geographic proximity.
            </Typography>

            <Typography variant="h6" gutterBottom>
              Proximity Query Types
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SearchIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Radial Search"
                  secondary="Find entities within a specified radius from a given point, ordered by distance."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SearchIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Polygon Search"
                  secondary="Find entities within a custom-defined polygon area (e.g., a neighborhood boundary)."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SearchIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Box Search"
                  secondary="Find entities within a rectangular bounding box defined by two corner coordinates."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SearchIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Place-Based Search"
                  secondary="Find entities associated with a specific named place or location."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Query Examples
            </Typography>
            <Typography variant="body1" paragraph>
              The following examples show how to perform proximity searches using our MongoDB database:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={proximityQueryCode}
                language="javascript"
              />
            </Paper>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Performance Optimization
            </Typography>
            <Typography variant="body1" paragraph>
              Geospatial queries can be resource-intensive. We optimize performance through:
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <PerformanceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Compound Indexes"
                  secondary="Combining geospatial indexes with other fields for efficient filtered queries."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PerformanceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Result Limiting"
                  secondary="Setting appropriate limits on result sets to avoid excessive data transfer."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PerformanceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Geospatial Caching"
                  secondary="Caching common proximity query results to reduce database load."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Geofencing
            </Typography>
            <Typography variant="body1" paragraph>
              Geofencing creates virtual boundaries around geographic areas that can trigger notifications
              or actions when users enter, exit, or dwell within them.
            </Typography>

            <Typography variant="h6" gutterBottom>
              Geofence Types
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<LocationIcon color="primary" />}
                  title="Circular Geofences"
                  description="Defined by a center point and radius, creating a circular boundary area."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<LocationIcon color="primary" />}
                  title="Polygon Geofences"
                  description="Defined by a series of points forming a custom shape boundary area."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<NotificationIcon color="primary" />}
                  title="Event-Based Geofences"
                  description="Temporary geofences associated with events or time-limited activities."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<LocationIcon color="primary" />}
                  title="Place-Based Geofences"
                  description="Geofences automatically generated around points of interest or named places."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Geofencing Implementation
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo implements geofencing through a combination of client-side and server-side processing:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={geofencingCode}
                language="javascript"
              />
            </Paper>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Geofence Use Cases
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <NotificationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Local Notifications"
                  secondary="Alert users about trending content or activity when they enter a location."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <NotificationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Event Check-ins"
                  secondary="Automatic check-ins or prompts when users arrive at event locations."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <NotificationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Content Unlocking"
                  secondary="Reveal special content or features only when users are in specific locations."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Analytics"
                  secondary="Track user movement patterns through defined geographic areas."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Map Integration
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo integrates with MapBox to provide rich, interactive mapping experiences that visualize
              location-based content and connections.
            </Typography>

            <Typography variant="h6" gutterBottom>
              Map Features
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<MapIcon color="primary" />}
                  title="Content Maps"
                  description="Visualize posts, events, and content on interactive maps with custom markers and popups."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<MapIcon color="primary" />}
                  title="User Location"
                  description="Display user's current location and enable location-based interactions."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<MapIcon color="primary" />}
                  title="Heatmaps"
                  description="Visualize content density and activity levels across geographic areas."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<MapIcon color="primary" />}
                  title="Custom Styling"
                  description="Apply custom map styles to align with your application's design language."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Map Implementation Example
            </Typography>
            <Typography variant="body1" paragraph>
              The following example shows a basic integration of the Mapbox GL JS library with React:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <CodeBlock
                code={mapIntegrationCode}
                language="jsx"
              />
            </Paper>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Map Integration Best Practices
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <PerformanceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Marker Clustering"
                  secondary="Group nearby markers at lower zoom levels to improve performance and readability."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PerformanceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Lazy Loading"
                  secondary="Load map data progressively as users pan and zoom to minimize initial load time."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PreciseLocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Permission UX"
                  secondary="Implement clear, user-friendly requests for location permissions with fallback options."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <MapIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Offline Support"
                  secondary="Cache map tiles and data for offline or low-connectivity scenarios."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={4}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Implementation Guide
            </Typography>
            <Typography variant="body1" paragraph>
              This section provides guidance on implementing geolocation features in your applications
              that integrate with the Gringo platform.
            </Typography>

            <Typography variant="h6" gutterBottom>
              Backend Implementation
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="GeoJSON Format"
                  secondary="Always store location data in GeoJSON-compatible format (type: 'Point', coordinates: [lng, lat])."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="2dsphere Indexing"
                  secondary="Create 2dsphere indexes on geospatial fields for optimal query performance."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Data Validation"
                  secondary="Validate coordinate data to ensure it contains valid longitude (-180 to 180) and latitude (-90 to 90) values."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PerformanceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Query Optimization"
                  secondary="Apply distance limits and result pagination to geospatial queries to prevent performance issues."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Frontend Implementation
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Browser Geolocation"
                  secondary="Use the browser's Geolocation API (navigator.geolocation) to obtain user coordinates."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Native Device Integration"
                  secondary="For mobile apps, use platform-specific location services (Core Location for iOS, Location API for Android)."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Permission Handling"
                  secondary="Implement appropriate permission requests and graceful fallbacks when location access is denied."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PerformanceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Background Location"
                  secondary="For continuous tracking, implement power-efficient background location updates with appropriate user permissions."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              API Endpoints for Geolocation
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="GET /api/v1/messages/nearby"
                  secondary="Find messages near a specified location with optional filtering parameters."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="GET /api/v1/users/nearby"
                  secondary="Find users near a specified location, respecting privacy settings."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="GET /api/v1/places/nearby"
                  secondary="Find places of interest near a specified location with optional category filtering."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="POST /api/v1/location/update"
                  secondary="Update a user's current location, triggering any relevant geofence events."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="POST /api/v1/geofences/create"
                  secondary="Create a new geofence with specified boundaries and trigger conditions."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={5}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Privacy & Security
            </Typography>
            <Typography variant="body1" paragraph>
              Location data is sensitive information that requires careful handling. Gringo implements
              several measures to protect user privacy and security.
            </Typography>

            <Typography variant="h6" gutterBottom>
              User Privacy Controls
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Sharing Options"
                  secondary="Users can choose to share precise location, approximate location (neighborhood level), or no location."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Visibility Settings"
                  secondary="Users can control who can see their location (everyone, followers, or no one)."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Temporary Location Sharing"
                  secondary="Options for time-limited location sharing that automatically expires."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location History"
                  secondary="Users can view and manage their location history, including options to delete historical data."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Security Measures
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<SecurityIcon color="primary" />}
                  title="Data Encryption"
                  description="Location data is encrypted in transit and at rest to prevent unauthorized access."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<SecurityIcon color="primary" />}
                  title="Access Controls"
                  description="Strict API authentication and authorization requirements for accessing location data."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<SecurityIcon color="primary" />}
                  title="Location Obfuscation"
                  description="Optional fuzzing of exact coordinates for public sharing to protect exact user locations."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FeatureCard
                  icon={<SecurityIcon color="primary" />}
                  title="Audit Logging"
                  description="Comprehensive logging of all location data access for security monitoring."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Implementation Best Practices
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Transparent Permissions"
                  secondary="Clearly explain why your application needs location data and how it will be used."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Data Minimization"
                  secondary="Collect only the precision of location data needed for your feature to function."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Background Location Usage"
                  secondary="Use background location tracking only when necessary and with clear user consent."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Retention Policies"
                  secondary="Implement clear data retention policies and automatic deletion of historical location data."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Additional Resources
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              MapBox Documentation
            </Typography>
            <Typography variant="body2">
              Comprehensive guides for integrating MapBox GL JS into your web and mobile applications.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              MongoDB Geospatial Queries
            </Typography>
            <Typography variant="body2">
              Detailed documentation on MongoDB's geospatial indexing and query capabilities.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Geolocation Best Practices
            </Typography>
            <Typography variant="body2">
              Industry standards and best practices for implementing location services in applications.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default GeolocationFeatures; 