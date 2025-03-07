import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import Messages from '../components/Messages';
import axios from 'axios';

const MessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/messages');
      
      // Store the full API response for debugging
      setApiResponse(response);
      console.log('API Response:', response);
      
      // Check if the data is in the expected format
      let messageData = response.data;
      
      // Handle different response structures
      if (Array.isArray(messageData)) {
        setMessages(messageData);
      } else if (messageData && typeof messageData === 'object') {
        // If the data is nested in a property like 'messages', 'data', 'results', etc.
        const possibleArrayProps = ['messages', 'data', 'results', 'items', 'records'];
        for (const prop of possibleArrayProps) {
          if (Array.isArray(messageData[prop])) {
            messageData = messageData[prop];
            break;
          }
        }
        
        // If we still don't have an array, try to convert the object to an array
        if (!Array.isArray(messageData)) {
          if (Object.keys(messageData).length > 0) {
            messageData = Object.values(messageData);
          } else {
            messageData = [];
          }
        }
        
        setMessages(messageData);
      } else {
        setMessages([]);
        setError('Received unexpected data format from API');
      }
      
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await axios.delete(`/api/admin/messages/${messageId}`);
        // Refresh the message list
        fetchMessages();
      } catch (err) {
        console.error('Error deleting message:', err);
        setError('Failed to delete message. Please try again later.');
      }
    }
  };

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Message Management
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box my={3}>
        {loading ? (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <Messages messages={messages} onDeleteMessage={handleDeleteMessage} />
        )}
      </Box>
      
      {/* Debug section for API response */}
      {apiResponse && (
        <Box mt={4} p={2} sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>API Response Debug:</Typography>
          <Typography variant="body2">Status: {apiResponse.status}</Typography>
          <Typography variant="body2">Headers: {JSON.stringify(apiResponse.headers)}</Typography>
          <Typography variant="subtitle2" mt={1}>Response Data Structure:</Typography>
          <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(apiResponse.data, null, 2)}
          </pre>
        </Box>
      )}
    </Container>
  );
};

export default MessagesPage; 