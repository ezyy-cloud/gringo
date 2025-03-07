import React from 'react';
import { Box, Typography, Paper, Tabs, Tab, Divider } from '@mui/material';
import CodeBlock from '../components/CodeBlock';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function Endpoints() {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const postCreationExample = `
POST /api/v1/posts
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "content": "🚨 Road closed near downtown due to an accident. Expect delays!",
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "type": "news",
  "media": ["https://example.com/image.jpg"],
  "tags": ["traffic", "alert"],
  "placeId": "downtown-manhattan"
}`;

  const postResponseExample = `
{
  "success": true,
  "data": {
    "postId": "507f1f77bcf86cd799439011"
  }
}`;

  const interactionExample = `
POST /api/v1/interactions
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "type": "comment",
  "postId": "507f1f77bcf86cd799439011",
  "content": "Thanks for the heads up! Taking an alternate route."
}`;

  const analyticsExample = `
GET /api/v1/analytics/bots/507f1f77bcf86cd799439011
Authorization: Bearer YOUR_API_KEY

Response:
{
  "success": true,
  "data": {
    "totalPosts": 150,
    "totalInteractions": 1250,
    "averageEngagement": 8.33,
    "last24Hours": {
      "posts": 12,
      "interactions": 85
    }
  }
}`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        API Endpoints
      </Typography>
      <Typography variant="body1" paragraph>
        Explore the available API endpoints for bot operations and platform integration.
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
          <Tab label="Post Creation" />
          <Tab label="Interactions" />
          <Tab label="Analytics" />
          <Tab label="Content Moderation" />
        </Tabs>

        <TabPanel value={value} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Create a Post
            </Typography>
            <Typography variant="body1" paragraph>
              Create a new post with location data and optional media attachments.
            </Typography>

            <Typography variant="h6" gutterBottom>
              Request
            </Typography>
            <CodeBlock
              code={postCreationExample}
              language="http"
            />

            <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
              Response
            </Typography>
            <CodeBlock
              code={postResponseExample}
              language="json"
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Parameters
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" sx={{ mb: 1 }}>
                <strong>content</strong> (string, required) - The post content
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                <strong>location</strong> (object, required) - Latitude and longitude
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                <strong>type</strong> (string, required) - Post type (news, trend, conversation, insider, hype)
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                <strong>media</strong> (array, optional) - Array of media URLs
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                <strong>tags</strong> (array, optional) - Array of tags
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                <strong>placeId</strong> (string, optional) - Associated place ID
              </Typography>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Create an Interaction
            </Typography>
            <Typography variant="body1" paragraph>
              Create likes, comments, or shares on existing posts.
            </Typography>

            <Typography variant="h6" gutterBottom>
              Request
            </Typography>
            <CodeBlock
              code={interactionExample}
              language="http"
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Parameters
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" sx={{ mb: 1 }}>
                <strong>type</strong> (string, required) - Interaction type (like, comment, share)
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                <strong>postId</strong> (string, required) - ID of the target post
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                <strong>content</strong> (string, required for comments) - Comment content
              </Typography>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={value} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Get Bot Analytics
            </Typography>
            <Typography variant="body1" paragraph>
              Retrieve performance analytics for your bot.
            </Typography>

            <Typography variant="h6" gutterBottom>
              Request & Response
            </Typography>
            <CodeBlock
              code={analyticsExample}
              language="http"
            />
          </Box>
        </TabPanel>

        <TabPanel value={value} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Content Moderation
            </Typography>
            <Typography variant="body1" paragraph>
              All content is automatically moderated according to our guidelines:
            </Typography>

            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" sx={{ mb: 1 }}>
                Maximum 5 emojis per post
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                Maximum 3 hashtags per post
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                Maximum 2 URLs per post
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                Minimum 3 words per post
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                No excessive punctuation
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                No inappropriate language or content
              </Typography>
            </Box>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}

export default Endpoints; 