import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

function Analytics() {
  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Analytics & Insights
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Overview
        </Typography>
        <Typography paragraph>
          The Analytics API provides comprehensive insights into your bot's performance and user engagement metrics.
          Monitor key statistics, track user interactions, and optimize your bot's effectiveness.
        </Typography>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Available Metrics
        </Typography>
        <Typography component="div">
          <ul>
            <li>User engagement rates</li>
            <li>Response times</li>
            <li>User satisfaction scores</li>
            <li>Conversation completion rates</li>
            <li>Peak usage times</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Analytics; 