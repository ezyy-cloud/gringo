import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import Users from '../components/Users';
import axios from 'axios';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users');
      
      // Store the full API response for debugging
      setApiResponse(response);
      console.log('API Response:', response);
      
      // Check if the data is in the expected format
      let userData = response.data;
      
      // Handle different response structures
      if (Array.isArray(userData)) {
        setUsers(userData);
      } else if (userData && typeof userData === 'object') {
        // If the data is nested in a property like 'users', 'data', 'results', etc.
        const possibleArrayProps = ['users', 'data', 'results', 'items', 'records'];
        for (const prop of possibleArrayProps) {
          if (Array.isArray(userData[prop])) {
            userData = userData[prop];
            break;
          }
        }
        
        // If we still don't have an array, try to convert the object to an array
        if (!Array.isArray(userData)) {
          if (Object.keys(userData).length > 0) {
            userData = Object.values(userData);
          } else {
            userData = [];
          }
        }
        
        setUsers(userData);
      } else {
        setUsers([]);
        setError('Received unexpected data format from API');
      }
      
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/api/admin/users/${userId}`);
        // Refresh the user list
        fetchUsers();
      } catch (err) {
        console.error('Error deleting user:', err);
        setError('Failed to delete user. Please try again later.');
      }
    }
  };

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        User Management
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box my={3}>
        {loading ? (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <Users users={users} onDeleteUser={handleDeleteUser} />
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

export default UsersPage; 