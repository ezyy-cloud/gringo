import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

function ErrorHandling() {
  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Error Handling
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Overview
        </Typography>
        <Typography paragraph>
          Understanding how to handle errors effectively is crucial for building robust bots.
          This guide covers common error scenarios and best practices for error handling.
        </Typography>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Common Error Codes
        </Typography>
        <Typography component="div">
          <ul>
            <li>400 - Bad Request</li>
            <li>401 - Unauthorized</li>
            <li>403 - Forbidden</li>
            <li>404 - Not Found</li>
            <li>429 - Too Many Requests</li>
            <li>500 - Internal Server Error</li>
          </ul>
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Error Response Format
        </Typography>
        <Typography component="pre" sx={{ 
          backgroundColor: '#f5f5f5',
          padding: 2,
          borderRadius: 1,
          overflow: 'auto'
        }}>
{`{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}`}
        </Typography>
      </Paper>
    </Box>
  );
}

export default ErrorHandling; 