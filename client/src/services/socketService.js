import { io } from 'socket.io-client';

// Server URL - from environment variables
const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Connection state constants
const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting'
};

// Create an outgoing message queue for handling disconnections
let messageQueue = [];
let messageSequence = 0;
let connectionState = CONNECTION_STATES.DISCONNECTED;
let heartbeatInterval = null;
let reconnectTimeout = null;
let currentUsername = null;

// Create a Socket.IO instance with enhanced options
const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'], // Try WebSocket first, then fallback to polling
  reconnection: true,              // Enable reconnection
  reconnectionAttempts: 10,        // Increased reconnection attempts
  reconnectionDelay: 1000,         // Start with 1 second delay
  reconnectionDelayMax: 5000,      // Maximum delay between reconnection attempts
  timeout: 20000,                  // Connection timeout
  autoConnect: false               // Don't connect automatically (we'll do it manually)
});

// Process message queue when connection is restored
const processMessageQueue = () => {
  
  
  if (messageQueue.length === 0 || connectionState !== CONNECTION_STATES.CONNECTED) {
    return;
  }
  
  // Process all queued messages
  const queueCopy = [...messageQueue];
  messageQueue = [];
  
  queueCopy.forEach(item => {
    
    socket.emit(item.eventName, item.data);
  });
};

// Setup heartbeat to detect zombie connections
const setupHeartbeat = () => {
  clearInterval(heartbeatInterval);
  
  heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.emit('heartbeat', { timestamp: Date.now() });
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000); // 30 second heartbeat
};

// Emit with queue support
const emitWithQueue = (eventName, data) => {
  // Add sequence number to track message order
  const messageData = {
    ...data,
    _seq: messageSequence++,
    _timestamp: Date.now()
  };
  
  if (connectionState === CONNECTION_STATES.CONNECTED && socket.connected) {
    // If connected, send directly
    socket.emit(eventName, messageData);
  } else {
    // Otherwise queue for later
    
    messageQueue.push({
      eventName,
      data: messageData
    });
  }
  
  // Return the sequence number so caller can track it if needed
  return messageSequence - 1;
};

// Update connection state
const updateConnectionState = (newState) => {
  const oldState = connectionState;
  connectionState = newState;
  
};

// Check if notifications are supported by the browser
const areNotificationsSupported = () => {
  return 'Notification' in window;
};

// Request notification permission
const requestNotificationPermission = async () => {
  if (!areNotificationsSupported()) {
    
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission === 'denied') {
    
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    // If permission was newly granted, set a flag in sessionStorage
    if (permission === 'granted') {
      sessionStorage.setItem('notificationPermissionJustGranted', 'true');
    }
    return permission === 'granted';
  } catch (error) {
    
    return false;
  }
};

// Show a browser notification
const showNotification = (title, options = {}) => {
  if (!areNotificationsSupported() || Notification.permission !== 'granted') {
    
    return null;
  }
  
  try {
    return new Notification(title, options);
  } catch (error) {
    
    return null;
  }
};

// Process notification data and determine if it should be shown
const processNotification = (data, callbacks) => {
  
  
  // Check if the message is a system message - if so, don't show browser notification
  const isSystemMessage = data.sender === 'System' || data.sender === 'Server';
  
  if (isSystemMessage) {
    
    // Still create in-app notification if needed, but only for non-system messages
    if (!isSystemMessage && callbacks.onFollowedUserMessage) {
      callbacks.onFollowedUserMessage(data);
    }
    return; // Skip the rest of processing for system messages
  }
  
  // Get application state
  const isDocumentVisible = document.visibilityState === 'visible';
  
  // Create a unique ID for this notification to prevent duplicates
  const notificationId = `${data.sender}-${data.messageId || data.timestamp}`;
  
  // Create in-app notification regardless of browser notification permission
  if (callbacks.onFollowedUserMessage) {
    callbacks.onFollowedUserMessage(data);
  }
  
  // Only show browser notification if document is hidden or not focused
  // and notifications are supported and allowed
  if (!isDocumentVisible && 
      areNotificationsSupported() && 
      Notification.permission === 'granted') {
    
    const notificationOptions = {
      body: data.messagePreview,
      icon: '/favicon.ico', // Use app icon or default
      tag: notificationId,  // Use the unique ID to prevent duplicates
      requireInteraction: false,
      timestamp: new Date(data.timestamp).getTime(),
      vibrate: [200, 100, 200]
    };
    
    const notification = showNotification(`New post from ${data.sender}`, notificationOptions);
    
    if (notification) {
      // Handle notification click
      notification.onclick = () => {
        // Focus on window/tab and close notification
        window.focus();
        notification.close();
        
        // Navigate to relevant page or trigger action in the app
        if (callbacks.onNotificationClick) {
          callbacks.onNotificationClick(data);
        }
      };
    }
  }
};

