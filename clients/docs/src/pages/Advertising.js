import React, { useState } from 'react';
import { Box, Typography, Paper, Divider, Grid, Tabs, Tab, List, ListItem, ListItemIcon, ListItemText, Card, CardContent, Button } from '@mui/material';
import {
  Campaign as CampaignIcon,
  LocationOn as LocationIcon,
  Timeline as AnalyticsIcon,
  AttachMoney as MoneyIcon,
  ThumbUp as EngagementIcon,
  BubbleChart as DemographicsIcon,
  Business as BusinessIcon,
  Store as StoreIcon,
  Restaurant as RestaurantIcon,
  EventAvailable as EventIcon,
  Hotel as HotelIcon,
} from '@mui/icons-material';
import CodeBlock from '../components/CodeBlock';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function AdFeatureCard({ icon, title, description }) {
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

function Advertising() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const adRequestExample = `
POST /api/v1/advertising/campaigns
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "name": "Summer Sale Promotion",
  "type": "local",
  "targetLocation": {
    "lat": 40.7128,
    "lng": -74.0060,
    "radius": 5 // km
  },
  "budget": 500,
  "dailyLimit": 50,
  "content": {
    "heading": "Summer Sale - 30% Off All Items",
    "description": "Visit our store in downtown for exclusive deals this weekend!",
    "callToAction": "Learn More",
    "url": "https://example.com/summer-sale",
    "media": ["https://example.com/images/summer-sale.jpg"]
  },
  "schedule": {
    "startDate": "2023-06-01",
    "endDate": "2023-06-30",
    "daysOfWeek": [1, 2, 3, 4, 5] // Monday to Friday
  },
  "targeting": {
    "demographics": {
      "ageRanges": ["18-24", "25-34"],
      "interests": ["fashion", "shopping"]
    }
  }
}`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Advertising on Gringo
      </Typography>
      <Typography variant="body1" paragraph>
        Welcome to the Gringo Advertising Guide. This resource will help businesses of all sizes 
        effectively reach and engage with location-based audiences on our platform.
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
          <Tab label="Overview" />
          <Tab label="Ad Types" />
          <Tab label="Geo-targeting" />
          <Tab label="Campaign Setup" />
          <Tab label="Analytics" />
          <Tab label="Best Practices" />
        </Tabs>

        <TabPanel value={value} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Advertising Overview
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo's advertising platform allows businesses to connect with users based on their location, interests, and behavior. 
              Our geospatial social network provides unique opportunities for location-based businesses to reach potential customers 
              when they're most likely to engage.
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <AdFeatureCard
                  icon={<LocationIcon color="primary" />}
                  title="Geo-targeting"
                  description="Reach users based on their current location, recent places they've visited, or areas they frequently engage with."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <AdFeatureCard
                  icon={<DemographicsIcon color="primary" />}
                  title="Audience Targeting"
                  description="Target users based on demographics, interests, and platform behavior for more relevant advertising."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <AdFeatureCard
                  icon={<CampaignIcon color="primary" />}
                  title="Multiple Ad Formats"
                  description="Choose from various ad formats including feed posts, sponsored content, location highlights, and event promotions."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Why Advertise on Gringo?
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <EngagementIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="High Engagement Rates"
                  secondary="Our users are actively looking for location-based content and experiences."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Precise Location Targeting"
                  secondary="Reach users when they're near your business or in areas relevant to your offerings."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Detailed Analytics"
                  secondary="Measure campaign performance with comprehensive metrics and insights."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <MoneyIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Cost-Effective"
                  secondary="Our targeting capabilities help ensure your ad spend reaches the most relevant audience."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Ad Types and Formats
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo offers various advertising formats to help you achieve your marketing goals:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<CampaignIcon color="primary" />}
                  title="Feed Ads"
                  description="Native-looking ads that appear in users' content feeds, blending seamlessly with organic content."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<LocationIcon color="primary" />}
                  title="Location Highlights"
                  description="Promoted locations that appear at the top of location searches or on the map view."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<BusinessIcon color="primary" />}
                  title="Business Profiles"
                  description="Enhanced business profiles with additional features, analytics, and promotional capabilities."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<EventIcon color="primary" />}
                  title="Event Promotions"
                  description="Featured events that receive additional visibility in event listings and recommendations."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Ad Specifications
            </Typography>
            <Typography variant="body1" paragraph>
              Each ad format has specific requirements to ensure optimal performance:
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <CampaignIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Feed Ads"
                  secondary="Images: 1200 x 630px recommended, Text: Up to 125 characters for headline, 500 for description"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Highlights"
                  secondary="Square logo: 500 x 500px, Cover image: 1200 x 300px, Description: Up to 200 characters"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <EventIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Event Promotions"
                  secondary="Event image: 1200 x 630px, Title: Up to 60 characters, Description: Up to 300 characters"
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Geo-targeting Capabilities
            </Typography>
            <Typography variant="body1" paragraph>
              Gringo's powerful geo-targeting features allow you to reach users based on their location:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Location Targeting Options
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Radius Targeting"
                  secondary="Target users within a specific radius around a location, from 0.5km to 50km."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Neighborhood/District Targeting"
                  secondary="Target specific neighborhoods, districts, or defined areas within a city."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Dynamic Location Targeting"
                  secondary="Target users based on their current location, frequent locations, or recently visited places."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Custom Polygon Targeting"
                  secondary="Define custom geographic areas by drawing polygons on a map for precise targeting."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Advanced Geo-targeting Strategies
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<StoreIcon color="primary" />}
                  title="Competitive Geo-fencing"
                  description="Target users who visit your competitors' locations to introduce them to your business."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<EventIcon color="primary" />}
                  title="Event Targeting"
                  description="Target users attending specific events or who have shown interest in similar events."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<LocationIcon color="primary" />}
                  title="Time-based Location Targeting"
                  description="Target users in specific locations during certain times of day (e.g., lunch specials near office districts)."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<AnalyticsIcon color="primary" />}
                  title="Historical Location Patterns"
                  description="Target users based on their regular visit patterns (e.g., frequent gym-goers, regular coffee shop visitors)."
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Campaign Setup
            </Typography>
            <Typography variant="body1" paragraph>
              Create and manage effective advertising campaigns on Gringo with these steps:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Campaign Creation Process
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <BusinessIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 1: Create a Business Account"
                  secondary="Sign up or convert your existing account to a business account to access advertising features."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CampaignIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 2: Define Campaign Objectives"
                  secondary="Choose your goal: awareness, engagement, traffic, conversions, or app installs."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <DemographicsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 3: Select Target Audience"
                  secondary="Define your audience based on location, demographics, interests, and behavior."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 4: Set Geo-targeting Parameters"
                  secondary="Define the locations where your ads will appear using our geo-targeting tools."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CampaignIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 5: Create Ad Content"
                  secondary="Upload images, write copy, and design your ads according to your chosen format."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <MoneyIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 6: Set Budget and Schedule"
                  secondary="Define your total budget, daily spend limits, and campaign duration."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Step 7: Review and Launch"
                  secondary="Review all settings, preview your ads, and launch your campaign."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              API Integration Example
            </Typography>
            <Typography variant="body1" paragraph>
              For businesses wanting to automate campaign creation, our API allows programmatic management:
            </Typography>

            <CodeBlock
              code={adRequestExample}
              language="http"
            />
          </Box>
        </TabPanel>

        <TabPanel value={value} index={4}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Advertising Analytics
            </Typography>
            <Typography variant="body1" paragraph>
              Measure and optimize your campaign performance with comprehensive analytics:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Key Performance Metrics
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Impressions"
                  secondary="The number of times your ad was displayed to users."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Engagement Rate"
                  secondary="Percentage of users who interacted with your ad (clicks, likes, comments, shares)."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Click-Through Rate (CTR)"
                  secondary="Percentage of impressions that resulted in clicks to your destination."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Conversion Rate"
                  secondary="Percentage of users who completed desired actions after clicking your ad."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <MoneyIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Cost Per Click (CPC)"
                  secondary="Average cost you pay for each click on your ad."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Insights"
                  secondary="Performance data across different geographic areas and location types."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Reporting Tools
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<AnalyticsIcon color="primary" />}
                  title="Real-time Dashboard"
                  description="Monitor campaign performance as it happens with our interactive dashboard."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<AnalyticsIcon color="primary" />}
                  title="Scheduled Reports"
                  description="Set up automated reports delivered to your email on daily, weekly, or monthly basis."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<LocationIcon color="primary" />}
                  title="Heatmap Visualization"
                  description="Visualize engagement patterns across geographic areas with interactive heatmaps."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AdFeatureCard
                  icon={<AnalyticsIcon color="primary" />}
                  title="Data Export"
                  description="Export campaign data in CSV or JSON format for further analysis in your preferred tools."
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={5}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Advertising Best Practices
            </Typography>
            <Typography variant="body1" paragraph>
              Follow these recommendations to maximize the effectiveness of your Gringo advertising campaigns:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Content Best Practices
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CampaignIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Authentic, Native Content"
                  secondary="Create ads that match the authentic, location-focused nature of Gringo content."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Relevance"
                  secondary="Emphasize the local aspect of your business and why it matters to users in that location."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CampaignIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="High-Quality Visuals"
                  secondary="Use clear, professional images or videos that showcase your location and offerings."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CampaignIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Clear Call-to-Action"
                  secondary="Tell users exactly what you want them to do next (visit, call, order online, etc.)."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Campaign Optimization Tips
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Test Multiple Ad Variations"
                  secondary="Create several versions of your ads to determine which performs best."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Refine Geo-targeting"
                  secondary="Start with broader targeting and narrow down based on performance data."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <MoneyIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Adjust Budget Allocation"
                  secondary="Allocate more budget to high-performing locations, times, or ad formats."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CampaignIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Seasonal Adjustments"
                  secondary="Update campaigns to reflect seasonal trends, events, or promotions."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Success Stories by Industry
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <RestaurantIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Restaurants
            </Typography>
            <Typography variant="body2" paragraph>
              A local restaurant chain saw a 35% increase in foot traffic by targeting users within 2km during lunch and dinner hours with special promotions.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <StoreIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Retail
            </Typography>
            <Typography variant="body2" paragraph>
              A boutique clothing store achieved a 28% conversion rate by targeting fashion enthusiasts who frequently visited the shopping district.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <EventIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Events
            </Typography>
            <Typography variant="body2" paragraph>
              A music festival sold 5,000 tickets through targeted ads to users who had previously engaged with music venue content in the area.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <HotelIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
              Hospitality
            </Typography>
            <Typography variant="body2" paragraph>
              A boutique hotel increased weekend bookings by 42% by targeting visitors exploring the neighborhood through Gringo's location features.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Ready to start advertising on Gringo?
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          sx={{ mt: 2 }}
        >
          Create Your First Campaign
        </Button>
      </Box>
    </Box>
  );
}

export default Advertising; 