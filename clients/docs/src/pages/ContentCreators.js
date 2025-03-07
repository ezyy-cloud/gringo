import React, { useState } from 'react';
import { Box, Typography, Paper, Divider, Grid, Tabs, Tab, List, ListItem, ListItemIcon, ListItemText, Card, CardContent } from '@mui/material';
import {
  Star as StarIcon,
  TrendingUp as TrendingIcon,
  Timeline as AnalyticsIcon,
  LocationOn as LocationIcon,
  Groups as AudienceIcon,
  Assessment as InsightsIcon,
  Visibility as VisibilityIcon,
  Campaign as PromotionIcon,
  Brush as CreativeIcon,
} from '@mui/icons-material';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function StrategyCard({ icon, title, description }) {
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

function ContentCreators() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Content Creator Guide
      </Typography>
      <Typography variant="body1" paragraph>
        Welcome to the Gringo Content Creator Guide. This resource is designed to help you create engaging 
        content, grow your audience, and leverage the platform's unique geolocation features to become 
        an influential voice on Gringo.
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
          <Tab label="Content Strategy" />
          <Tab label="Growing Your Audience" />
          <Tab label="Location Features" />
          <Tab label="Analytics" />
          <Tab label="Monetization" />
        </Tabs>

        <TabPanel value={value} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Getting Started as a Creator
            </Typography>
            <Typography variant="body1" paragraph>
              Becoming a successful content creator on Gringo requires understanding the platform's unique features and audience:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Setting Up Your Creator Profile
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Optimize Your Profile"
                  secondary="Use a high-quality profile picture, create a compelling bio that highlights your expertise, and select a distinctive cover color."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Define Your Location Focus"
                  secondary="Decide if you'll focus on a specific area or create content across multiple locations."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CreativeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Identify Your Content Niche"
                  secondary="Determine what type of location-based content you'll specialize in: local news, hidden gems, cultural experiences, etc."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Creator vs. Regular User
            </Typography>
            <Typography variant="body1" paragraph>
              Understanding the differences between regular users and content creators helps set expectations:
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Regular Users
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Consume content and interact casually" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Share personal experiences occasionally" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Connect with friends and local community" />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Content Creators
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Publish regular, quality content" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Build and engage with a growing audience" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Utilize analytics to improve content strategy" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Potential to monetize content" />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Content Strategy
            </Typography>
            <Typography variant="body1" paragraph>
              Developing a strong content strategy is essential for success on Gringo:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<CreativeIcon color="primary" />}
                  title="Content Types"
                  description="Mix informative, entertaining, and interactive content to keep your audience engaged."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<TrendingIcon color="primary" />}
                  title="Content Calendar"
                  description="Plan your posts in advance with a content calendar that includes regular features and special events."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<VisibilityIcon color="primary" />}
                  title="Posting Schedule"
                  description="Post at times when your audience is most active to maximize visibility and engagement."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<LocationIcon color="primary" />}
                  title="Location Selection"
                  description="Choose locations strategically to capture interest and reach your target audience."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Content Ideas for Location-Based Posts
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Hidden Gems"
                  secondary="Highlight lesser-known places, businesses, or attractions in a location."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Local News & Updates"
                  secondary="Share important news, construction updates, or changes in the community."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Event Coverage"
                  secondary="Preview or post live updates from local events, festivals, or gatherings."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Local Reviews"
                  secondary="Review restaurants, shops, services, or attractions in your area."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Neighborhood Tours"
                  secondary="Take your audience on virtual tours of interesting neighborhoods or districts."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Growing Your Audience
            </Typography>
            <Typography variant="body1" paragraph>
              Building and engaging with your audience is crucial for long-term success:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Audience Building Strategies
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <AudienceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Consistent Posting"
                  secondary="Maintain a regular posting schedule so followers know when to expect new content."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AudienceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Engagement"
                  secondary="Respond to comments, like posts from followers, and actively participate in conversations."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AudienceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Collaborations"
                  secondary="Partner with other creators to reach new audiences and create unique content together."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AudienceIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Cross-Promotion"
                  secondary="Promote your Gringo content on other social platforms to direct your existing audience."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Community Building
            </Typography>
            <Typography variant="body1" paragraph>
              Creating a sense of community around your content can lead to stronger audience loyalty:
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<AudienceIcon color="primary" />}
                  title="User-Generated Content"
                  description="Encourage followers to share their own experiences and highlight the best submissions."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<LocationIcon color="primary" />}
                  title="Meetups & Events"
                  description="Organize local gatherings or events for your followers to meet in person."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<PromotionIcon color="primary" />}
                  title="Exclusive Content"
                  description="Create special content or early access for your most engaged followers."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<TrendingIcon color="primary" />}
                  title="Challenges & Hashtags"
                  description="Start location-based challenges or create unique hashtags your audience can participate in."
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Location Features for Creators
            </Typography>
            <Typography variant="body1" paragraph>
              Mastering Gringo's geolocation features can give your content a unique edge:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<LocationIcon color="primary" />}
                  title="Geo-targeting"
                  description="Create content specifically for users in particular locations to increase relevance and engagement."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<LocationIcon color="primary" />}
                  title="Location Series"
                  description="Develop content series that explore different aspects of the same location over time."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<LocationIcon color="primary" />}
                  title="Location Hopping"
                  description="Create content across multiple locations to appeal to a wider geographic audience."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<LocationIcon color="primary" />}
                  title="Seasonal Content"
                  description="Leverage seasonal changes and events at specific locations for timely, relevant content."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Advanced Location Techniques
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Storytelling"
                  secondary="Create narrative content that takes users on a journey through a location."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Before & After Content"
                  secondary="Document how locations change over time, showcasing development or historical perspective."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Comparisons"
                  secondary="Compare and contrast similar locations in different areas to highlight unique aspects."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Local Expertise"
                  secondary="Position yourself as an expert on specific locations to build authority and trust."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={4}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Analytics & Insights
            </Typography>
            <Typography variant="body1" paragraph>
              Using data to refine your content strategy is essential for long-term growth:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Key Metrics to Track
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Engagement Rate"
                  secondary="Measure likes, comments, and shares relative to your follower count."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Follower Growth"
                  secondary="Track new followers and retention rates over time."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Reach & Impressions"
                  secondary="Monitor how many users see your content and how often."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Performance"
                  secondary="Analyze which locations generate the most engagement for your content."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Using Analytics to Improve
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<InsightsIcon color="primary" />}
                  title="Content Optimization"
                  description="Identify your highest-performing content types and create more similar material."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<InsightsIcon color="primary" />}
                  title="Posting Schedule"
                  description="Determine the best times to post based on when your audience is most active."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<InsightsIcon color="primary" />}
                  title="Audience Insights"
                  description="Understand your audience demographics to create more targeted, relevant content."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<InsightsIcon color="primary" />}
                  title="A/B Testing"
                  description="Test different content approaches to see what resonates best with your audience."
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={5}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Monetization Opportunities
            </Typography>
            <Typography variant="body1" paragraph>
              As your audience grows, you may have opportunities to monetize your content:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<PromotionIcon color="primary" />}
                  title="Sponsored Content"
                  description="Partner with businesses to create content featuring their products or services."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<PromotionIcon color="primary" />}
                  title="Local Business Partnerships"
                  description="Develop ongoing relationships with businesses in your featured locations."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<PromotionIcon color="primary" />}
                  title="Location Guides"
                  description="Create premium guides or experiences for specific locations that followers can purchase."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<PromotionIcon color="primary" />}
                  title="Event Hosting"
                  description="Organize and charge for special events, tours, or experiences in your featured locations."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Monetization Best Practices
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Transparency"
                  secondary="Always disclose sponsored content and partnerships to maintain trust with your audience."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Relevance"
                  secondary="Only partner with businesses and brands that align with your content and audience interests."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Balance"
                  secondary="Maintain a healthy ratio of organic to sponsored content to avoid alienating your audience."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Value First"
                  secondary="Focus on providing value to your audience even in monetized content."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Content Creator Success Stories
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Local Explorer
            </Typography>
            <Typography variant="body2" paragraph>
              Built a following of 50,000+ by showcasing hidden gems in their city with detailed guides and stunning photography.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Food Reviewer
            </Typography>
            <Typography variant="body2" paragraph>
              Created a network of 30,000 followers by reviewing local restaurants and food scenes across multiple cities.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Event Promoter
            </Typography>
            <Typography variant="body2" paragraph>
              Became the go-to source for local events and activities, partnering with venues and organizers for exclusive coverage.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ContentCreators; 