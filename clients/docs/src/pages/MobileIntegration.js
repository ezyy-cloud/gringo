import React from 'react';
import { Box, Typography, Paper, Divider, Grid, List, ListItem, ListItemIcon, ListItemText, Card, CardContent } from '@mui/material';
import {
  PhoneAndroid as AndroidIcon,
  Apple as AppleIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  Notifications as NotificationIcon,
  LocationOn as LocationIcon,
  Storage as StorageIcon,
  Speed as PerformanceIcon,
} from '@mui/icons-material';
import CodeBlock from '../components/CodeBlock';

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

function MobileIntegration() {
  const iosAuthExample = `
// Swift example for authentication
import GringoSDK

// Initialize the SDK
GringoClient.initialize(apiKey: "YOUR_API_KEY")

// Login with email and password
GringoClient.shared.login(email: "user@example.com", password: "password") { result in
    switch result {
    case .success(let user):
        print("Logged in as: $(user.username)")
        // Proceed to main app flow
    case .failure(let error):
        print("Login failed: $(error.localizedDescription)")
        // Handle error
    }
}

// Or authenticate with token if you have one stored
if let token = UserDefaults.standard.string(forKey: "authToken") {
    GringoClient.shared.authenticate(token: token) { result in
        // Handle result
    }
}`;

  const androidLocationExample = `
// Kotlin example for location services
import com.gringo.sdk.location.GringoLocationManager
import com.gringo.sdk.models.GringoLocation

class MainActivity : AppCompatActivity(), GringoLocationListener {

    private lateinit var locationManager: GringoLocationManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Initialize location manager
        locationManager = GringoLocationManager(this)
        locationManager.setLocationListener(this)
    }
    
    override fun onStart() {
        super.onStart()
        // Request location updates
        locationManager.startLocationUpdates()
    }
    
    override fun onStop() {
        super.onStop()
        // Stop location updates when not needed
        locationManager.stopLocationUpdates()
    }
    
    // Location listener callback
    override fun onLocationUpdated(location: GringoLocation) {
        // Handle new location
        updateNearbyContent(location)
    }
    
    private fun updateNearbyContent(location: GringoLocation) {
        // Fetch nearby content using the SDK
        GringoClient.shared.getNearbyMessages(
            latitude = location.latitude,
            longitude = location.longitude,
            radius = 5000, // 5km
            limit = 20
        ) { result ->
            // Update UI with nearby messages
        }
    }
}`;

  const reactNativeExample = `
// React Native integration example
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { GringoSDK } from '@gringo/react-native-sdk';

export default function NearbyMessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Initialize the SDK
    GringoSDK.initialize('YOUR_API_KEY');
    
    // Request location permission and get nearby messages
    const fetchNearbyMessages = async () => {
      try {
        // Request location permissions
        const hasPermission = await GringoSDK.requestLocationPermission();
        
        if (hasPermission) {
          // Get current location
          const location = await GringoSDK.getCurrentLocation();
          
          // Fetch nearby messages
          const nearbyMessages = await GringoSDK.getNearbyMessages({
            latitude: location.latitude,
            longitude: location.longitude,
            radius: 2000, // 2km
            limit: 20
          });
          
          setMessages(nearbyMessages);
        } else {
          console.log('Location permission denied');
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNearbyMessages();
  }, []);
  
  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <Text>Loading nearby messages...</Text>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <Text style={{ fontWeight: 'bold' }}>{item.username}</Text>
              <Text>{item.text}</Text>
              <Text style={{ color: '#888' }}>
                {item.distance < 1000 
                  ? Math.round(item.distance) + 'm away'
                  : (item.distance / 1000).toFixed(1) + 'km away'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Mobile Integration
      </Typography>
      <Typography variant="body1" paragraph>
        Gringo provides native SDKs and integration options for iOS, Android, and React Native applications.
        This guide explains how to integrate your mobile applications with the Gringo platform.
      </Typography>

      <Typography variant="h5" gutterBottom>
        Available SDKs
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<AppleIcon color="primary" />}
            title="iOS SDK"
            description="Native Swift SDK for iOS applications with full platform feature support."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<AndroidIcon color="primary" />}
            title="Android SDK"
            description="Native Kotlin SDK for Android applications with comprehensive platform integration."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<CodeIcon color="primary" />}
            title="React Native SDK"
            description="JavaScript SDK for React Native applications supporting cross-platform development."
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Core Features
      </Typography>
      <Typography variant="body1" paragraph>
        All mobile SDKs provide access to these core platform features:
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<SecurityIcon color="primary" />}
            title="Authentication"
            description="User authentication, session management, and secure token storage."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<LocationIcon color="primary" />}
            title="Geolocation"
            description="Location services integration with platform-specific optimizations for battery efficiency."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<NotificationIcon color="primary" />}
            title="Push Notifications"
            description="Integration with APNS (iOS) and FCM (Android) for real-time notifications."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<StorageIcon color="primary" />}
            title="Offline Support"
            description="Local data caching and synchronization for offline operation."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<PerformanceIcon color="primary" />}
            title="Performance Optimization"
            description="Efficient data loading, image caching, and battery-friendly background operations."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<CodeIcon color="primary" />}
            title="API Access"
            description="Complete access to all Gringo API endpoints with type-safe wrappers."
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        iOS Integration
      </Typography>
      <Typography variant="body1" paragraph>
        To integrate with iOS applications, follow these steps:
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            <CodeIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Installation"
            secondary="Add the SDK to your project using Swift Package Manager, CocoaPods, or Carthage."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <CodeIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Initialization"
            secondary="Initialize the SDK in your AppDelegate with your API key and configuration options."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <SecurityIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Authentication"
            secondary="Implement user authentication flow using the SDK's authentication methods."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <LocationIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Location Services"
            secondary="Configure location permissions and integrate with iOS Core Location."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <NotificationIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Push Notifications"
            secondary="Set up APNS integration and handle notification payloads."
          />
        </ListItem>
      </List>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        iOS Authentication Example
      </Typography>
      <Paper sx={{ p: 2, mb: 4, bgcolor: '#f5f5f5' }}>
        <CodeBlock
          code={iosAuthExample}
          language="swift"
        />
      </Paper>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Android Integration
      </Typography>
      <Typography variant="body1" paragraph>
        To integrate with Android applications, follow these steps:
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            <CodeIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Installation"
            secondary="Add the SDK to your project using Gradle dependencies."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <CodeIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Initialization"
            secondary="Initialize the SDK in your Application class with your API key and configuration."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <SecurityIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Permissions"
            secondary="Implement runtime permission requests for location, notifications, and storage."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <LocationIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Location Services"
            secondary="Integrate with Android Location API and handle location updates efficiently."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <NotificationIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Firebase Integration"
            secondary="Set up Firebase Cloud Messaging for push notifications."
          />
        </ListItem>
      </List>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Android Location Example
      </Typography>
      <Paper sx={{ p: 2, mb: 4, bgcolor: '#f5f5f5' }}>
        <CodeBlock
          code={androidLocationExample}
          language="kotlin"
        />
      </Paper>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        React Native Integration
      </Typography>
      <Typography variant="body1" paragraph>
        For cross-platform development with React Native:
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            <CodeIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Installation"
            secondary="Add the SDK package using npm or yarn and link native dependencies."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <CodeIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Configuration"
            secondary="Configure platform-specific settings in iOS and Android project files."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <SecurityIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="JavaScript API"
            secondary="Use the JavaScript API to access all platform features with Promise-based interface."
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <PerformanceIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Native Modules"
            secondary="The SDK uses native modules for performance-critical features like location and notifications."
          />
        </ListItem>
      </List>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        React Native Example
      </Typography>
      <Paper sx={{ p: 2, mb: 4, bgcolor: '#f5f5f5' }}>
        <CodeBlock
          code={reactNativeExample}
          language="jsx"
        />
      </Paper>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" gutterBottom>
        Best Practices
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Battery Optimization
            </Typography>
            <Typography variant="body2">
              Use efficient location strategies like significant location changes and geofencing instead of continuous tracking when possible.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Offline Experience
            </Typography>
            <Typography variant="body2">
              Implement proper caching and offline capabilities to provide a seamless experience even with intermittent connectivity.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Security
            </Typography>
            <Typography variant="body2">
              Store authentication tokens securely using platform-specific secure storage (Keychain for iOS, EncryptedSharedPreferences for Android).
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default MobileIntegration; 