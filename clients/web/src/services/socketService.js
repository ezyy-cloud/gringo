import socketClientFactory from '../socket/SocketClientFactory';

// Server URL - from environment variables
const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create a service wrapper for the socket client
const socketService = {
  // Connect to the server
  connect: (callbacks = {}, username = null) => {
    // Get the main socket client from the factory
    const mainClient = socketClientFactory.getClient('main', 'main', SERVER_URL);
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
  
  // Request notification permission explicitly
  requestNotificationPermission: async () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.requestNotificationPermission();
  },
  
  // Check if notifications are supported
  areNotificationsSupported: () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.areNotificationsSupported();
  },
  
  // Get connection state constants
  getConnectionStates: () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.CONNECTION_STATES;
  },
  
  // Get the socket instance for direct event handling
  getSocket: () => {
    const mainClient = socketClientFactory.getClient('main');
    return mainClient.getSocket();
  }
};

export default socketService; 