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
      RECONNECTING: 'reconnecting'
    };
  }

  /**
   * Initialize the socket connection
   */
  initialize() {
    if (this.socket) {
      return;
    }
    
    this.socket = io(this.serverUrl, this.socketOptions);
  }

  /**
   * Connect to the socket server
   * @param {Object} callbacks - Event callbacks
   * @param {string} username - Current username
   */
  connect(callbacks = {}, username = null) {
    // Initialize socket if needed
    if (!this.socket) {
      this.initialize();
    }
    
    if (username) {
      this.currentUsername = username;
    }
    
    // Only proceed if we're not already connected or connecting
    if (this.connectionState === this.CONNECTION_STATES.CONNECTED) {
      if (callbacks.onConnect) callbacks.onConnect();
      
      // Set username if provided, even if already connected
      if (this.currentUsername) {
        this.socket.emit('setUsername', { username: this.currentUsername });
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
    
    // Connect to the server
    this.socket.connect();
  }

  /**
   * Setup socket event listeners
   * @param {Object} callbacks - Event callbacks
   */
  setupEventListeners(callbacks) {
    // Connection events
    this.socket.on('connect', () => {
      this.updateConnectionState(this.CONNECTION_STATES.CONNECTED);
      
      // Set username if available
      if (this.currentUsername) {
        this.socket.emit('setUsername', { username: this.currentUsername });
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
}

export default BaseSocketClient; 