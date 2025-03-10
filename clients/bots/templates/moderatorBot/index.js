/**
 * Moderator Bot - Moderates content and conversations
 * 
 * Latest Improvements (2025-03-10):
 * 
 * 1. Authentication Robustness
 *    - Now correctly uses BOT_API_KEY from .env for authentication
 *    - Better token handling with proper caching and refresh
 *    - Improved error handling for auth failures
 *    - Development mode fallbacks for testing without real servers
 * 
 * 2. Content Moderation
 *    - Enhanced profanity filtering with contextual awareness
 *    - Improved spam detection algorithms
 *    - Added content warning detection for sensitive topics
 *    - Automatic moderation of violating content
 * 
 * 3. Error Handling
 *    - Fixed "Invalid bot instance" errors with better validation
 *    - Added dev mode fallbacks for missing bot IDs
 *    - Improved logging of error conditions
 *    - More graceful handling of authentication failures
 * 
 * 4. Socket Connection
 *    - Robust socket connection with automatic reconnection
 *    - Better error handling for socket disconnects
 *    - Improved message handling and routing
 * 
 * Features:
 * - Moderates content and conversations in real-time
 * - Detects and filters profanity, spam, and inappropriate content
 * - Issues warnings for content that violates community guidelines
 * - Can automatically delete violating content
 * - Provides feedback to users about moderation actions
 */
const { logger } = require('../../utils');
const { authService } = require('../../utils');
const moderationService = require('./moderationService');
const messageHandler = require('./messageHandler');
const io = require('socket.io-client');

// Add rate limiting tracking variables at module scope
let currentBackoff = 0;
const baseBackoff = 5000; // 5 seconds base backoff
const maxBackoff = 30 * 60 * 1000; // 30 minutes maximum backoff

// Function to calculate exponential backoff with jitter
function calculateBackoff(attempt = 1) {
  // Exponential backoff: base * 2^attempt
  const exponential = baseBackoff * Math.pow(2, attempt); 
  // Add jitter to prevent thundering herd problem (±25%)
  const jitter = exponential * (0.75 + Math.random() * 0.5);
  // Cap at maximum backoff time
  return Math.min(jitter, maxBackoff);
}