// Event listeners and handlers
const socketService = {
  // Connect to the server
  connect: (callbacks = {}, username = null) => {
    
    
    if (username) {
      currentUsername = username;
    }
    
    // Only proceed if we're not already connected or connecting
    if (connectionState === CONNECTION_STATES.CONNECTED) {
      
      if (callbacks.onConnect) callbacks.onConnect();
      
      // Set username if provided, even if already connected
      if (currentUsername) {
        socket.emit('setUsername', { username: currentUsername });
      }
      return;
    }
    
    if (connectionState === CONNECTION_STATES.CONNECTING || 
        connectionState === CONNECTION_STATES.RECONNECTING) {
      
      return;
    }
    
    // Update state and prepare for connection
    updateConnectionState(CONNECTION_STATES.CONNECTING);
    
    // VERY IMPORTANT: Remove ALL existing listeners to prevent duplicates
    socket.removeAllListeners();
    
    // Request notification permissions when connecting
    requestNotificationPermission()
      .then(granted => {
        
      })
      .catch(error => {
        
      });
    
    // Connection events
    socket.on('connect', () => {
      
      updateConnectionState(CONNECTION_STATES.CONNECTED);
      
      // Set username if available
      if (currentUsername) {
        socket.emit('setUsername', { username: currentUsername });
      }
      
      // Setup heartbeat
      setupHeartbeat();
      
      // Process any queued messages
      processMessageQueue();
      
      if (callbacks.onConnect) callbacks.onConnect();
    });

    socket.on('connect_error', (error) => {
      
      
      if (connectionState !== CONNECTION_STATES.RECONNECTING) {
        updateConnectionState(CONNECTION_STATES.RECONNECTING);
      }
      
      if (callbacks.onConnectError) callbacks.onConnectError(error);
    });

    socket.on('disconnect', (reason) => {
      
      
      // Clear heartbeat interval
      clearInterval(heartbeatInterval);
      
      // Update connection state based on reason
      if (reason === 'io client disconnect' || reason === 'io server disconnect') {
        // Intentional disconnect
        updateConnectionState(CONNECTION_STATES.DISCONNECTED);
      } else {
        // Unintentional disconnect, prepare for reconnection
        updateConnectionState(CONNECTION_STATES.RECONNECTING);
        
        // Setup manual reconnect if needed
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          if (connectionState === CONNECTION_STATES.RECONNECTING) {
            
            socket.connect();
          }
        }, 5000);
      }
      
      if (callbacks.onDisconnect) callbacks.onDisconnect(reason);
    });

    // Heartbeat response 
    socket.on('heartbeatAck', (data) => {
      
      // Could calculate latency here if needed
    });

    // Welcome message
    socket.on('welcome', (data) => {
      
      if (callbacks.onWelcome) callbacks.onWelcome(data);
    });

    // Listen for new messages
    socket.on('newMessage', (data) => {
      console.log('⚡ Socket: Received new message:', data);
      if (callbacks.onNewMessage) callbacks.onNewMessage(data);
    });
    
    // Listen for refresh messages signal
    socket.on('refreshMessages', () => {
      console.log('⚡ Socket: Received refreshMessages signal');
      if (callbacks.onRefreshMessages) callbacks.onRefreshMessages();
    });
    
    // Listen for user status changes
    socket.on('userStatusChange', (data) => {
      
      if (callbacks.onUserStatusChange) callbacks.onUserStatusChange(data);
    });
    
    // Listen for notification about message likes/unlikes
    socket.on('messageLiked', (data) => {
      
      if (callbacks.onMessageLiked) callbacks.onMessageLiked(data);
    });
    
    socket.on('messageUnliked', (data) => {
      
      if (callbacks.onMessageUnliked) callbacks.onMessageUnliked(data);
    });
    
    // Listen for notifications about followed users posting
    socket.on('newFollowedUserMessage', (data) => {
      console.log('⚡ Socket: Received new message from followed user:', data);
      
      // Process notification with appropriate handling
      processNotification(data, callbacks);
    });
    
    // Connect to the server
    
    socket.connect();
  },

  // Disconnect from the server
  disconnect: () => {
    
    
    // Clear timers
    clearInterval(heartbeatInterval);
    clearTimeout(reconnectTimeout);
    
    // Remove all listeners before disconnecting
    socket.removeAllListeners();
    
    if (socket.connected) {
      socket.disconnect();
    }
    
    // Reset state
    updateConnectionState(CONNECTION_STATES.DISCONNECTED);
    currentUsername = null;
    
    // We keep the message queue in case we want to reconnect
  },

  // Send a message via Socket.IO
  sendMessage: (message, username = null, location = null) => {
    const messageId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    return emitWithQueue('sendMessage', { 
      message,
      messageId,  // Add unique message ID for deduplication
      username: username || currentUsername, // Include username if provided
      location: location,  // Include location if provided
      timestamp: Date.now()
    });
  },

  // Resend a failed message
  resendMessage: (messageData) => {
    // Add a new timestamp and sequence number but keep original message ID
    return emitWithQueue('sendMessage', {
      ...messageData,
      timestamp: Date.now(),
      isResend: true
    });
  },

  // Get the connection status
  isConnected: () => {
    return connectionState === CONNECTION_STATES.CONNECTED && socket.connected;
  },
  
  // Get current connection state
  getConnectionState: () => {
    return connectionState;
  },

  // Get the socket ID for identifying the client
  getSocketId: () => {
    return socket.id || 'unknown';
  },
  
  // Request notification permission explicitly
  requestNotificationPermission,
  
  // Check if notifications are supported
  areNotificationsSupported,
  
  // Get connection state constants
  getConnectionStates: () => CONNECTION_STATES,
  
  // Get the socket instance for direct event handling
  getSocket: () => socket
};

// Listen for document visibility changes to manage notifications
document.addEventListener('visibilitychange', () => {
  
  // Could add additional logic here if needed
});

export default socketService; 