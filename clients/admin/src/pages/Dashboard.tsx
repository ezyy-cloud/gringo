import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, CircularProgress, Button, IconButton } from '@mui/material';
import {
  People as PeopleIcon,
  SmartToy as BotIcon,
  Message as MessageIcon,
  Public as LocationIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import ReactMapGL, { NavigationControl, MapRef, Marker, Popup, ScaleControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import StatCard from '../components/StatCard';
import { getDashboardStats } from '../services/api';

// Mapbox access token - use environment variable if available
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiZGFya25pZ2h0MDA3IiwiYSI6ImNqOXpiMWF3MjhuajEyeHFzcjhzdDVzN20ifQ.DlcipLyUIsK1pVHRtPK9Mw';

interface DashboardStats {
  /** Total number of users in the system */
  totalUsers: number;
  /** Total number of active bots in the system */
  totalBots: number;
  /** Total number of active bots in the system */
  activeBots: number;
  /** Total number of messages in the system */
  totalMessages: number;
  /** Total number of unique locations that messages have been sent from */
  totalLocations: number;
  /** User growth percentage (compared to previous period) */
  userGrowth: number;
  /** Bot growth percentage (compared to previous period) */
  botGrowth: number;
  /** Message growth percentage (compared to previous period) */
  messageGrowth: number;
  /** Distribution of bot types */
  botTypeDistribution: {
    name: string;
    value: number;
  }[];
  /** Message activity over time */
  messageActivity: {
    date: string;
    count: number;
  }[];
  /** Top message locations */
  topLocations: {
    name: string;
    count: number;
    coordinates: [number, number];
    text?: string;
    messageId?: string;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    name: string;
    count: number;
    description: string;
    text?: string;
    messageId?: string;
    hasDirectCoordinates: boolean;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GeoJSONFeature | null>(null);
  const mapRef = React.useRef<MapRef>(null);
  
  // Initial viewport settings
  const [viewport, setViewport] = useState({
    latitude: 20,
    longitude: 0,
    zoom: 1.5,
    bearing: 0,
    pitch: 0
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getDashboardStats();
      console.log('Full API Response:', response);
      console.log('API Response Data:', response.data);
      
      // Extract the nested data object from the API response
      if (response.data && response.data.success && response.data.data) {
        const data = response.data.data;
        
        // Log all dashboard stats data
        console.log('Dashboard Stats Data:', data);
        
        // Log the top locations to check for coordinates
        if (data.topLocations?.length > 0) {
          console.log('🔍 MESSAGE LOCATION DATA:', data.topLocations);
          console.log('First location sample:', data.topLocations[0]);
        } else {
          console.log('No top locations data available');
        }
        
        setStats(data);
        
        // Use the message locations directly for the map
        if (data.topLocations?.length > 0) {
          const geoJsonData: GeoJSONData = {
            type: 'FeatureCollection',
            features: data.topLocations.map((location: {
              name: string;
              count: number;
              coordinates: [number, number];
              text?: string;
              messageId?: string;
            }) => ({
              type: 'Feature',
              properties: {
                name: location.name,
                count: location.count,
                description: location.text || 'No message text',
                text: location.text,
                messageId: location.messageId,
                hasDirectCoordinates: true
              },
              geometry: {
                type: 'Point',
                coordinates: location.coordinates
              }
            }))
          };
          setGeoJsonData(geoJsonData);
        }
      } else {
        throw new Error('Unexpected response format from server');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Failed to load dashboard statistics. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !stats) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography color="error" gutterBottom>{error || 'Failed to load data'}</Typography>
        <Button 
          variant="contained" 
          startIcon={<RefreshIcon />}
          onClick={fetchStats}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Dashboard
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={fetchStats}
            size="small"
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Stat Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon={<PeopleIcon />}
            color="#3f51b5"
            change={{ value: stats?.userGrowth || 0, isPositive: (stats?.userGrowth || 0) > 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Bots"
            value={stats?.totalBots || 0}
            icon={<BotIcon />}
            color="#f50057"
            change={{ value: stats?.botGrowth || 0, isPositive: (stats?.botGrowth || 0) > 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Messages"
            value={stats?.totalMessages || 0}
            icon={<MessageIcon />}
            color="#00c853"
            change={{ value: stats?.messageGrowth || 0, isPositive: (stats?.messageGrowth || 0) > 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Locations"
            value={stats?.totalLocations || 0}
            icon={<LocationIcon />}
            color="#ff9800"
          />
        </Grid>

        {/* Message Activity Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Message Activity (Last 7 Days)
            </Typography>
            {stats?.messageActivity?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.messageActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No message activity data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Bot Type Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Bot Type Distribution
            </Typography>
            {stats?.botTypeDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.botTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.botTypeDistribution.map((_entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No bot type data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Messages Map */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Message Locations
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Individual messages plotted on the map
            </Typography>
            {geoJsonData && geoJsonData.features && geoJsonData.features.length > 0 ? (
              <Box sx={{ height: 500, position: 'relative' }}>
                <ReactMapGL
                  ref={mapRef}
                  {...viewport}
                  onMove={evt => setViewport(evt.viewState)}
                  mapStyle="mapbox://styles/mapbox/dark-v10"
                  mapboxAccessToken={MAPBOX_TOKEN}
                  style={{ width: '100%', height: '100%' }}
                  attributionControl={true}
                  reuseMaps
                >
                  <NavigationControl position="top-right" />
                  <ScaleControl position="bottom-right" />
                  
                  {/* Render individual message markers */}
                  {geoJsonData.features.map((feature, index) => (
                    feature.geometry && (
                      <Marker 
                        key={`message-${index}`}
                        longitude={feature.geometry.coordinates[0]} 
                        latitude={feature.geometry.coordinates[1]}
                      >
                        <IconButton 
                          size="small" 
                          onClick={() => setSelectedLocation(feature)}
                          sx={{ 
                            color: 'primary.main', 
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 1)'
                            },
                            width: 24,
                            height: 24,
                            padding: 0
                          }}
                        >
                          <MessageIcon fontSize="small" />
                        </IconButton>
                      </Marker>
                    )
                  ))}
                  
                  {/* Popup for selected message */}
                  {selectedLocation && (
                    <Popup
                      longitude={selectedLocation.geometry.coordinates[0]}
                      latitude={selectedLocation.geometry.coordinates[1]}
                      anchor="bottom"
                      onClose={() => setSelectedLocation(null)}
                      closeButton={true}
                      closeOnClick={false}
                      style={{ zIndex: 10 }}
                    >
                      <Box sx={{ p: 1, maxWidth: 250 }}>
                        <Typography variant="subtitle2">
                          {selectedLocation.properties.name}
                        </Typography>
                        {selectedLocation.properties.text && (
                          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                            "{selectedLocation.properties.text}"
                          </Typography>
                        )}
                      </Box>
                    </Popup>
                  )}
                </ReactMapGL>
                
                {/* Map legend */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: 1,
                    borderRadius: 1,
                    color: 'white',
                    zIndex: 1
                  }}
                >
                  <Typography variant="caption">Message Map</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <MessageIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="caption">
                      Each icon represents a single message
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                    Total messages on map: {geoJsonData.features.length}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No message location data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 