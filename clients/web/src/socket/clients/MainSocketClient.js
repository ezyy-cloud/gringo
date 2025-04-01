import BaseSocketClient from '../BaseSocketClient';

/**
 * Main Socket Client Class
 * Handles specific event handling for the main socket server
 */
class MainSocketClient extends BaseSocketClient {
  constructor(serverUrl, options = {}) {
    super(serverUrl, options);
    
    // Notification-related properties
    this.notificationSupported = 'Notification' in window;
  }

  /**
   * Override setupEventListeners to add specific event handling
   */
  setupEventListeners(callbacks) {
    
    // Call parent method to setup basic event listeners
    super.setupEventListeners(callbacks);
    
    if (!this.socket) {
      return;
    }
    
    // Heartbeat response 
    this.socket.on('heartbeatAck', () => {
    });

    // Welcome message
    this.socket.on('welcome', (data) => {
      if (callbacks.onWelcome) callbacks.onWelcome(data);
    });

    // Listen for new messages - handle both 'message' and 'newMessage' events
    this.socket.on('newMessage', (data) => {
      if (callbacks.onNewMessage) callbacks.onNewMessage(data);
      
      // Check if the message is from a user being followed
      // and process notification if needed
      if (data.isFromFollowedUser) {
        this.processNotification(data, callbacks);
      }
    });
    
    // Also handle 'message' event the same way as 'newMessage' for consistency
    this.socket.on('message', (data) => {
      if (callbacks.onNewMessage) callbacks.onNewMessage(data);
      
      // Check if the message is from a user being followed
      // and process notification if needed
      if (data.isFromFollowedUser) {
        this.processNotification(data, callbacks);
      }
    });
    
    // Handle message acknowledgment
    this.socket.on('messageAck', (data) => {
      if (callbacks.onMessageAck) callbacks.onMessageAck(data);
    });
    
    // Listen for refresh messages signal
    this.socket.on('refreshMessages', () => {
      if (callbacks.onRefreshMessages) callbacks.onRefreshMessages();
    });
    
    // Listen for user status changes
    this.socket.on('userStatusChange', (data) => {
      if (callbacks.onUserStatusChange) callbacks.onUserStatusChange(data);
    });
    
    // Listen for message liked events
    this.socket.on('messageLiked', (data) => {
      if (callbacks.onMessageLiked) callbacks.onMessageLiked(data);
    });
    
    // Listen for message unliked events
    this.socket.on('messageUnliked', (data) => {
      if (callbacks.onMessageUnliked) callbacks.onMessageUnliked(data);
    });
    
    // Listen for message deleted events
    this.socket.on('messageDeleted', (data) => {
      if (callbacks.onMessageDeleted) callbacks.onMessageDeleted(data);
    });
    
    // Followed user message events (for notifications)
    this.socket.on('newFollowedUserMessage', (data) => {
      if (callbacks.onFollowedUserMessage) callbacks.onFollowedUserMessage(data);
      
      // Process notification for this message
      this.processNotification(data, callbacks);
    });
  }

  /**
   * Send a message to the server
   * @param {string} message - Message content
   * @param {string} username - Username
   * @param {Object} location - Location data
   * @returns {number} Message sequence number
   */
  sendMessage(message, username = null, location = null) {
    if (!this.socket) {
      return -1;
    }
    
    // If no username is provided and we don't have a currentUsername, log error
    if (!username && !this.currentUsername) {
      return -1;
    }
    
    // Use the current username if available, or the provided username
    const senderUsername = username || this.currentUsername;
    
    // Create a unique message ID
    const messageId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Prepare message payload
    const messagePayload = { 
      message,  // The actual message text
      messageId,  // Unique message ID for deduplication
      username: senderUsername, // Username must be included for server to save the message
      sender: senderUsername, // Include sender field for backward compatibility
      location: location || null,  // Location data (if available)
      timestamp: Date.now()
    };
    
    // Use 'sendMessage' event to match the bots client implementation
    return this.emitWithQueue('sendMessage', messagePayload);
  }

  /**
   * Resend a failed message
   * @param {Object} messageData - Message data
   * @returns {number} Message sequence number
   */
  resendMessage(messageData) {
    if (!this.socket) {
      return -1;
    }
    
    // Ensure we include a username
    const senderUsername = messageData.username || this.currentUsername;

    
    // Use 'sendMessage' event to match the bots client implementation
    return this.emitWithQueue('sendMessage', {
      ...messageData,
      username: senderUsername,
      timestamp: Date.now(),
      isResend: true
    });
  }

  /**
   * Check if notifications are supported by the browser
   * @returns {boolean} Notification support status
   */
  areNotificationsSupported() {
    return this.notificationSupported;
  }

  /**
   * Request notification permission
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestNotificationPermission() {
    
    // Check if notifications are supported
    if (!this.notificationSupported) {
      return false;
    }
    
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      
      // Check if permission was granted
      const granted = permission === 'granted';
      
      // Set flag in sessionStorage to show welcome notification
      if (granted) {
        sessionStorage.setItem('notificationPermissionJustGranted', 'true');
      }
      
      return granted;
    } catch  {
      return false;
    }
  }

  /**
   * Show a notification
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   * @returns {Notification|null} Notification object or null if not supported
   */
  showNotification(title, options = {}) {
    // Check if notifications are supported and permission is granted
    if (!this.notificationSupported || Notification.permission !== 'granted') {
      return null;
    }
    
    try {
      // Create and return the notification
      return new Notification(title, options);
    } catch {
      return null;
    }
  }

  /**
   * Process notification data and determine if it should be shown
   * @param {Object} data - Notification data
   * @param {Object} callbacks - Event callbacks
   */
  processNotification(data, callbacks) {
    // Check if the message is a system message - if so, don't show browser notification
    const isSystemMessage = data.sender === 'System' || data.sender === 'Server';
    
    if (isSystemMessage) {
      // We don't want notifications for system messages
      return;
    }
    
    // Get application state
    const isDocumentVisible = document.visibilityState === 'visible';
    
    // Create a unique ID for this notification to prevent duplicates
    const notificationId = `${data.sender}-${data.messageId || data.timestamp}`;
    
    // Create in-app notification
    if (callbacks.onFollowedUserMessage) {
      callbacks.onFollowedUserMessage(data);
    }
    
    // Only show browser notification if document is hidden or not focused
    // and notifications are supported and allowed
    if (!isDocumentVisible && 
        this.areNotificationsSupported() && 
        Notification.permission === 'granted') {
      
      const notificationOptions = {
        body: data.messagePreview || data.message || 'New message',
        icon: '/favicon.ico', // Use app icon or default
        tag: notificationId,  // Use the unique ID to prevent duplicates
        requireInteraction: false,
        timestamp: new Date(data.timestamp).getTime(),
        vibrate: [200, 100, 200]
      };
      
      const notification = this.showNotification(`New post from ${data.sender}`, notificationOptions);
      
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
  }
}

export default MainSocketClient; 