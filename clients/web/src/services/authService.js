import axios from 'axios';

// Server URL - from environment variables
const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const AUTH_ENDPOINT = `${SERVER_URL}/api/auth`;

// Create an axios instance with default config
const api = axios.create({
  baseURL: AUTH_ENDPOINT,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Important for cookies
});

// Add auth token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth service methods
const authService = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await api.post('/register', userData);
      
      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        // Store token expiration time (assuming 30 days from now)
        const expirationTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
        localStorage.setItem('tokenExpiration', expirationTime);
      }
      
      return response.data;
    } catch (error) {
      
      throw error.response?.data || error;
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post('/login', credentials);
      
      if (response.data.success) {
        // Log user data structure for debugging
        
        
        // Ensure user object has likedMessages property
        if (!response.data.data.user.likedMessages) {
          response.data.data.user.likedMessages = [];
          
        }
        
        
        
        // Store token and user data
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        // Store token expiration time (assuming 30 days from now)
        const expirationTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
        localStorage.setItem('tokenExpiration', expirationTime);
      }
      
      return response.data;
    } catch (error) {
      
      throw error.response?.data || error;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiration');
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/me');
      

      return response.data;
    } catch (error) {
      
      throw error.response?.data || error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const expiration = localStorage.getItem('tokenExpiration');
    
    if (!token) return false;
    
    // Check if token has expired
    if (expiration && parseInt(expiration) < Date.now()) {
      // Token expired, clean up storage
      authService.logout();
      return false;
    }
    
    return true;
  },

  // Get current user from local storage
  getUser: () => {
    const user = localStorage.getItem('user');
    const parsedUser = user ? JSON.parse(user) : null;
    

    return parsedUser;
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/profile', profileData);
      
      if (response.data.success) {
        // Update user data in local storage
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      return response.data;
    } catch (error) {
      
      throw error.response?.data || error;
    }
  },
  
  // Check if user is logged in
  checkLoginStatus: async () => {
    
    // First, check if we have a token
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }
    
    try {
      // Make API call to validate token
      const response = await api.get('/me');
      
      if (response.data.success && response.data.data.user) {
        return response.data.data.user;
      } else {
        // Clear invalid token
        localStorage.removeItem('token');
        return null;
      }
    } catch {
      // If there's an error (like 401 Unauthorized), clear the token
      localStorage.removeItem('token');
      return null;
    }
  },
  
  // Refresh auth token
  refreshToken: async () => {
    try {
      const response = await api.post('/refresh-token');
      
      if (response.data.success) {
        // Store new token
        localStorage.setItem('token', response.data.data.token);
        
        // Update expiration time
        const expirationTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
        localStorage.setItem('tokenExpiration', expirationTime.toString());
        
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }
};

export default authService; 