module.exports = {
  name: 'Moderator Bot',
  description: 'A bot that helps moderate content and conversations using NLP for vulgar content detection',
  capabilities: ['messaging', 'moderation', 'content-analysis'],
  
  /**
   * Initialize the Moderator bot
   * @param {Object} botData - Configuration data for the bot
   * @returns {Object} - Initialized bot instance
   */
  initialize: async (botData) => {
    logger.info(`Initializing Moderator bot: ${botData._id}`);
    
    // Default configuration for the moderator bot
    const defaultConfig = {
      // Moderation settings
      profanityFilter: true,
      spamDetection: true,
      contentWarnings: true,
      autoModeration: true,  // Set to true to automatically delete violating content
      
      // Socket connection settings
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      
      // Bot behavior
      debugMode: false
    };
    
    // Merge the provided configuration with the defaults
    const config = { ...defaultConfig, ...botData.config };
    
    // Socket connection
    let socket = null;
    
    // Create the bot instance
    const bot = {
      _id: botData._id,
      id: botData._id, // For backward compatibility
      username: botData.username || 'ModeratorBot',
      type: 'moderator',
      config,
      status: botData.status || 'active',
      startTime: Date.now(),
      
      // Use the API key provided in botData or from environment
      apiKey: botData.apiKey || process.env.BOT_API_KEY,
      
      // Authentication method
      authenticate: async () => {
        logger.info(`Authenticating moderator bot: ${bot.username} (${bot._id})`);
        
        // If we already have a token and it's not production, just use it
        if (bot.authToken && process.env.NODE_ENV !== 'production') {
          logger.info('Using existing auth token');
          return true;
        }
        
        // Try to authenticate with the server using BOT_API_KEY from .env
        try {
          // Use the API key from the bot or from the environment
          const apiKey = bot.apiKey || process.env.BOT_API_KEY;
          
          if (!apiKey) {
            logger.error('No API key available for authentication');
            return false;
          }
          
          logger.info(`Authenticating with API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 4)}`);
          
          // In development or testing, create a simple mock token
          if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.MOCK_AUTH === 'true') {
            logger.info('Development mode: Creating mock token');
            const mockToken = `mock_token_${Date.now()}`;
            bot.authToken = mockToken;
            return true;
          }
          
          // Try using the auth service in production
          try {
            const auth = await authService.authenticateBot(bot._id, apiKey);
            
            if (auth && auth.success && auth.token) {
              bot.authToken = auth.token;
              logger.info(`Authentication successful with server token`);
              return true;
            } else {
              const errorMsg = auth?.error || 'Unknown authentication error';
              logger.error(`Authentication failed: ${errorMsg}`);
              
              // Only create fallback token if explicitly allowed
              if (process.env.NODE_ENV !== 'production' || process.env.MOCK_AUTH === 'true') {
                logger.info('Creating fallback token in non-production mode');
                bot.authToken = `fallback_token_${Date.now()}`;
                return true;
              }
              
              return false;
            }
          } catch (serviceError) {
            logger.error(`Auth service error: ${serviceError?.message || 'Unknown error'}`);
            
            // Only create emergency token if explicitly allowed
            if (process.env.NODE_ENV !== 'production' || process.env.MOCK_AUTH === 'true') {
              logger.info('Creating emergency token after service error in non-production mode');
              bot.authToken = `emergency_token_${Date.now()}`;
              return true;
            }
            
            return false;
          }
        } catch (error) {
          const errorMsg = error?.message || 'Unknown error';
          logger.error(`Authentication error: ${errorMsg}`);
          
          // Only create emergency token if explicitly allowed
          if (process.env.NODE_ENV !== 'production' || process.env.MOCK_AUTH === 'true') {
            logger.info('Creating emergency token after error in non-production mode');
            bot.authToken = `emergency_token_${Date.now()}`;
            return true;
          }
          
          return false;
        }
      },
      
      // Connect to the socket server
      connect: async () => {
        try {
          // Authenticate first to get a token
          const authenticated = await bot.authenticate();
          
          if (!authenticated) {
            logger.error('Failed to authenticate bot, cannot connect to socket server');
            return false;
          }
          
          const socketUrl = process.env.SOCKET_URL || process.env.MAIN_SERVER_URL || 'http://localhost:3000';
          logger.info(`Connecting to socket server at ${socketUrl}`);
          
          // Create socket connection
          socket = io(socketUrl, {
            reconnection: bot.config.reconnection,
            reconnectionAttempts: bot.config.reconnectionAttempts,
            reconnectionDelay: bot.config.reconnectionDelay,
            reconnectionDelayMax: bot.config.reconnectionDelayMax,
            timeout: bot.config.timeout,
            query: {
              botId: bot._id,
              botUsername: bot.username,
              token: bot.authToken // Add token to the query parameters
            }
          });
          
          // Set up socket event handlers
          socket.on('connect', () => {
            logger.info(`Moderator bot connected to socket server with ID: ${socket.id}`);
            
            // Authenticate the bot
            socket.emit('authenticate', {
              username: bot.username,
              userId: bot._id,
              botId: bot._id, // Ensure botId is included
              token: bot.authToken
            });
          });
          
          socket.on('authenticated', (data) => {
            if (data.success) {
              logger.info(`Moderator bot authenticated as ${data.username}`);
              
              // Join moderation room if available
              socket.emit('joinRoom', 'moderation');
            } else {
              logger.error(`Authentication failed: ${data.error}`);
            }
          });
          
          // Listen for messages to moderate
          socket.on('message', async (message) => {
            logger.debug(`Received message for moderation: ${JSON.stringify(message)}`);
            
            // Process the message
            const result = await bot.processMessage(message);
            
            if (result.handled && result.moderated) {
              logger.info(`Moderated message from ${message.sender || message.username}`);
            }
          });
          
          socket.on('disconnect', () => {
            logger.warn('Moderator bot disconnected from socket server');
          });
          
          socket.on('error', (error) => {
            logger.error(`Socket error: ${error}`);
          });
          
          return true;
        } catch (error) {
          logger.error(`Error connecting to socket server: ${error.message}`);
          return false;
        }
      },
      
      // Process incoming messages
      processMessage: async (message) => {
        try {
          // Skip processing if current backoff is high (severe rate limiting)
          if (currentBackoff > 5 * 60 * 1000) { // Skip if backoff is > 5 minutes
            logger.warn(`Skipping message processing due to high backoff (${currentBackoff/1000}s)`);
            return { handled: false, skipped: true, backoffMs: currentBackoff };
          }
          
          logger.info(`Processing message from ${message.sender || message.username}`);
          const result = await messageHandler.processMessage(message, bot);
          
          // Reset backoff after successful processing
          if (result.handled) {
            bot.resetBackoff();
          }
          
          return result;
        } catch (error) {
          logger.error(`Error in processMessage: ${error.message}`);
          // Increase backoff for errors
          bot.increaseBackoff();
          return { handled: false, error: error.message };
        }
      },
      
      // Send a message to a recipient
      sendMessage: async (content, recipient) => {
        logger.debug(`Moderator bot sending message to ${recipient}`, { content });
        
        // Send via socket if connected
        if (socket && socket.connected) {
          socket.emit('sendMessage', {
            message: content,
            sender: bot.username,
            recipient: recipient,
            isBot: true
          });
        }
        
        return {
          sent: true,
          timestamp: Date.now(),
          messageId: Math.random().toString(36).substring(2, 15)
        };
      },
      
      // Moderate content
      moderateContent: async (content, userId) => {
        return moderationService.moderateContent(content, userId, bot.config);
      },
      
      // Reset the backoff when successful
      resetBackoff: function() {
        if (currentBackoff > 0) {
          logger.info(`Resetting backoff after successful operations`);
          currentBackoff = 0;
        }
      },

      // Increase backoff after failures
      increaseBackoff: function() {
        const nextBackoff = currentBackoff === 0 ? 
          baseBackoff : // First failure, use base backoff
          calculateBackoff(Math.floor(Math.log2(currentBackoff / baseBackoff)) + 1); // Subsequent failures
        
        logger.warn(`Increasing backoff from ${currentBackoff/1000}s to ${nextBackoff/1000}s due to rate limiting`);
        currentBackoff = nextBackoff;
        return currentBackoff;
      },

      // Get current delay (includes backoff if present)
      getCurrentDelay: function() {
        const baseDelay = 3000; // Default 3 second delay between operations
        return currentBackoff > 0 ? currentBackoff : baseDelay;
      },
      
      // Shutdown the bot
      shutdown: async () => {
        logger.info(`Shutting down Moderator bot: ${bot._id}`);
        
        // Disconnect from socket server
        if (socket && socket.connected) {
          socket.disconnect();
        }
        
        bot.status = 'inactive';
        return true;
      }
    };
    
    // Connect to socket server
    await bot.connect();
    
    return bot;
  }
}; 