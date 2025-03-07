import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  SelectChangeEvent,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  getUserAnalytics,
  getMessageAnalytics,
  getBotAnalytics,
  getLocationAnalytics,
} from '../services/api';

type Period = 'day' | 'week' | 'month' | 'year';

interface AnalyticsData {
  users: {
    data: { date: string; count: number }[];
    total: number;
    growth: number;
  };
  messages: {
    data: { date: string; count: number }[];
    total: number;
    growth: number;
  };
  bots: {
    data: { date: string; count: number }[];
    total: number;
    growth: number;
    byType: { name: string; value: number }[];
  };
  locations: {
    data: { 
      name: string; 
      coordinates?: string; 
      latitude?: number; 
      longitude?: number; 
      count: number;
      sampleMessageId?: string;
    }[];
    total: number;
  };
}

// Cache for reverse geocoded locations to avoid repeated API calls
const geocodeCache: Record<string, string> = {};

// Function to perform reverse geocoding
const reverseGeocode = async (locationData: { 
  name: string; 
  latitude?: number; 
  longitude?: number; 
}): Promise<string> => {
  try {
    console.log('Geocoding location:', locationData);
    
    // Use provided latitude and longitude if available, otherwise parse from name
    let lat: number, lng: number;
    
    if (locationData.latitude !== undefined && locationData.longitude !== undefined) {
      lat = locationData.latitude;
      lng = locationData.longitude;
      console.log('Using provided coordinates:', lat, lng);
    } else {
      // Extract from name (format: "lat, lng")
      const coordinates = locationData.name.split(',');
      if (coordinates.length !== 2) {
        console.error('Invalid coordinates format:', locationData.name);
        return `Location ${locationData.name}`;  // Return a formatted fallback
      }
      
      lat = parseFloat(coordinates[0].trim());
      lng = parseFloat(coordinates[1].trim());
      
      if (isNaN(lat) || isNaN(lng)) {
        console.error('Could not parse coordinates:', locationData.name);
        return `Location ${locationData.name}`;  // Return a formatted fallback
      }
      
      console.log('Parsed coordinates from name:', lat, lng);
    }
    
    // Generate a cache key
    const cacheKey = `${lat},${lng}`;
    
    // Check if we have a cached result
    if (geocodeCache[cacheKey]) {
      console.log('Using cached result for', cacheKey);
      return geocodeCache[cacheKey];
    }
    
    console.log('Fetching geocode data for:', lat, lng);
    
    // Use mock locations to avoid external API calls that might fail
    const mockLocations: Record<string, string> = {
      '40.7128,-74.006': 'New York',
      '34.0522,-118.2437': 'Los Angeles',
      '51.5074,-0.1278': 'London',
      '48.8566,2.3522': 'Paris',
      '35.6762,139.6503': 'Tokyo',
      // Add more common locations to increase match probability
      '37.7749,-122.4194': 'San Francisco',
      '41.8781,-87.6298': 'Chicago',
      '29.7604,-95.3698': 'Houston',
      '39.9042,116.4074': 'Beijing',
      '19.4326,-99.1332': 'Mexico City',
      '55.7558,37.6173': 'Moscow',
      '1.3521,103.8198': 'Singapore',
      '-33.8688,151.2093': 'Sydney',
      '-22.9068,-43.1729': 'Rio de Janeiro',
      '55.6761,12.5683': 'Copenhagen',
      '52.5200,13.4050': 'Berlin',
      '45.4215,-75.6972': 'Ottawa',
      '28.6139,77.2090': 'New Delhi',
      '37.5665,126.9780': 'Seoul',
      '25.2048,55.2708': 'Dubai'
    };
    
    // Find nearby mock location (allow for minor coordinate differences)
    for (const [coords, name] of Object.entries(mockLocations)) {
      const [mockLat, mockLng] = coords.split(',').map(Number);
      if (Math.abs(lat - mockLat) < 0.5 && Math.abs(lng - mockLng) < 0.5) {
        geocodeCache[cacheKey] = name;
        return name;
      }
    }
    
    try {
      // Try OpenStreetMap API but fall back to generated name if connection fails
      // Use the Nominatim OpenStreetMap API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
        { 
          headers: { 
            'Accept-Language': 'en',
            'User-Agent': 'GringoX-Admin-Dashboard' // Providing a user agent as per Nominatim usage policy
          },
          // Add a timeout to avoid long waits on connection errors
          signal: AbortSignal.timeout(3000)
        }
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Geocoding response:', data);
      
      // Extract relevant location information - prioritize city/town names
      const locationName = data.address?.city || 
                          data.address?.town || 
                          data.address?.village || 
                          data.address?.county ||
                          data.address?.state ||
                          data.display_name?.split(',')[0] ||
                          `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
      
      console.log('Extracted location name:', locationName);
      
      // Cache the result
      geocodeCache[cacheKey] = locationName;
      
      return locationName;
    } catch (apiError) {
      console.warn('OpenStreetMap API error, falling back to generated name:', apiError);
      
      // If API call fails, generate a name based on approximate location
      const fallbackName = getFallbackLocationName(lat, lng);
      geocodeCache[cacheKey] = fallbackName;
      return fallbackName;
    }
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    
    // Return a formatted fallback that at least looks better than raw coordinates
    return `Location ${locationData.name}`;
  }
};

// Helper function to get a fallback location name based on coordinates
const getFallbackLocationName = (lat: number, lng: number): string => {
  // Determine continent based on rough coordinates
  let region = 'Unknown Region';
  
  if (lat > 0 && lng >= -20 && lng <= 40) {
    region = 'Europe';
  } else if (lat > 0 && lng > 40 && lng <= 145) {
    region = 'Asia';
  } else if (lat < 0 && lng >= 110 && lng <= 180) {
    region = 'Oceania';
  } else if (lat > 0 && lng >= -170 && lng < -20) {
    region = 'North America';
  } else if (lat < 0 && lng >= -80 && lng <= 30) {
    region = 'South America';
  } else if (lat > 0 && lng >= -20 && lng <= 55) {
    region = 'Africa';
  }
  
  return `${region} (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
};

// Helper function to add delay between API calls to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to process location data in batches with rate limiting
const processBatchedGeocoding = async (
  locations: Array<{
    name: string;
    latitude?: number;
    longitude?: number;
    count: number;
    [key: string]: any;
  }>,
  batchSize = 5,   // Process 5 locations at a time
  delayMs = 1000   // Wait 1 second between batches
): Promise<Array<any>> => {
  console.log('Processing locations batch:', locations);
  
  // If we're in development mode, use mock geocoding for all inputs
  // Uncomment this section to use mock data during development
  /*
  return locations.map(location => {
    // Extract coordinates from the name
    const coordinates = location.name.split(',');
    const lat = parseFloat(coordinates[0].trim());
    const lng = parseFloat(coordinates[1].trim());
    
    // Generate a fake location name
    let locationName;
    if (lat > 40) {
      locationName = `North ${Math.abs(lat).toFixed(1)}-${Math.abs(lng).toFixed(1)}`;
    } else if (lat < -40) {
      locationName = `South ${Math.abs(lat).toFixed(1)}-${Math.abs(lng).toFixed(1)}`;
    } else if (lng > 0) {
      locationName = `East ${Math.abs(lat).toFixed(1)}-${Math.abs(lng).toFixed(1)}`;
    } else {
      locationName = `West ${Math.abs(lat).toFixed(1)}-${Math.abs(lng).toFixed(1)}`;
    }
    
    return {
      ...location,
      coordinates: location.name, // Store original coordinates
      name: locationName // Replace with generated location name
    };
  });
  */
  
  const results: Array<any> = [];
  const totalLocations = locations.length;
  console.log(`Processing ${totalLocations} locations in batches of ${batchSize}`);
  
  // Process in batches
  for (let i = 0; i < totalLocations; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(totalLocations/batchSize)}`);
    
    // Process each location in the current batch
    const batchResults = await Promise.all(
      batch.map(async (location) => {
        const locationName = await reverseGeocode(location);
        
        const result = {
          ...location,
          coordinates: location.name, // Store original coordinates
          name: locationName // Replace with human-readable location name
        };
        
        console.log('Processed location:', result);
        return result;
      })
    );
    
    // Add batch results to the final results array
    results.push(...batchResults);
    
    // Wait before processing the next batch (but not after the last batch)
    if (i + batchSize < totalLocations) {
      console.log(`Waiting ${delayMs}ms before next batch...`);
      await delay(delayMs);
    }
  }
  
  console.log('All locations processed:', results);
  return results;
};

// Function to aggregate similar locations
const aggregateSimilarLocations = (
  locations: Array<{
    name: string;
    coordinates?: string;
    latitude?: number;
    longitude?: number;
    count: number;
    [key: string]: any;
  }>,
  precisionDigits = 1 // Lower precision means more aggregation (groups locations within ~10km)
): Array<any> => {
  console.log('Aggregating similar locations:', locations);
  
  // If we have 0 or 1 locations, no aggregation needed
  if (!locations || locations.length <= 1) {
    return locations;
  }
  
  // Group locations by rounded coordinates
  const locationGroups: Record<string, {
    locations: Array<any>;
    totalCount: number;
    avgLat: number;
    avgLng: number;
    names: Set<string>;
    mostFrequentNames: Map<string, number>;
  }> = {};
  
  locations.forEach(location => {
    let lat: number, lng: number;
    
    // Extract coordinates
    if (location.latitude !== undefined && location.longitude !== undefined) {
      lat = location.latitude;
      lng = location.longitude;
    } else if (location.coordinates) {
      const coords = location.coordinates.split(',');
      lat = parseFloat(coords[0].trim());
      lng = parseFloat(coords[1].trim());
    } else {
      const coords = location.name.split(',');
      if (coords.length === 2) {
        lat = parseFloat(coords[0].trim());
        lng = parseFloat(coords[1].trim());
      } else {
        // Can't extract coordinates, skip this location
        console.warn('Unable to extract coordinates from location:', location);
        return;
      }
    }
    
    // Skip if coordinates are invalid
    if (isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid coordinates for location:', location);
      return;
    }
    
    // Round coordinates to group similar locations
    const roundedLat = parseFloat(lat.toFixed(precisionDigits));
    const roundedLng = parseFloat(lng.toFixed(precisionDigits));
    const groupKey = `${roundedLat},${roundedLng}`;
    
    // Add to group or create new group
    if (!locationGroups[groupKey]) {
      locationGroups[groupKey] = {
        locations: [],
        totalCount: 0,
        avgLat: 0,
        avgLng: 0,
        names: new Set(),
        mostFrequentNames: new Map()
      };
    }
    
    locationGroups[groupKey].locations.push(location);
    locationGroups[groupKey].totalCount += location.count || 0;
    
    // Only add names that don't look like coordinates (i.e., don't contain comma followed by a space and a number)
    const isCoordinateFormat = /^[-+]?\d+(\.\d+)?,\s*[-+]?\d+(\.\d+)?$/.test(location.name);
    
    if (!isCoordinateFormat && !location.name.startsWith('Location (')) {
      locationGroups[groupKey].names.add(location.name);
      
      // Track name frequency for better naming
      const currentCount = locationGroups[groupKey].mostFrequentNames.get(location.name) || 0;
      locationGroups[groupKey].mostFrequentNames.set(location.name, currentCount + 1);
    }
  });
  
  // Calculate average coordinates for each group
  Object.values(locationGroups).forEach(group => {
    let totalLat = 0;
    let totalLng = 0;
    
    group.locations.forEach(location => {
      let lat: number, lng: number;
      
      if (location.latitude !== undefined && location.longitude !== undefined) {
        lat = location.latitude;
        lng = location.longitude;
      } else if (location.coordinates) {
        const coords = location.coordinates.split(',');
        lat = parseFloat(coords[0].trim());
        lng = parseFloat(coords[1].trim());
      } else {
        const coords = location.name.split(',');
        if (coords.length === 2) {
          lat = parseFloat(coords[0].trim());
          lng = parseFloat(coords[1].trim());
        } else {
          return; // Skip invalid locations
        }
      }
      
      if (!isNaN(lat) && !isNaN(lng)) {
        totalLat += lat;
        totalLng += lng;
      }
    });
    
    group.avgLat = totalLat / group.locations.length;
    group.avgLng = totalLng / group.locations.length;
  });
  
  // Convert groups to aggregated location objects
  const aggregatedLocations = Object.entries(locationGroups).map(([key, group]) => {
    // Choose a representative name for the group
    let displayName: string;
    
    // If we have actual location names (not coordinates)
    if (group.names.size > 0) {
      // Sort names by frequency
      const sortedNames = Array.from(group.mostFrequentNames.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
      
      if (sortedNames.length === 1) {
        // Just use the single name
        displayName = sortedNames[0];
      } else if (sortedNames.length > 1) {
        // Create a combined name with the top 2 most frequent location names
        displayName = `${sortedNames[0]} area`;
        
        // Only mention "and nearby" if there are several locations
        if (group.locations.length > 3) {
          displayName += " and nearby";
        }
      } else {
        // Fallback to coordinates if no valid names
        displayName = `Area (${group.avgLat.toFixed(2)}, ${group.avgLng.toFixed(2)})`;
      }
    } else {
      // No valid names, use a generic name with coordinates
      displayName = `Area (${group.avgLat.toFixed(2)}, ${group.avgLng.toFixed(2)})`;
    }
    
    return {
      name: displayName,
      coordinates: `${group.avgLat.toFixed(4)}, ${group.avgLng.toFixed(4)}`,
      latitude: group.avgLat,
      longitude: group.avgLng,
      count: group.totalCount,
      locationCount: group.locations.length,
      originalLocations: group.locations.map(loc => loc.name).join(', ')
    };
  });
  
  // Sort by count in descending order
  aggregatedLocations.sort((a, b) => b.count - a.count);
  
  // Limit to top 15 locations to keep the chart readable
  const limitedLocations = aggregatedLocations.slice(0, 15);
  
  console.log('Aggregated locations:', limitedLocations);
  return limitedLocations;
};

const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<Period>('week');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [aggregationPrecision, setAggregationPrecision] = useState<number>(1); // Default to 1 decimal place (~10km)

  useEffect(() => {
    fetchAnalytics();
  }, [period, aggregationPrecision]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch analytics data from API
      const [usersResponse, messagesResponse, botsResponse, locationsResponse] = await Promise.all([
        getUserAnalytics(period),
        getMessageAnalytics(period),
        getBotAnalytics(period),
        getLocationAnalytics()
      ]);
      
      // Debug logs
      console.log('Raw locations response:', locationsResponse);
      
      // Get the locations data properly
      // The API returns { success: true, data: { data: [...], total: number } }
      const locationsData = locationsResponse?.data?.data?.data || [];
      const locationsTotal = locationsResponse?.data?.data?.total || 0;
      
      console.log('Extracted locations data:', locationsData);
      console.log('Locations total:', locationsTotal);
      
      // Check if locations data exists and is an array
      if (!locationsData || !Array.isArray(locationsData) || locationsData.length === 0) {
        console.warn('No locations data available, using mock data for testing');
        
        // Provide mock data for testing
        const mockLocationsData = [
          { name: "40.7128, -74.006", count: 120 },
          { name: "34.0522, -118.2437", count: 80 },
          { name: "51.5074, -0.1278", count: 65 },
          { name: "48.8566, 2.3522", count: 50 },
          { name: "35.6762, 139.6503", count: 45 }
        ];
        
        // Process mock data
        const enhancedLocationsData = await processBatchedGeocoding(mockLocationsData);
        console.log('Enhanced mock locations:', enhancedLocationsData);
        
        setData({
          users: usersResponse.data.data,
          messages: messagesResponse.data.data,
          bots: botsResponse.data.data,
          locations: {
            total: mockLocationsData.length,
            data: enhancedLocationsData
          }
        });
      } else {
        console.log('Real locations data found, processing...');
        
        // Process locations in batches with rate limiting
        const enhancedLocationsData = await processBatchedGeocoding(locationsData);
        
        console.log('Enhanced locations data after geocoding:', enhancedLocationsData);
        
        // Aggregate similar locations with configurable precision
        const aggregatedLocationsData = aggregateSimilarLocations(enhancedLocationsData, aggregationPrecision);
        console.log('Locations after aggregation:', aggregatedLocationsData);
        
        // Sort locations by count
        aggregatedLocationsData.sort((a, b) => b.count - a.count);
        
        setData({
          users: usersResponse.data.data,
          messages: messagesResponse.data.data,
          bots: botsResponse.data.data,
          locations: {
            total: locationsTotal,
            data: aggregatedLocationsData
          }
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      
      // In case of error, use mock data
      const mockLocationsData = [
        { name: "40.7128, -74.006", count: 120 },
        { name: "34.0522, -118.2437", count: 80 },
        { name: "51.5074, -0.1278", count: 65 },
        { name: "48.8566, 2.3522", count: 50 },
        { name: "35.6762, 139.6503", count: 45 }
      ];
      
      // Process mock data
      try {
        const enhancedLocationsData = await processBatchedGeocoding(mockLocationsData);
        
        setData({
          users: {
            data: [],
            total: 0,
            growth: 0
          },
          messages: {
            data: [],
            total: 0,
            growth: 0
          },
          bots: {
            data: [],
            total: 0,
            growth: 0,
            byType: []
          },
          locations: {
            total: mockLocationsData.length,
            data: enhancedLocationsData
          }
        });
      } catch (geocodingError) {
        console.error('Error processing mock locations:', geocodingError);
      }
      
      setLoading(false);
    }
  };

  const generateTimeSeriesData = (period: Period, min: number, max: number) => {
    const data = [];
    const now = new Date();
    let numPoints = 0;
    let format = '';
    
    switch (period) {
      case 'day':
        numPoints = 24;
        format = 'HH:00';
        break;
      case 'week':
        numPoints = 7;
        format = 'ddd';
        break;
      case 'month':
        numPoints = 30;
        format = 'MMM D';
        break;
      case 'year':
        numPoints = 12;
        format = 'MMM';
        break;
    }
    
    for (let i = 0; i < numPoints; i++) {
      let date = '';
      
      switch (period) {
        case 'day':
          date = `${i}:00`;
          break;
        case 'week':
          date = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i];
          break;
        case 'month':
          date = `Day ${i + 1}`;
          break;
        case 'year':
          date = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i];
          break;
      }
      
      data.push({
        date,
        count: Math.floor(Math.random() * (max - min + 1)) + min,
      });
    }
    
    return data;
  };

  const handlePeriodChange = (event: SelectChangeEvent) => {
    setPeriod(event.target.value as Period);
  };

  const handleAggregationChange = (event: SelectChangeEvent) => {
    console.log("Aggregation level changed:", event.target.value);
    setAggregationPrecision(Number(event.target.value));
  };

  const handleChartTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newChartType: 'line' | 'bar' | null
  ) => {
    if (newChartType !== null) {
      setChartType(newChartType);
    }
  };

  // Style for the FormControl elements to ensure dropdowns are visible
  const formControlStyle = {
    minWidth: '180px', 
    mb: { xs: 1, md: 0 },
    '& .MuiSelect-select': {
      zIndex: 9999
    },
    '& .MuiMenu-paper': {
      zIndex: 10000
    }
  };

  if (loading || !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h4">Analytics</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, md: 0 }, flexWrap: 'wrap' }}>
          <FormControl sx={formControlStyle}>
            <InputLabel id="period-label">Period</InputLabel>
            <Select
              labelId="period-label"
              id="period-select"
              value={period}
              label="Period"
              onChange={handlePeriodChange}
            >
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="year">Year</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={formControlStyle}>
            <InputLabel id="location-grouping-label">Location Grouping</InputLabel>
            <Select
              labelId="location-grouping-label"
              id="location-grouping-select"
              value={aggregationPrecision.toString()}
              label="Location Grouping"
              onChange={handleAggregationChange}
            >
              <MenuItem value="0">City Level (~100km)</MenuItem>
              <MenuItem value="1">District Level (~10km)</MenuItem>
              <MenuItem value="2">Neighborhood (~1km)</MenuItem>
              <MenuItem value="3">Street Level (~100m)</MenuItem>
            </Select>
          </FormControl>
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            aria-label="chart type"
          >
            <ToggleButton value="line" aria-label="line chart">
              Line
            </ToggleButton>
            <ToggleButton value="bar" aria-label="bar chart">
              Bar
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* User Growth Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              User Growth
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total: {data.users.total} ({data.users.growth > 0 ? '+' : ''}{data.users.growth}%)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'line' ? (
                <LineChart data={data.users.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Users"
                    stroke="#3f51b5"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={data.users.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Users" fill="#3f51b5" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Message Activity Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Message Activity
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total: {data.messages.total} ({data.messages.growth > 0 ? '+' : ''}{data.messages.growth}%)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'line' ? (
                <LineChart data={data.messages.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Messages"
                    stroke="#f50057"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={data.messages.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Messages" fill="#f50057" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Bot Activity Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Bot Activity
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total: {data.bots.total} ({data.bots.growth > 0 ? '+' : ''}{data.bots.growth}%)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'line' ? (
                <LineChart data={data.bots.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Bots"
                    stroke="#00c853"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={data.bots.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Bots" fill="#00c853" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Locations Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Top Locations
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Active Locations: {data.locations.total}
            </Typography>
            
            {/* Debug information - remove in production */}
            <Box sx={{ mb: 2, fontSize: '12px', color: 'text.secondary' }}>
              <div>Data points: {data.locations.data.length}</div>
              <div>First location: {data.locations.data[0]?.name || 'None'}</div>
              <div>Aggregation level: {
                aggregationPrecision === 0 ? 'City Level' :
                aggregationPrecision === 1 ? 'District Level' :
                aggregationPrecision === 2 ? 'Neighborhood Level' :
                'Street Level'
              }</div>
              <div>Groups: {data.locations.data.filter(loc => loc.locationCount > 1).length}</div>
            </Box>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={data.locations.data.length > 0 ? data.locations.data : [
                  { name: "New York City", coordinates: "40.7128, -74.006", count: 120 },
                  { name: "Los Angeles", coordinates: "34.0522, -118.2437", count: 80 },
                  { name: "London", coordinates: "51.5074, -0.1278", count: 65 },
                  { name: "Paris", coordinates: "48.8566, 2.3522", count: 50 },
                  { name: "Tokyo", coordinates: "35.6762, 139.6503", count: 45 }
                ]} 
                layout="vertical"
                margin={{ left: 120 }}  // Add more margin for location names
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150} 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name, props) => [value, 'Messages']}
                  labelFormatter={(name, entry) => {
                    // Get the coordinates and additional info from the data entry
                    const dataEntry = entry[0]?.payload;
                    if (dataEntry) {
                      let label = `${name} (${dataEntry.coordinates || 'Unknown coordinates'})`;
                      
                      // Add location count if available (for aggregated locations)
                      if (dataEntry.locationCount && dataEntry.locationCount > 1) {
                        label += `\nAggregated ${dataEntry.locationCount} locations`;
                        
                        // If we have fewer than 10 original locations, list them
                        if (dataEntry.locationCount < 10 && dataEntry.originalLocations) {
                          label += `\nIncludes: ${dataEntry.originalLocations}`;
                        }
                      }
                      
                      return label;
                    }
                    return name;
                  }}
                />
                <Legend />
                <Bar dataKey="count" name="Messages" fill="#ff9800" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics; 