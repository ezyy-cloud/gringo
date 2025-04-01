import axios from 'axios';
import socketService from './socketService'; // Import socketService to get socket ID
import { getStatusFallback } from '../utils/api-fallbacks';

// Server URL - from environment variables
const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create an axios instance with default config
const api = axios.create({
  baseURL: SERVER_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 second timeout
});

// Flag to track if we're in fallback mode
let isInFallbackMode = false;

// Helper method to get the auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  return token;
};

// Add request/response interceptors to add authentication headers and handle errors
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    
    // If we successfully got a response, we're not in fallback mode
    isInFallbackMode = false;
    
    return response;
  },
  (error) => {
    
    // Handle rate limiting (429) errors
    if (error.response && error.response.status === 429) {
      
      // Store the time of rate limiting for backoff
      const now = Date.now();
      localStorage.setItem('api_rate_limited_at', now.toString());
      
      // Don't attempt to reload or redirect, just return a user-friendly error
      return Promise.reject({
        response: error.response,
        message: "You're making too many requests. Please wait a moment before trying again.",
        isRateLimited: true
      });
    }
    
    // If status is 401 Unauthorized, clear token and redirect to login
    if (error.response && error.response.status === 401) {
      // Only redirect if the error was for an API endpoint, not for socket.io
      if (!error.config.url.includes('socket.io')) {
        localStorage.removeItem('token');
        window.location.href = '/auth';
      }
    }
    
    // Network errors indicate server might be unreachable
    if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
      isInFallbackMode = true;
    }
    
    return Promise.reject(error);
  }
);

// A cached version of messages for offline use
let cachedMessages = null;

