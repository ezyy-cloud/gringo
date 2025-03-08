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
    
    // Heartbeat response 
    this.socket.on('heartbeatAck', (data) => {
      // Could calculate latency here if needed
    });

    // Welcome message
    this.socket.on('welcome', (data) => {
      if (callbacks.onWelcome) callbacks.onWelcome(data);
    });

    // Listen for new messages
    this.socket.on('newMessage', (data) => {
      console.log('⚡ Socket: Received new message:', data);
      if (callbacks.onNewMessage) callbacks.onNewMessage(data);
      
      // Check if the message is from a user being followed
      // and process notification if needed
      if (data.isFromFollowedUser) {
        this.processNotification(data, callbacks);
      }
    });
    
    // Listen for refresh messages signal
    this.socket.on('refreshMessages', () => {
      console.log('⚡ Socket: Received refreshMessages signal');
      if (callbacks.onRefreshMessages) callbacks.onRefreshMessages();
    });
    
    // Listen for user status changes
    this.socket.on('userStatusChange', (data) => {
      if (callbacks.onUserStatusChange) callbacks.onUserStatusChange(data);
    });
    
    // Listen for notification about message likes/unlikes
    this.socket.on('messageLiked', (data) => {
      if (callbacks.onMessageLiked) callbacks.onMessageLiked(data);
    });
    
    this.socket.on('messageUnliked', (data) => {
      if (callbacks.onMessageUnliked) callbacks.onMessageUnliked(data);
    });
    
    // Listen for notifications about followed users posting
    this.socket.on('newFollowedUserMessage', (data) => {
      console.log('⚡ Socket: Received new message from followed user:', data);
      
      // Process notification with appropriate handling
      this.processNotification(data, callbacks);
    });
    
    // Message deleted events
    this.socket.on('messageDeleted', (data) => {
      if (callbacks.onMessageDeleted) callbacks.onMessageDeleted(data);
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
    const messageId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    return this.emitWithQueue('sendMessage', { 
      message,
      messageId,  // Add unique message ID for deduplication
      username: username || this.currentUsername, // Include username if provided
      location: location,  // Include location if provided
      timestamp: Date.now()
    });
  }

  /**
   * Resend a failed message
   * @param {Object} messageData - Message data
   * @returns {number} Message sequence number
   */
  resendMessage(messageData) {
    // Add a new timestamp and sequence number but keep original message ID
    return this.emitWithQueue('sendMessage', {
      ...messageData,
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
   * @returns {Promise<boolean>} Permission granted status
   */
  async requestNotificationPermission() {
    if (!this.notificationSupported) {
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
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Show a browser notification
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   * @returns {Notification|null} Notification object or null
   */
  showNotification(title, options = {}) {
    if (!this.notificationSupported || Notification.permission !== 'granted') {
      return null;
    }
    
    try {
      return new Notification(title, options);
    } catch (error) {
      console.error('Error showing notification:', error);
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
        this.areNotificationsSupported() && 
        Notification.permission === 'granted') {
      
      const notificationOptions = {
        body: data.messagePreview,
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