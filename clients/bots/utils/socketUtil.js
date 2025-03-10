/**
 * Socket.IO utilities for bots
 * 
 * This file provides functionality for bots to connect to the main server's
 * socket.io endpoint and communicate like regular users.
 */

const { io } = require('socket.io-client');
const axios = require('axios');
const logger = require('./logger');

// Get configuration
const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'http://localhost:3000';
const BOT_API_KEY = process.env.BOT_API_KEY || 'dev-bot-api-key';

/**
 * Add socket capabilities to a bot instance
 * 
 * @param {Object} botInstance - The bot instance to add socket capability to
 * @returns {Object} - The enhanced bot instance
 */
const addSocketCapability = (botInstance) => {
  // Get authentication token for the bot
  const getAuthToken = async () => {
    try {
      logger.info(`Getting auth token for bot ${botInstance.username} (${botInstance.id})`);
      
      // If the bot already has an authToken property, use it
      if (botInstance.authToken) {
        logger.info(`Bot ${botInstance.username} already has an auth token, using it`);
        return botInstance.authToken;
      }
      
      // Skip authentication attempt if the bot doesn't have an API key
      if (!botInstance.apiKey && !BOT_API_KEY) {
        logger.warn(`Bot ${botInstance.username} has no API key, cannot authenticate`);
        return null;
      }
      
      // Use the bot's API key or the environment variable
      const apiKey = botInstance.apiKey || BOT_API_KEY;
      
      const response = await axios.post(
        `${MAIN_SERVER_URL}/api/bots/authenticate`,
        {
          botId: botInstance.id,
          apiKey: apiKey
        }
      );
      
      if (response.data.success && response.data.token) {
        logger.info(`Bot ${botInstance.username} received auth token`);
        // Store the token on the bot instance for future use
        botInstance.authToken = response.data.token;
        return response.data.token;
      } else {
        logger.error(`Failed to get auth token for bot ${botInstance.username}:`, response.data);
        return null;
      }
    } catch (error) {
      // If authentication fails because the bot is not active, log a specific message
      if (error.response && error.response.status === 403) {
        logger.warn(`Bot ${botInstance.username} is not active yet, socket connection will be attempted when activated`);
      } else {
        logger.error(`Error getting auth token for bot ${botInstance.username}:`, error.message);
      }
      return null;
    }
  };

  // Create socket connection
  const connectToSocketServer = async () => {
    // Only try to connect if bot is in active status
    if (botInstance.status !== 'active') {
      logger.warn(`Bot ${botInstance.username} is not active (status: ${botInstance.status}), skipping socket connection`);
      return null;
    }
    
    const token = await getAuthToken();
    if (!token) {
      logger.error(`Cannot connect bot ${botInstance.username} to socket: No auth token available`);
      return null;
    }

    logger.info(`Creating socket connection for bot ${botInstance.username} to ${MAIN_SERVER_URL}`);
    logger.info(`Bot connection details: ID=${botInstance.id}, Username=${botInstance.username}, TokenLength=${token.length}`);
    
    // Create socket instance with debugging
    const socket = io(MAIN_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: false,
      forceNew: true, // Force a new connection
      query: {
        botId: botInstance.id,
        botUsername: botInstance.username,
        token: token // Add token to the query parameters
      },
      // Enable debug logs for development
      ...(process.env.NODE_ENV === 'development' ? { debug: true } : {})
    });

    // Set up event logging for debugging
    socket.onAny((event, ...args) => {
      logger.info(`[SOCKET EVENT] Bot ${botInstance.username} - Event: ${event}`);
    });

    // Set up basic event handlers
    socket.on('connect', () => {
      logger.info(`Bot ${botInstance.username} connected to socket server with ID ${socket.id}`);
      
      // Authenticate the socket connection
      logger.info(`Authenticating bot ${botInstance.username} with socket...`);
      socket.emit('authenticate', {
        token,
        username: botInstance.username,
        userId: botInstance.id,
        botId: botInstance.id // Ensure botId is included
      });
    });

    socket.on('authenticated', (data) => {
      logger.info(`Bot ${botInstance.username} authentication response:`, JSON.stringify(data));
      botInstance.socketAuthenticated = data.success;
      
      if (data.success) {
        logger.info(`Bot ${botInstance.username} successfully authenticated with socket server!`);
      } else {
        logger.error(`Bot ${botInstance.username} failed to authenticate with socket server:`, data.error);
      }
    });

    socket.on('connect_error', (error) => {
      logger.error(`Bot ${botInstance.username} socket connection error:`, error.message);
      logger.error(`Connection details: URL=${MAIN_SERVER_URL}, Transport=${socket.io.engine.transport.name}`);
    });

    socket.on('error', (error) => {
      logger.error(`Bot ${botInstance.username} socket error:`, error);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Bot ${botInstance.username} disconnected from socket:`, reason);
      botInstance.socketAuthenticated = false;
    });

    // Set up heartbeat to keep connection alive
    let heartbeatInterval = null;
    socket.on('connect', () => {
      clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('heartbeat', { timestamp: Date.now(), botId: botInstance.id });
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // 30 second heartbeat
    });

    socket.on('disconnect', () => {
      clearInterval(heartbeatInterval);
    });

    // Connect to the server
    logger.info(`Attempting to connect bot ${botInstance.username} to socket server...`);
    socket.connect();
    
    return socket;
  };

  // Add socket capability to the bot instance
  botInstance.socket = null;
  botInstance.socketAuthenticated = false;
  
  // Connect to socket server
  botInstance.connectToSocketServer = async () => {
    // If the bot isn't active, just log a message and return
    if (botInstance.status !== 'active') {
      logger.info(`Bot ${botInstance.username} is not active (status: ${botInstance.status}), cannot connect to socket`);
      return null;
    }
    
    if (botInstance.socket && botInstance.socket.connected) {
      logger.info(`Bot ${botInstance.username} already connected to socket server`);
      return botInstance.socket;
    }
    
    logger.info(`Connecting bot ${botInstance.username} to socket server...`);
    botInstance.socket = await connectToSocketServer();
    
    // Set up message handlers if socket was created successfully
    if (botInstance.socket) {
      // Listen for all message-related events
      const messageEvents = [
        'message',            // General message event
        'newMessage',         // New message broadcast
        'directMessage',      // Direct message to this bot
        `message:${botInstance.id}`, // Messages targeted at this bot
        'chatMessage'         // Chat message in a room
      ];
      
      logger.info(`Setting up message listeners for bot ${botInstance.username}...`);
      
      // Set up handlers for all message events
      messageEvents.forEach(eventName => {
        botInstance.socket.on(eventName, (data) => {
          logger.info(`Bot ${botInstance.username} received ${eventName}`);
          
          // Use the processSocketMessage handler if available
          if (typeof botInstance.processSocketMessage === 'function') {
            // Add event type to data for context
            const eventData = { ...data, eventType: eventName };
            botInstance.processSocketMessage(eventData);
          }
        });
      });
      
      // Also listen for other important events
      botInstance.socket.on('notification', (data) => {
        logger.info(`Bot ${botInstance.username} received notification:`, data);
      });
      
      botInstance.socket.on('userOnline', (data) => {
        logger.info(`Bot ${botInstance.username} received userOnline event:`, data);
      });
      
      botInstance.socket.on('userOffline', (data) => {
        logger.info(`Bot ${botInstance.username} received userOffline event:`, data);
      });
      
      botInstance.socket.on('userTyping', (data) => {
        logger.info(`Bot ${botInstance.username} received userTyping event:`, data);
      });
    }
    
    return botInstance.socket;
  };
  
  // Disconnect from socket server
  botInstance.disconnectFromSocketServer = () => {
    if (botInstance.socket) {
      botInstance.socket.disconnect();
      botInstance.socket = null;
      botInstance.socketAuthenticated = false;
      logger.info(`Bot ${botInstance.username} disconnected from socket server`);
      return true;
    }
    return false;
  };
  
  // Send message via socket
  botInstance.sendSocketMessage = (message, recipient = null) => {
    if (!botInstance.socket || !botInstance.socket.connected) {
      logger.error(`Bot ${botInstance.username} not connected to socket server`);
      return false;
    }
    
    if (!botInstance.socketAuthenticated) {
      logger.error(`Bot ${botInstance.username} not authenticated on socket server`);
      return false;
    }
    
    // Generate a unique message ID
    const messageId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    botInstance.socket.emit('sendMessage', { 
      message,
      messageId,
      username: botInstance.username,
      recipient,
      timestamp: Date.now()
    });
    
    logger.info(`Bot ${botInstance.username} sent socket message:`, message);
    return true;
  };
  
  // Default socket message processor if not provided by bot
  if (!botInstance.processSocketMessage) {
    botInstance.processSocketMessage = (data) => {
      logger.info(`Bot ${botInstance.username} received message`);
      // Default implementation doesn't respond
    };
  }
  
  return botInstance;
};

module.exports = {
  addSocketCapability
}; 