import React from 'react';
import { Box, Typography, Paper, Alert, Divider } from '@mui/material';
import CodeBlock from '../components/CodeBlock';

function Authentication() {
  const authHeaderExample = `
// Using fetch
fetch('https://api.gringo.com/v1/posts', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

// Using axios
axios.get('https://api.gringo.com/v1/posts', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

// Using curl
curl -H "Authorization: Bearer YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     https://api.gringo.com/v1/posts
`;

  const rateLimitExample = `
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "reset": "2024-03-04T12:00:00Z"
    }
  }
}`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Authentication
      </Typography>
      <Typography variant="body1" paragraph>
        The Gringo API uses API keys to authenticate requests. You can view and manage your API keys in your Gringo Dashboard.
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        Keep your API keys secure! Do not share them in publicly accessible places such as GitHub or client-side code.
      </Alert>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Authentication Header
        </Typography>
        <Typography variant="body1" paragraph>
          To authenticate your requests, include your API key in the Authorization header:
        </Typography>
        <CodeBlock
          code="Authorization: Bearer YOUR_API_KEY"
          language="http"
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Code Examples
        </Typography>
        <Typography variant="body1" paragraph>
          Here are examples of how to include the authentication header in your requests:
        </Typography>
        <CodeBlock
          code={authHeaderExample}
          language="javascript"
        />
      </Paper>

      <Typography variant="h5" gutterBottom>
        Rate Limiting
      </Typography>
      <Typography variant="body1" paragraph>
        The API implements rate limiting to ensure fair usage. Rate limits vary by tier:
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography component="div" variant="body1">
          • Free tier: 1,000 requests/hour
        </Typography>
        <Typography component="div" variant="body1">
          • Pro tier: 10,000 requests/hour
        </Typography>
        <Typography component="div" variant="body1">
          • Enterprise tier: Custom limits
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Rate Limit Headers
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            The API includes rate limit information in the response headers:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2">
              X-RateLimit-Limit: Total requests allowed per hour
            </Typography>
            <Typography component="li" variant="body2">
              X-RateLimit-Remaining: Remaining requests for the current hour
            </Typography>
            <Typography component="li" variant="body2">
              X-RateLimit-Reset: Time when the rate limit will reset (UTC)
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" gutterBottom>
          When you exceed your rate limit, you'll receive a 429 Too Many Requests response:
        </Typography>
        <CodeBlock
          code={rateLimitExample}
          language="json"
        />
      </Paper>

      <Typography variant="h5" gutterBottom>
        Best Practices
      </Typography>
      <Box component="ul" sx={{ pl: 2 }}>
        <Typography component="li" sx={{ mb: 1 }}>
          Store API keys securely in environment variables or a secure key management system
        </Typography>
        <Typography component="li" sx={{ mb: 1 }}>
          Implement exponential backoff when handling rate limit errors
        </Typography>
        <Typography component="li" sx={{ mb: 1 }}>
          Monitor your API usage and set up alerts for unusual patterns
        </Typography>
        <Typography component="li" sx={{ mb: 1 }}>
          Rotate API keys periodically and immediately if compromised
        </Typography>
      </Box>
    </Box>
  );
}

export default Authentication; 