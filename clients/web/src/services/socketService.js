import socketClientFactory from '../socket/SocketClientFactory';

// Server URL configuration
// 1. Use environment variable if available
// 2. If not, use window location (enables automatic working in all environments)
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

// Create direct socket URL - strip any path components
const createSocketUrl = (url) => {
  if (!url) return window.location.origin;
  
  try {
    // Parse the URL to extract just the origin part (protocol + host + port)
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return window.location.origin;
  }
};

// Socket server URL (just the origin part of the URL)
const SOCKET_SERVER_URL = createSocketUrl(API_URL);

// Create a service wrapper for the socket client
const socketService = {
  // Connect to the server
  connect: (callbacks = {}, username = null) => {
    // Get the main socket client from the factory
    const mainClient = socketClientFactory.getClient('main', 'main', SOCKET_SERVER_URL);
    
    // Ensure any existing socket is disconnected first
    if (mainClient.isConnected()) {
      mainClient.disconnect();
    }
    
    mainClient.connect(callbacks, username);
  },

  // Disconnect from the server
  disconnect: () => {
    const mainClient = socketClientFactory.getClient('main');
    mainClient.disconnect();
  },

  // Send a message via Socket.IO
  sendMessage: (message, username = null, location = null) => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.sendMessage(message, username, location);
  },

  // Resend a failed message
  resendMessage: (messageData) => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.resendMessage(messageData);
  },

  // Get the connection status
  isConnected: () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.isConnected();
  },
  
  // Get current connection state
  getConnectionState: () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.getConnectionState();
  },

  // Get the socket ID for identifying the client
  getSocketId: () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.getSocketId();
  },
  
  // Get the socket instance directly (use with caution)
  getSocket: () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.getSocket();
  },
  
  // Check if notifications are supported by the browser
  areNotificationsSupported: () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.notificationSupported;
  },
  
  // Request notification permission
  async requestNotificationPermission() {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.requestNotificationPermission();
  },
  
  // Show a notification
  showNotification: (title, options) => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.showNotification(title, options);
  },
  
  // Get connection state constants
  getConnectionStates: () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.CONNECTION_STATES;
  },
  
  // Diagnostic method to check if server is reachable
  checkServerStatus: async () => {
    
    // Add timestamp tracking to prevent excessive calls
    const now = Date.now();
    const lastCheckKey = 'socketService_lastServerCheck';
    const lastCheck = parseInt(sessionStorage.getItem(lastCheckKey) || '0');
    const minTimeBetweenChecks = 10000; // 10 seconds minimum between checks
    
    if (now - lastCheck < minTimeBetweenChecks) {
      
      // Return the last result if available
      const lastResultKey = 'socketService_lastServerCheckResult';
      const lastResult = sessionStorage.getItem(lastResultKey);
      if (lastResult) {
        return JSON.parse(lastResult);
      }
      
      // If no last result, assume server is unreachable
      return {
        success: false,
        message: 'Server check skipped (rate limited)',
        rateLimited: true
      };
    }
    
    // Store the current timestamp
    sessionStorage.setItem(lastCheckKey, now.toString());
    
    // Try multiple endpoints to check server availability
    // BUT only try one endpoint at a time instead of all of them
    const endpointsToTry = [
      '/api/status', // Try status first as it's likely lightweight
      '/api/messages', // Only try this if status fails
      '/api/health',
      '/api/ping'
    ];
    
    // Only try one endpoint instead of looping through all
    const endpoint = endpointsToTry[0]; // Just use the first endpoint
    
    try {
      
      // For the messages endpoint, use a GET request since it's likely to require auth
      const authToken = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      // Add auth token if available
      if (authToken && endpoint === '/api/messages') {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${endpoint}`, { // Use relative URLs for proxying
        method: 'GET',
        headers: headers
      });
      
      const result = {
        success: response.ok || response.status === 401, // 401 means server is up but we need auth
        message: `Server is reachable (${endpoint})`,
        status: response.status,
        endpoint: endpoint
      };
      
      // Store the result
      sessionStorage.setItem('socketService_lastServerCheckResult', JSON.stringify(result));
      
      return result;
    } catch (error) {
      
      const result = {
        success: false,
        message: `Server unreachable: ${error.message}`,
        endpoint: endpoint
      };
      
      // Store the result
      sessionStorage.setItem('socketService_lastServerCheckResult', JSON.stringify(result));
      
      return result;
    }
  },
  
  // Get the socket ID for identifying the client
  getServerUrl: () => {
    return API_URL;
  },
  
  // Add method to get socket URL specifically
  getSocketServerUrl: () => {
    return SOCKET_SERVER_URL;
  },
  
  // Enable fallback mode (for when the server is unreachable)
  enableFallbackMode: () => {
    const mainClient = socketClientFactory.getClient('main');
    mainClient.enableFallbackMode();
  },
  
  // Disable fallback mode and attempt normal connection
  disableFallbackMode: () => {
    const mainClient = socketClientFactory.getClient('main');
    mainClient.disableFallbackMode();
  },
  
  // Check if in fallback mode
  isFallbackMode: () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient ? mainClient.isFallbackMode() : false;
  },
};

export default socketService; 