// API service methods
const apiService = {
  // Check if we're in fallback mode
  isInFallbackMode: () => isInFallbackMode,
  
  // Enable fallback mode manually
  enableFallbackMode: () => {
    isInFallbackMode = true;
  },
  
  // Disable fallback mode manually
  disableFallbackMode: () => {
    isInFallbackMode = false;
  },
  
  // Check server status - used to determine if we should be in fallback mode
  checkServerStatus: async () => {
    try {
      const response = await api.get('/api/status');
      isInFallbackMode = false;
      return response.data;
    } catch {
      isInFallbackMode = true;
      return getStatusFallback();
    }
  },

  // Get server status
  getStatus: async () => {
    const response = await api.get('/api/status');
    return response.data;
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
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error'
      };
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
      
      // Make sure message is included in formData
      if (!formData.has('message')) {
        formData.append('message', message);
      }
      
      // Only add username if it's not already in the formData
      if (!formData.has('username')) {
        // Get the username from localStorage or parse from token
        let username = null;
  
          // Try to get the current user from localStorage
          const userJson = localStorage.getItem('user');
          if (userJson) {
            const user = JSON.parse(userJson);
            username = user.username;
          }
          
          // If no username found and we have a token, try to get it from there
          if (!username && token) {
            // Parse the JWT token to get the username (if included in the payload)
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              if (payload.username) {
                username = payload.username;
              }
            }
          }
          
          // Add username to the form data if found
          if (username) {
            formData.append('username', username);
          }
        } 
      
      
      // Use axios directly for multipart/form-data
      const response = await axios({
        method: 'post',
        url: `${SERVER_URL}/api/messages/with-image`,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error'
      };
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
      if (response.data) {
        response.data.success = response.data.success ?? true;
      }
      
      // Validate that data.messages exists in the response
      if (response.data.success && (!response.data.data || !response.data.data.messages)) {
        return { 
          success: false, 
          message: 'Invalid server response format',
          originalResponse: response.data
        };
      }
      
      return response.data;
    } catch (error) {
      
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
        return { success: false, message: 'Authentication token missing' };
      }
      
      const response = await api.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Ensure response has success flag for consistency
      if (response.data) {
        response.data.success = response.data.success ?? true;
      }
      
      return response.data;
    } catch (error) {
      
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
      return {
        success: false,
        message: 'Failed to fetch all messages with auto-pagination',
        error: error.message
      };
    }
  },
  
  // Get messages (latest messages with online users)
  getMessages: async (minutesWindow = 30) => {
    try {
      
      // Check for recent rate limiting
      const rateLimitedAt = parseInt(localStorage.getItem('api_rate_limited_at') || '0');
      const now = Date.now();
      const backoffTime = 30000; // 30 seconds backoff after rate limiting
      
      if (rateLimitedAt > 0 && now - rateLimitedAt < backoffTime) {
        
        // Return cached messages if available
        if (cachedMessages && cachedMessages.length > 0) {
          return {
            success: true,
            messages: cachedMessages,
            onlineUsers: {},
            fromCache: true
          };
        }
        
        // If no cached messages, return a simple response
        return {
          success: false,
          message: 'Rate limited. Please try again in a few moments.',
          isRateLimited: true
        };
      }
      
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, message: 'Authentication token missing' };
      }
      
      // Get current username from localStorage for like status
      const userData = localStorage.getItem('user');
      const currentUsername = userData ? JSON.parse(userData).username : null;
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // If currentUsername is available, add it to get like status
      if (currentUsername) {
        params.append('currentUser', currentUsername);
      }
      
      // Add parameter to include location data
      params.append('includeLocation', 'true');
      
      // Add parameters for sorting and limiting
      params.append('limit', '50');  // Get up to 50 messages
      params.append('sort', '-createdAt');  // Sort by newest first
      
      // Add time window parameter for server-side filtering
      const timeWindowMs = minutesWindow * 60 * 1000;
      const minCreatedAt = new Date(Date.now() - timeWindowMs).toISOString();
      params.append('minCreatedAt', minCreatedAt);
      
      // Create URL with parameters
      let url = `/api/messages?${params.toString()}`;
      
      // For debugging, let's log the exact URL we're requesting
      
   
        const response = await api.get(url, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // Extract messages based on different possible response formats
        let messages = [];
        let onlineUsers = {};
        
        // Case 1: response.data.data.messages format
        if (response.data && response.data.data && response.data.data.messages) {
          messages = response.data.data.messages;
          onlineUsers = response.data.data.onlineUsers || {};
        }
        // Case 2: response.data.messages format
        else if (response.data && response.data.messages) {
          messages = response.data.messages;
          onlineUsers = response.data.onlineUsers || {};
        }
        // Case 3: Array response format
        else if (Array.isArray(response.data)) {
          messages = response.data;
        }
        // Case 4: Unknown format but has data property
        else if (response.data && typeof response.data === 'object') {
          // Try to find a property that could be messages
          const possibleMessageArrays = Object.entries(response.data)
            .filter(([, value]) => Array.isArray(value))
            .sort(([, a], [, b]) => b.length - a.length);
          
          if (possibleMessageArrays.length > 0) {
            const [value] = possibleMessageArrays[0];
            messages = value;
          }
        }

        // If we found messages, check for location data
        if (messages.length > 0) {
          
          // Return with consistent format
          return {
            success: true,
            messages: messages,
            onlineUsers: onlineUsers
          };
        }
        
        const testMessages = Array(5).fill().map((_, index) => ({
          _id: `test-${index}`,
          messageId: `test-${index}`,
          senderUsername: `TestUser${index}`,
          text: `This is a test message ${index + 1} with location data.`,
          createdAt: new Date(Date.now() - index * 3600000).toISOString(),
          location: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.05, // NYC with slight variations
            longitude: -74.0060 + (Math.random() - 0.5) * 0.05,
            fuzzyLocation: true
          },
          likes: [],
          likesCount: Math.floor(Math.random() * 10)
        }));
        
        return { 
          success: true, 
          message: 'Using test messages due to unexpected server response',
          messages: testMessages,
          onlineUsers: {},
          isTestData: true
        };
      
    } catch (error) {
      const testMessages = Array(5).fill().map((_, index) => ({
        _id: `test-error-${index}`,
        messageId: `test-error-${index}`,
        senderUsername: `ErrorUser${index}`,
        text: `This is a fallback message ${index + 1} generated due to API error.`,
        createdAt: new Date(Date.now() - index * 3600000).toISOString(),
        location: {
          latitude: 40.7128 + (Math.random() - 0.5) * 0.05, // NYC with slight variations
          longitude: -74.0060 + (Math.random() - 0.5) * 0.05,
          fuzzyLocation: true
        },
        likes: [],
        likesCount: Math.floor(Math.random() * 10)
      }));
      
      return {
        success: true,
        message: 'Using test messages due to API error',
        messages: testMessages,
        onlineUsers: {},
        isTestData: true,
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

      const token = localStorage.getItem('token');
      const response = await api.delete(`/api/messages/${messageId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;

  },
  
  // Get total likes for a user
  getUserLikes: async (username) => {

      const response = await api.get(`/api/users/${username}/likes`);
      return response.data;

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
      if (response.data) {
        response.data.success = response.data.success ?? true;
      }
      
      return response.data;
    } catch (error) {
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
  },
};

export default apiService; 