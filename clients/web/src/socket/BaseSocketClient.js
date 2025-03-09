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
      console.log('🔌 BaseSocketClient: Socket already initialized, disconnecting first');
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Determine if we're using a relative URL (for proxy) or full URL (direct connection)
    const isRelativeUrl = this.serverUrl === '/' || this.serverUrl === '';
    const connectionUrl = isRelativeUrl ? window.location.origin : this.serverUrl;
    
    console.log(`🔌 BaseSocketClient: Initializing socket connection to: "${connectionUrl}"`);
    console.log(`🔌 BaseSocketClient: Using ${isRelativeUrl ? 'relative' : 'absolute'} URL mode`);
    
    // Configure options based on connection type
    const socketOptions = {
      ...this.socketOptions,
      path: '/socket.io',
      autoConnect: false,
    };
    
    // For relative URLs (proxy), let the browser handle the connection
    if (isRelativeUrl) {
      // When using the proxy through Vite, we need these options
      socketOptions.transports = ['websocket', 'polling'];
    } else {
      // For direct connection, use these additional options
      socketOptions.transports = ['websocket', 'polling'];
    }
    
    try {
      // Create the socket instance
      this.socket = io(connectionUrl, socketOptions);
      console.log('🔌 BaseSocketClient: Socket instance created successfully');
      
      return true;
    } catch (error) {
      console.error('🔌 BaseSocketClient: Error initializing socket:', error);
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
    console.log('🔌 BaseSocketClient: Connect called with username:', username);
    
    // Initialize socket if needed
    if (!this.socket) {
      console.log('🔌 BaseSocketClient: Socket not initialized, initializing now');
      this.initialize();
    }
    
    if (username) {
      console.log('🔌 BaseSocketClient: Setting current username:', username);
      this.currentUsername = username;
    }
    
    // Only proceed if we're not already connected or connecting
    if (this.connectionState === this.CONNECTION_STATES.CONNECTED) {
      console.log('🔌 BaseSocketClient: Already connected, calling onConnect callback');
      if (callbacks.onConnect) callbacks.onConnect();
      
      // Set username if provided, even if already connected
      if (this.currentUsername) {
        console.log('🔌 BaseSocketClient: Authenticating with server');
        this.authenticate(this.currentUsername);
      }
      return;
    }
    
    if (this.connectionState === this.CONNECTION_STATES.CONNECTING || 
        this.connectionState === this.CONNECTION_STATES.RECONNECTING) {
      console.log('🔌 BaseSocketClient: Already connecting or reconnecting, skipping connect');
      return;
    }
    
    // Update state and prepare for connection
    console.log('🔌 BaseSocketClient: Updating connection state to CONNECTING');
    this.updateConnectionState(this.CONNECTION_STATES.CONNECTING);
    
    // Remove ALL existing listeners to prevent duplicates
    console.log('🔌 BaseSocketClient: Removing all existing listeners');
    this.socket.removeAllListeners();
    
    console.log('🔌 BaseSocketClient: Setting up event listeners');
    this.setupEventListeners(callbacks);
    
    // Connect to the server
    console.log('🔌 BaseSocketClient: Connecting to server:', this.serverUrl);
    this.socket.connect();
  }

  /**
   * Authenticate with the server
   * @param {string} username - Username to authenticate with
   * @param {string} token - JWT token (if available)
   */
  authenticate(username, token = null) {
    if (!this.socket) {
      console.error('🔌 BaseSocketClient: Socket not initialized in authenticate');
      return;
    }

    // Get token from localStorage if not provided
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    console.log('🔌 BaseSocketClient: Authenticating with username:', username);
    
    // Save the username for later use
    this.currentUsername = username;
    console.log('🔌 BaseSocketClient: Current username set to:', this.currentUsername);
    
    // Create the auth payload
    const authPayload = {
      username,
      token
    };
    
    console.log('🔌 BaseSocketClient: Sending authentication payload:', JSON.stringify(authPayload, null, 2));
    
    // Send authentication event to server
    this.socket.emit('authenticate', authPayload);
  }

  /**
   * Setup socket event listeners
   * @param {Object} callbacks - Event callbacks
   */
  setupEventListeners(callbacks) {
    console.log('🔌 BaseSocketClient: Setting up event listeners with callbacks:', Object.keys(callbacks));
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 BaseSocketClient: Socket connected event fired');
      this.updateConnectionState(this.CONNECTION_STATES.CONNECTED);
      
      // Authenticate if we have a username
      if (this.currentUsername) {
        console.log('🔌 BaseSocketClient: Authenticating after connect with username:', this.currentUsername);
        this.authenticate(this.currentUsername);
      }
      
      // Setup heartbeat
      console.log('🔌 BaseSocketClient: Setting up heartbeat');
      this.setupHeartbeat();
      
      // Process any queued messages
      console.log('🔌 BaseSocketClient: Processing message queue, count:', this.messageQueue.length);
      this.processMessageQueue();
      
      console.log('🔌 BaseSocketClient: Calling onConnect callback');
      if (callbacks.onConnect) callbacks.onConnect();
    });

    this.socket.on('connect_error', (error) => {
      console.log('🔌 BaseSocketClient: Socket connect_error event fired', error);
      if (this.connectionState !== this.CONNECTION_STATES.RECONNECTING) {
        this.updateConnectionState(this.CONNECTION_STATES.RECONNECTING);
      }
      
      console.log('🔌 BaseSocketClient: Calling onConnectError callback');
      if (callbacks.onConnectError) callbacks.onConnectError(error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 BaseSocketClient: Socket disconnect event fired, reason:', reason);
      
      // Clear heartbeat interval
      clearInterval(this.heartbeatInterval);
      
      // Update connection state based on reason
      if (reason === 'io client disconnect' || reason === 'io server disconnect') {
        // Intentional disconnect
        console.log('🔌 BaseSocketClient: Intentional disconnect detected');
        this.updateConnectionState(this.CONNECTION_STATES.DISCONNECTED);
      } else {
        // Unintentional disconnect, prepare for reconnection
        console.log('🔌 BaseSocketClient: Unintentional disconnect detected, preparing for reconnect');
        this.updateConnectionState(this.CONNECTION_STATES.RECONNECTING);
        
        // Setup manual reconnect if needed
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          if (this.connectionState === this.CONNECTION_STATES.RECONNECTING) {
            console.log('🔌 BaseSocketClient: Manual reconnect attempt');
            this.socket.connect();
          }
        }, 5000);
      }
      
      console.log('🔌 BaseSocketClient: Calling onDisconnect callback');
      if (callbacks.onDisconnect) callbacks.onDisconnect(reason);
    });

    // Authentication response
    this.socket.on('authenticated', (data) => {
      console.log('🔌 BaseSocketClient: Authentication response received:', data);
      
      if (data.success) {
        console.log('🔌 BaseSocketClient: Authentication successful');
        
        // Store username returned from server
        if (data.username) {
          this.currentUsername = data.username;
          console.log('🔌 BaseSocketClient: Username set from server:', this.currentUsername);
        }
        
        // Call onAuthenticated callback if provided
        if (callbacks.onAuthenticated) {
          callbacks.onAuthenticated(data);
        }
      } else {
        console.error('🔌 BaseSocketClient: Authentication failed:', data.error);
        
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
    
    // Add detailed logging right before emission
    console.log(`🔌 BaseSocketClient: About to emit '${eventName}' event with data:`, JSON.stringify(messageData, null, 2));
    console.log(`🔌 BaseSocketClient: Username in payload:`, messageData.username);
    console.log(`🔌 BaseSocketClient: Sender in payload:`, messageData.sender);
    
    if (this.connectionState === this.CONNECTION_STATES.CONNECTED && this.socket?.connected) {
      // If connected, send directly
      console.log(`🔌 BaseSocketClient: Directly emitting '${eventName}' event to server`);
      this.socket.emit(eventName, messageData);
    } else {
      // Otherwise queue for later
      console.log(`🔌 BaseSocketClient: Not connected, queuing '${eventName}' event for later`);
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
    
    console.log(`🔌 BaseSocketClient: Processing message queue with ${this.messageQueue.length} items`);
    
    // Process all queued messages
    const queueCopy = [...this.messageQueue];
    this.messageQueue = [];
    
    queueCopy.forEach(item => {
      console.log(`🔌 BaseSocketClient: Processing queued message with event "${item.eventName}":`);
      console.log(`🔌 BaseSocketClient: Queued message payload:`, JSON.stringify(item.data, null, 2));
      console.log(`🔌 BaseSocketClient: Username in queued payload:`, item.data.username);
      console.log(`🔌 BaseSocketClient: Sender in queued payload:`, item.data.sender);
      
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
    console.log('🔌 BaseSocketClient: Enabling fallback mode');
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
    console.log('🔌 BaseSocketClient: Disabling fallback mode');
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