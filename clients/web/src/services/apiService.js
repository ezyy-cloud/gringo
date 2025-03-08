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

// Helper method to get the auth token from localStorage
const getAuthToken = () => {
  console.log('ApiService: Getting auth token');
  const token = localStorage.getItem('token');
  console.log('ApiService: Token exists:', !!token);
  return token;
};

// Add request/response interceptors to add authentication headers and handle errors
api.interceptors.request.use(
  (config) => {
    console.log('ApiService: Intercepting request to:', config.url);
    const token = getAuthToken();
    if (token) {
      console.log('ApiService: Adding auth token to request');
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('ApiService: Request interceptor error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('ApiService: Response received success');
    return response;
  },
  (error) => {
    console.error('ApiService: Response error:', error.response?.status, error.response?.data);
    
    // If status is 401 Unauthorized, clear token and redirect to login
    if (error.response && error.response.status === 401) {
      console.log('ApiService: 401 Unauthorized response, clearing token');
      localStorage.removeItem('token');
      
      // Check if we are not already on the login page
      if (!window.location.pathname.includes('/auth')) {
        console.log('ApiService: Redirecting to login page');
        window.location.href = '/auth';
      }
    }
    
    return Promise.reject(error);
  }
);

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
      
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token missing when fetching user messages');
        return { success: false, message: 'Authentication token missing' };
      }
      
      const response = await api.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Validate the response structure
      if (!response.data) {
        return { success: false, message: 'Invalid response from server' };
      }
      
      // Ensure response has success flag for consistency
      if (response.data && !response.data.hasOwnProperty('success')) {
        response.data.success = true;
      }
      
      // Validate that data.messages exists in the response
      if (response.data.success && (!response.data.data || !response.data.data.messages)) {
        console.error('Missing messages array in server response:', response.data);
        return { 
          success: false, 
          message: 'Invalid server response format',
          originalResponse: response.data
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user messages:', error);
      
      // Return structured error for better handling
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch user messages',
        error: error.response?.data || error.message
      };
    }
  },
  
  // Get all messages (optionally excluding a specific user)
  getAllMessages: async (excludeUsername = null, currentUsername = null, page = 1, limit = 50) => {
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
      
      // Add pagination parameters
      params.append('page', page);
      params.append('limit', limit);
      
      // Add params to URL if any exist
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token missing');
        return { success: false, message: 'Authentication token missing' };
      }
      
      const response = await api.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Add success flag for consistency
      if (response.data && !response.data.hasOwnProperty('success')) {
        response.data.success = true;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      
      // Return structured error for better handling
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch messages',
        error: error.response?.data || error.message
      };
    }
  },
  
  // Fetch all messages automatically with pagination until reaching messages older than threshold
  getAllMessagesWithAutoPagination: async (excludeUsername = null, currentUsername = null, thresholdMinutes = 30) => {
    try {
      const allMessages = [];
      let page = 1;
      const limit = 50; // Use default of 50 per page
      let hasMore = true;
      let reachedThreshold = false;
      const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);
      
      // Get auth token once
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token missing');
        return { success: false, message: 'Authentication token missing' };
      }
      
      // Continue fetching pages until we reach the time threshold or there are no more messages
      while (hasMore && !reachedThreshold) {
        // Build query parameters for this page
        const params = new URLSearchParams();
        
        // If a username is provided, exclude their messages
        if (excludeUsername) {
          params.append('exclude', excludeUsername);
        }
        
        // If currentUsername is provided, add it to get like status
        if (currentUsername) {
          params.append('currentUser', currentUsername);
        }
        
        // Add pagination parameters
        params.append('page', page);
        params.append('limit', limit);
        
        // Create URL with parameters
        let url = `/api/messages?${params.toString()}`;
        
        // Make the API call directly
        const response = await api.get(url, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).then(res => res.data);
        
        if (!response.success || !response.messages || !Array.isArray(response.messages)) {
          console.error('Error or invalid response format when fetching messages page', page, response);
          break;
        }
        
        // No more messages to fetch
        if (response.messages.length === 0) {
          hasMore = false;
          break;
        }
        
        // Check if any messages are older than the threshold
        const oldestMessageTimestamp = new Date(response.messages[response.messages.length - 1].createdAt);
        if (oldestMessageTimestamp < thresholdTime) {
          // We found messages older than the threshold
          reachedThreshold = true;
          
          // Filter out messages older than threshold before adding to our collection
          const recentMessages = response.messages.filter(msg => 
            new Date(msg.createdAt) >= thresholdTime
          );
          allMessages.push(...recentMessages);
        } else {
          // All messages in this page are within the time threshold
          allMessages.push(...response.messages);
        }
        
        // Check if there are more pages based on pagination info
        if (response.pagination && response.pagination.page < response.pagination.pages) {
          page++;
        } else {
          hasMore = false;
        }
      }
      
      // Return the collected messages in the same format as a regular response
      return {
        success: true,
        messages: allMessages,
        pagination: {
          total: allMessages.length,
          pages: 1,
          page: 1
        }
      };
    } catch (error) {
      console.error('Error in auto-pagination:', error);
      return {
        success: false,
        message: 'Failed to fetch all messages with auto-pagination',
        error: error.message
      };
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
      
      // Ensure consistent response format
      if (response.data && response.data.success) {
        return {
          success: true,
          liked: response.data.liked,
          likesCount: response.data.likesCount,
          messageId: response.data.messageId
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error toggling message like:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to toggle like status'
      };
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
      
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token missing');
        return { success: false, message: 'Authentication token missing' };
      }
      
      const response = await api.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Validate the response structure
      if (!response.data) {
        console.error('Empty response when fetching liked messages');
        return { success: false, message: 'Invalid response from server' };
      }
      
      // Ensure response has success flag for consistency
      if (response.data && !response.data.hasOwnProperty('success')) {
        response.data.success = true;
      }
      
      // Log the response for debugging
      console.log('Liked messages response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching liked messages:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch liked messages',
        error: error.response?.data || error.message
      };
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