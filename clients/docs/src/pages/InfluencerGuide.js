import React, { useState } from 'react';
import { Box, Typography, Paper, Divider, Grid, Tabs, Tab, List, ListItem, ListItemIcon, ListItemText, Card, CardContent } from '@mui/material';
import {
  Star as StarIcon,
  Visibility as VisibilityIcon,
  LocationOn as LocationIcon,
  Groups as AudienceIcon,
  Timeline as AnalyticsIcon,
  Campaign as PromotionIcon,
  TrendingUp as TrendingIcon,
  Business as BusinessIcon,
  Verified as VerifiedIcon,
  Tune as StrategiesIcon,
  MonetizationOn as MonetizationIcon,
  Event as EventIcon,
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

function InfluencerGuide() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Influencer Guide
      </Typography>
      <Typography variant="body1" paragraph>
        Welcome to the Gringo Influencer Guide. This resource is designed to help established influencers
        leverage Gringo's unique geolocation-based platform to expand their reach, engage with audiences
        in new ways, and create meaningful partnerships with brands.
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
          <Tab label="Building Your Presence" />
          <Tab label="Location Strategies" />
          <Tab label="Brand Partnerships" />
          <Tab label="Monetization" />
          <Tab label="Analytics" />
        </Tabs>

        <TabPanel value={value} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Getting Started as an Influencer
            </Typography>
            <Typography variant="body1" paragraph>
              Transitioning your influence to Gringo requires understanding how our location-based platform differs from traditional social networks:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Setting Up Your Influencer Profile
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <VerifiedIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Verification Process"
                  secondary="Apply for verified status by providing proof of your established presence on other platforms and your authentic identity."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Profile Optimization"
                  secondary="Create a compelling bio highlighting your niche, experience, and what followers can expect from your content on Gringo."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location Strategy"
                  secondary="Decide if you'll focus on your home location, travel to multiple locations, or create content about specific types of places."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Content Creator vs. Influencer
            </Typography>
            <Typography variant="body1" paragraph>
              Understanding the distinction between content creators and influencers on Gringo:
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Content Creators
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Focus on creating quality location-based content" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Building audience around specific locations or topics" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="May be growing their presence and recognition" />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Influencers
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Established audience and credibility" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Ability to impact followers' opinions and behaviors" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Focused on brand partnerships and monetization" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Often verified with special platform features" />
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
              Building Your Presence
            </Typography>
            <Typography variant="body1" paragraph>
              Establish and grow your influence on Gringo with these strategies:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<VisibilityIcon color="primary" />}
                  title="Content Strategy"
                  description="Create a balanced mix of your established content style with Gringo's location-focused approach."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<AudienceIcon color="primary" />}
                  title="Audience Migration"
                  description="Guide your existing audience from other platforms to follow you on Gringo."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<TrendingIcon color="primary" />}
                  title="Platform Visibility"
                  description="Leverage Gringo's discovery features to gain visibility with new audiences interested in your locations."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<PromotionIcon color="primary" />}
                  title="Cross-Platform Promotion"
                  description="Share your Gringo content and profile across your other social channels."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Content Best Practices
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Authentic Location Content"
                  secondary="Share genuine experiences about places rather than staged content."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Engagement-focused Posts"
                  secondary="Ask questions about locations, request recommendations, and create content that invites conversation."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Consistent Presence"
                  secondary="Maintain a regular posting schedule to keep your audience engaged."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Storytelling"
                  secondary="Create narratives around locations that resonate with your personal brand and audience interests."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Location-Based Strategies
            </Typography>
            <Typography variant="body1" paragraph>
              Leverage Gringo's unique location features to enhance your influence:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Location Content Approaches
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Local Expert"
                  secondary="Become the go-to source for content about your home location or area of expertise."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Travel Influence"
                  secondary="Share experiences across multiple locations, bringing your unique perspective to different places."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Niche Location Focus"
                  secondary="Specialize in specific types of locations aligned with your brand (cafés, outdoor adventures, architecture, etc.)."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Event Presence"
                  secondary="Create content around major events, becoming a source for real-time, on-the-ground perspectives."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Advanced Location Techniques
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<TrendingIcon color="primary" />}
                  title="Location Takeovers"
                  description="Create a series of posts about a single location over a day or week, providing in-depth coverage."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<EventIcon color="primary" />}
                  title="Virtual Location Events"
                  description="Host virtual meetups or livestreams from interesting locations, engaging with followers in real-time."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<StrategiesIcon color="primary" />}
                  title="Location Challenges"
                  description="Create challenges that encourage followers to visit and share content from specific locations."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<LocationIcon color="primary" />}
                  title="Hidden Gem Reveals"
                  description="Build anticipation by teasing lesser-known locations before revealing their details."
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Brand Partnerships
            </Typography>
            <Typography variant="body1" paragraph>
              Develop valuable relationships with brands on Gringo:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Types of Brand Partnerships
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <BusinessIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Location-based Businesses"
                  secondary="Partner with restaurants, hotels, attractions, and local businesses for sponsored visits and reviews."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <BusinessIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Product Promotions"
                  secondary="Integrate products naturally into your location-based content (travel gear, fashion, tech, etc.)."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <BusinessIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Destination Marketing"
                  secondary="Work with tourism boards and travel organizations to promote destinations."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <BusinessIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Event Sponsorships"
                  secondary="Represent brands at events or create sponsored content around events."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Creating an Influencer Media Kit
            </Typography>
            <Typography variant="body1" paragraph>
              Develop a professional media kit to attract brand partnerships:
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<AnalyticsIcon color="primary" />}
                  title="Engagement Metrics"
                  description="Highlight your follower count, engagement rates, and audience growth on Gringo."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<AudienceIcon color="primary" />}
                  title="Audience Demographics"
                  description="Share insights about your followers' locations, interests, and demographics."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<PromotionIcon color="primary" />}
                  title="Content Showcase"
                  description="Feature your best-performing location-based content and previous successful brand collaborations."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<MonetizationIcon color="primary" />}
                  title="Partnership Options"
                  description="Outline different collaboration types and pricing/compensation models you offer."
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={4}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Monetization Strategies
            </Typography>
            <Typography variant="body1" paragraph>
              Diversify your income streams as a Gringo influencer:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<MonetizationIcon color="primary" />}
                  title="Sponsored Content"
                  description="Create branded posts featuring locations, products, or services for compensation."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<MonetizationIcon color="primary" />}
                  title="Location Guides"
                  description="Develop premium location guides that followers can purchase."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<MonetizationIcon color="primary" />}
                  title="Affiliate Partnerships"
                  description="Earn commissions by recommending hotels, tours, or products with trackable links."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<EventIcon color="primary" />}
                  title="Exclusive Events"
                  description="Host paid events, tours, or meetups at featured locations."
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Monetization Best Practices
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <VerifiedIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Transparency"
                  secondary="Always disclose sponsored content and partnerships to maintain audience trust."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <VerifiedIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Value Alignment"
                  secondary="Partner only with brands and locations that align with your values and audience interests."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <VerifiedIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Content Balance"
                  secondary="Maintain a balance between sponsored and organic content to preserve authenticity."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <VerifiedIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Quality Control"
                  secondary="Maintain your content standards even for sponsored posts to protect your reputation."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={5}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Analytics & Performance
            </Typography>
            <Typography variant="body1" paragraph>
              Leverage data to optimize your influence and demonstrate value to partners:
            </Typography>

            <Typography variant="h6" gutterBottom>
              Key Performance Indicators
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Audience Growth"
                  secondary="Track follower count and growth rate over time."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Engagement Metrics"
                  secondary="Monitor likes, comments, shares, and overall engagement rate."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Content Performance"
                  secondary="Analyze which locations, content types, and posting times perform best."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AnalyticsIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Click-through & Conversion"
                  secondary="Track how many followers take action on links, promotions, or calls-to-action."
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Advanced Analytics Techniques
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<AnalyticsIcon color="primary" />}
                  title="Campaign Reporting"
                  description="Create detailed reports for brand partners showing the full impact of sponsored content."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<AnalyticsIcon color="primary" />}
                  title="A/B Testing"
                  description="Test different content approaches, captions, or posting times to optimize performance."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<LocationIcon color="primary" />}
                  title="Location Impact Analysis"
                  description="Measure how your content affects visit rates or engagement with featured locations."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StrategyCard
                  icon={<AudienceIcon color="primary" />}
                  title="Audience Insight Mining"
                  description="Use analytics to better understand your audience's preferences and behaviors."
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Influencer Success Stories
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Travel Influencer
            </Typography>
            <Typography variant="body2" paragraph>
              Used Gringo to create location-based travel series, resulting in tourism board partnerships across five countries and a 200% increase in engagement compared to traditional platforms.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Culinary Influencer
            </Typography>
            <Typography variant="body2" paragraph>
              Leveraged location features to showcase restaurants in their city, resulting in a cookbook deal featuring local establishments and a restaurant recommendation app partnership.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Lifestyle Influencer
            </Typography>
            <Typography variant="body2" paragraph>
              Created a "city secrets" series featuring hidden gems in urban environments, leading to partnerships with luxury hotels and a branded location guide subscription service.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default InfluencerGuide; 