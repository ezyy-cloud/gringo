/**
 * Moderator Bot Template
 * A bot that moderates content and conversations
 */
const { logger } = require('../../utils');
const moderationService = require('./moderationService');
const messageHandler = require('./messageHandler');

module.exports = {
  name: 'Moderator Bot',
  description: 'A bot that helps moderate content and conversations',
  capabilities: ['messaging', 'moderation'],
  
  /**
   * Initialize the Moderator bot
   * @param {Object} botData - Configuration data for the bot
   * @returns {Object} - Initialized bot instance
   */
  initialize: async (botData) => {
    logger.info(`Initializing Moderator bot: ${botData._id}`);
    
    // Create the bot instance
    const bot = {
      _id: botData._id,
      type: 'moderator',
      username: botData.username || 'ModeratorBot',
      status: 'active',
      config: botData.config || {
        // Default moderation settings
        profanityFilter: true,
        spamDetection: true,
        contentWarnings: true,
        autoModeration: false
      },
      
      // Process incoming messages
      processMessage: async (message) => {
        return messageHandler.processMessage(message, bot);
      },
      
      // Send a message to a recipient
      sendMessage: async (content, recipient) => {
        logger.debug(`Moderator bot sending message to ${recipient}`, { content });
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
      
      // Shutdown the bot
      shutdown: async () => {
        logger.info(`Shutting down Moderator bot: ${bot._id}`);
        bot.status = 'inactive';
        return true;
      }
    };
    
    return bot;
  }
}; 