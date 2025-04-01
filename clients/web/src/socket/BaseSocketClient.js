import { io } from 'socket.io-client';

/**
 * Base Socket Client Class
 * Provides common functionality for all socket clients
 */
class BaseSocketClient {
  constructor(serverUrl, options = {}) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.connectionState = 'disconnected';
    this.messageQueue = [];
    this.messageSequence = 0;
    this.heartbeatInterval = null;
    this.reconnectTimeout = null;
    this.currentUsername = null;
    this.fallbackMode = false;
    
    // Default socket options
    this.socketOptions = {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: false,
      ...options
    };
    
    // Connection state constants
    this.CONNECTION_STATES = {
      DISCONNECTED: 'disconnected',
      CONNECTING: 'connecting',
      CONNECTED: 'connected',
      RECONNECTING: 'reconnecting',
      FALLBACK: 'fallback'
    };
  }

  /**
   * Initialize the socket connection
   */
  initialize() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Normalize server URL - essential for reliable connections
    let effectiveServerUrl = this.serverUrl;
    
    // Handle null, empty or invalid URLs gracefully
    if (!effectiveServerUrl || effectiveServerUrl === '/' || effectiveServerUrl === '') {
      effectiveServerUrl = window.location.origin;
    }
    
    // Check for valid URL format
    try {
      // Normalize URL to ensure it's an origin (protocol + host + port)
      const urlObj = new URL(effectiveServerUrl);
      effectiveServerUrl = urlObj.origin; // Just protocol + host + port
    } catch {
      effectiveServerUrl = window.location.origin;
    }
    
    // Store for logging purposes
    const connectionUrl = effectiveServerUrl;

    // Validate URL before proceeding
    if (!connectionUrl) {
      this.connectionState = this.CONNECTION_STATES.DISCONNECTED;
      return false;
    }
    
    // Configure options based on connection type
    const socketOptions = {
      ...this.socketOptions,
      path: '/socket.io',
      autoConnect: false,
    };
    
    try {
      // Create the socket instance
      this.socket = io(connectionUrl, socketOptions);
    
      return true;
    } catch {
      this.connectionState = this.CONNECTION_STATES.DISCONNECTED;
      return false;
    }
  }

  /**
   * Connect to the socket server
   * @param {Object} callbacks - Event callbacks
   * @param {string} username - Current username
   */
  connect(callbacks = {}, username = null) {
    
    // Initialize socket if needed
    if (!this.socket) {
      const initSuccess = this.initialize();
      if (!initSuccess) {
        if (callbacks.onConnectError) {
          callbacks.onConnectError(new Error('Socket initialization failed'));
        }
        return;
      }
    }
    
    if (username) {
      this.currentUsername = username;
    }
    
    // Only proceed if we're not already connected
    if (this.connectionState === this.CONNECTION_STATES.CONNECTED) {
      if (callbacks.onConnect) callbacks.onConnect();
      
      // Set username if provided, even if already connected
      if (this.currentUsername) {
        this.authenticate(this.currentUsername);
      }
      return;
    }
    
    if (this.connectionState === this.CONNECTION_STATES.CONNECTING || 
        this.connectionState === this.CONNECTION_STATES.RECONNECTING) {
      return;
    }
    
    // Update state and prepare for connection
   this.updateConnectionState(this.CONNECTION_STATES.CONNECTING);
    
    // Remove ALL existing listeners to prevent duplicates
    this.socket.removeAllListeners();
    
   this.setupEventListeners(callbacks);
    
    
    // Handle connection timeout manually since socket.io timeout doesn't always work
    const connectionTimeout = setTimeout(() => {
      if (this.connectionState !== this.CONNECTION_STATES.CONNECTED) {
       if (callbacks.onConnectError) {
          callbacks.onConnectError(new Error('Connection timeout'));
        }
      }
    }, 20000);
    
    // Store connection timeout to clear it later
    this.connectionTimeout = connectionTimeout;
    
    // Attempt connection
    this.socket.connect();
  }

  /**
   * Authenticate with the server
   * @param {string} username - Username to authenticate with
   * @param {string} token - JWT token (if available)
   */
  authenticate(username, token = null) {
    if (!this.socket) {
      return;
    }

    // Get token from localStorage if not provided
    if (!token) {
      token = localStorage.getItem('token');
    }
  
    // Save the username for later use
    this.currentUsername = username;
    
    // Create the auth payload
    const authPayload = {
      username,
      token
    };
    
    // Send authentication event to server
    this.socket.emit('authenticate', authPayload);
  }

  /**
   * Setup socket event listeners
   * @param {Object} callbacks - Event callbacks
   */
  setupEventListeners(callbacks) {
    
    // Connection events
    this.socket.on('connect', () => {
      this.updateConnectionState(this.CONNECTION_STATES.CONNECTED);
      
      // Clear connection timeout if it exists
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // Authenticate if we have a username
      if (this.currentUsername) {
        this.authenticate(this.currentUsername);
      }
      
      // Setup heartbeat
      this.setupHeartbeat();
      
      // Process any queued messages
      this.processMessageQueue();
      
      if (callbacks.onConnect) callbacks.onConnect();
    });

    this.socket.on('connect_error', (error) => {
      if (this.connectionState !== this.CONNECTION_STATES.RECONNECTING) {
        this.updateConnectionState(this.CONNECTION_STATES.RECONNECTING);
      }
      
      if (callbacks.onConnectError) callbacks.onConnectError(error);
    });

    this.socket.on('disconnect', (reason) => {
      
      // Clear heartbeat interval
      clearInterval(this.heartbeatInterval);
      
      // Update connection state based on reason
      if (reason === 'io client disconnect' || reason === 'io server disconnect') {
        // Intentional disconnect
        this.updateConnectionState(this.CONNECTION_STATES.DISCONNECTED);
      } else {
        // Unintentional disconnect, prepare for reconnection
        this.updateConnectionState(this.CONNECTION_STATES.RECONNECTING);
        
        // Setup manual reconnect if needed
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          if (this.connectionState === this.CONNECTION_STATES.RECONNECTING) {
            this.socket.connect();
          }
        }, 5000);
      }
      
      if (callbacks.onDisconnect) callbacks.onDisconnect(reason);
    });

    // Authentication response
    this.socket.on('authenticated', (data) => {
      
      if (data.success) {
        
        // Store username returned from server
        if (data.username) {
          this.currentUsername = data.username;
        }
        
        // Call onAuthenticated callback if provided
        if (callbacks.onAuthenticated) {
          callbacks.onAuthenticated(data);
        }
      } else {
        
        // Call onAuthenticationFailed callback if provided
        if (callbacks.onAuthenticationFailed) {
          callbacks.onAuthenticationFailed(data);
        }
      }
    });
  }

  /**
   * Disconnect from the socket server
   */
  disconnect() {
    // Clear timers
    clearInterval(this.heartbeatInterval);
    clearTimeout(this.reconnectTimeout);
    
    if (this.socket) {
      // Remove all listeners before disconnecting
      this.socket.removeAllListeners();
      
      if (this.socket.connected) {
        this.socket.disconnect();
      }
    }
    
    // Reset state
    this.updateConnectionState(this.CONNECTION_STATES.DISCONNECTED);
    this.currentUsername = null;
  }

  /**
   * Emit an event with queue support
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   * @returns {number} Message sequence number
   */
  emitWithQueue(eventName, data) {
    // Add sequence number to track message order
    const messageData = {
      ...data,
      _seq: this.messageSequence++,
      _timestamp: Date.now()
    };
    

    if (this.connectionState === this.CONNECTION_STATES.CONNECTED && this.socket?.connected) {
      // If connected, send directly
      this.socket.emit(eventName, messageData);
    } else {
      // Otherwise queue for later
      this.messageQueue.push({
        eventName,
        data: messageData
      });
    }
    
    // Return the sequence number so caller can track it if needed
    return this.messageSequence - 1;
  }

  /**
   * Process message queue when connection is restored
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0 || this.connectionState !== this.CONNECTION_STATES.CONNECTED) {
      return;
    }

    // Process all queued messages
    const queueCopy = [...this.messageQueue];
    this.messageQueue = [];
    
    queueCopy.forEach(item => {
      this.socket.emit(item.eventName, item.data);
    });
  }

  /**
   * Setup heartbeat to detect zombie connections
   */
  setupHeartbeat() {
    clearInterval(this.heartbeatInterval);
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat', { timestamp: Date.now() });
      } else {
        clearInterval(this.heartbeatInterval);
      }
    }, 30000); // 30 second heartbeat
  }

  /**
   * Update connection state
   * @param {string} newState - New connection state
   */
  updateConnectionState(newState) {
    this.connectionState = newState;
  }

  /**
   * Check if connected to the server
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connectionState === this.CONNECTION_STATES.CONNECTED && this.socket?.connected;
  }

  /**
   * Get the current connection state
   * @returns {string} Connection state
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Get the socket ID
   * @returns {string} Socket ID
   */
  getSocketId() {
    return this.socket?.id || 'unknown';
  }

  /**
   * Get the socket instance for direct event handling
   * @returns {Object} Socket instance
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Enable fallback mode for when server is unreachable
   * This allows the app to function with local-only data
   */
  enableFallbackMode() {
    this.fallbackMode = true;
    this.updateConnectionState(this.CONNECTION_STATES.FALLBACK);
    
    // Clear any existing connection attempts
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    clearInterval(this.heartbeatInterval);
    clearTimeout(this.reconnectTimeout);
  }

  /**
   * Disable fallback mode and attempt normal connection
   */
  disableFallbackMode() {
    this.fallbackMode = false;
    this.updateConnectionState(this.CONNECTION_STATES.DISCONNECTED);
    
    // Socket will be re-initialized on next connect() call
  }

  /**
   * Check if currently in fallback mode
   * @returns {boolean} Fallback mode status
   */
  isFallbackMode() {
    return this.fallbackMode;
  }
}

export default BaseSocketClient; 