import axios from 'axios';
import socketService from './socketService'; // Import socketService to get socket ID

// Server URL - from environment variables
const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create an axios instance with default config
const api = axios.create({
  baseURL: SERVER_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// API service methods
const apiService = {
  // Get server status
  getStatus: async () => {
    try {
      const response = await api.get('/api/status');
      return response.data;
    } catch (error) {
      
      throw error;
    }
  },

  // Send a message via API
  sendMessage: async (message, username = null, location = null) => {
    try {
      // Get current socket ID to identify the sender
      const socketId = socketService.getSocketId();
      
      
      const response = await api.post('/api/messages', { 
        message,
        socketId, // Include socket ID so server knows who sent it
        username, // Include username for display
        location  // Include location data
      });
      return response.data;
    } catch (error) {
      
      throw error;
    }
  },
  
  // Send a message with an image
  sendMessageWithImage: async (message, formData, location = null) => {
    try {
      const token = localStorage.getItem('token');
      
      // If location is provided, add it to the formData
      if (location) {
        formData.append('location', JSON.stringify(location));
      }
      
      // Set up a request with FormData (required for file uploads)
      const response = await axios({
        method: 'post',
        url: `${SERVER_URL}/api/messages/with-image`,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending message with image:', error);
      throw error;
    }
  },
  
  // Get messages for a specific user
  getUserMessages: async (username, currentUsername = null) => {
    try {
      let url = `/api/messages/${username}`;
      
      // If a currentUsername is provided, add it as a query parameter
      if (currentUsername) {
        url += `?currentUser=${encodeURIComponent(currentUsername)}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  },
  
  // Get all messages (optionally excluding a specific user)
  getAllMessages: async (excludeUsername = null, currentUsername = null) => {
    try {
      let url = '/api/messages';
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // If a username is provided, exclude their messages
      if (excludeUsername) {
        params.append('exclude', excludeUsername);
      }
      
      // If currentUsername is provided, add it to get like status
      if (currentUsername) {
        params.append('currentUser', currentUsername);
      }
      
      // Add params to URL if any exist
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  },
  
  // Like or unlike a message (toggle behavior)
  likeMessage: async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.post(`/api/messages/${messageId}/like`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      
      throw error;
    }
  },
  
  // NOTE: This method is kept for backward compatibility
  // but now likeMessage handles both like and unlike operations
  unlikeMessage: async (messageId) => {
    return apiService.likeMessage(messageId);
  },
  
  // Delete a message
  deleteMessage: async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.delete(`/api/messages/${messageId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },
  
  // Get total likes for a user
  getUserLikes: async (username) => {
    try {
      const response = await api.get(`/api/users/${username}/likes`);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  },
  
  // Get messages liked by a user
  getLikedMessages: async (username, currentUsername = null) => {
    try {
      let url = `/api/users/${username}/liked-messages`;
      
      // If a currentUsername is provided, add it as a query parameter
      if (currentUsername) {
        url += `?currentUser=${encodeURIComponent(currentUsername)}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      
      throw error;
    }
  },
  
  // Get user profile by username
  getUserByUsername: async (username, currentUsername = null) => {
    try {
      let url = `/api/users/${username}`;
      
      // Add currentUsername as query parameter if provided
      if (currentUsername) {
        url += `?currentUsername=${encodeURIComponent(currentUsername)}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to fetch user profile' 
      };
    }
  },

  // Follow a user
  followUser: async (username, currentUsername) => {
    try {
      const response = await api.post(`/api/users/${username}/follow`, { currentUsername });
      return response.data;
    } catch (error) {
      
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to follow user' 
      };
    }
  },

  // Unfollow a user
  unfollowUser: async (username, currentUsername) => {
    try {
      const response = await api.post(`/api/users/${username}/unfollow`, { currentUsername });
      return response.data;
    } catch (error) {
      
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to unfollow user' 
      };
    }
  }
};

export default apiService; 