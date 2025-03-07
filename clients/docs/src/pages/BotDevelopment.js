import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

function BotDevelopment() {
  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Bot Development Guide
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Getting Started
        </Typography>
        <Typography paragraph>
          Learn how to create and deploy custom bots on the Gringo platform. Our comprehensive
          development guide covers everything from basic setup to advanced features.
        </Typography>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Available Bot Types
        </Typography>
        <Typography component="div">
          <ul>
            <li>Local News Bot</li>
            <li>Viral Trend Bot</li>
            <li>Conversational Bot</li>
            <li>Insider Bot</li>
            <li>Hype Bot</li>
          </ul>
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Development Best Practices
        </Typography>
        <Typography paragraph>
          Follow our recommended best practices for bot development to ensure optimal
          performance, reliability, and user engagement.
        </Typography>
      </Paper>
    </Box>
  );
}

export default BotDevelopment; 