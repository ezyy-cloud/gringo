import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

function Webhooks() {
  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Webhooks
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Overview
        </Typography>
        <Typography paragraph>
          Webhooks allow your application to receive real-time updates from the Gringo platform.
          Learn how to configure and handle webhook events effectively.
        </Typography>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Available Events
        </Typography>
        <Typography component="div">
          <ul>
            <li>bot.created</li>
            <li>bot.updated</li>
            <li>bot.deleted</li>
            <li>message.received</li>
            <li>message.sent</li>
            <li>user.interaction</li>
          </ul>
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Webhook Payload Format
        </Typography>
        <Typography component="pre" sx={{ 
          backgroundColor: '#f5f5f5',
          padding: 2,
          borderRadius: 1,
          overflow: 'auto'
        }}>
{`{
  "event": "event.name",
  "timestamp": "2024-03-21T12:00:00Z",
  "data": {
    // Event specific data
  }
}`}
        </Typography>
      </Paper>
    </Box>
  );
}

export default Webhooks; 