/**
 * Moderator Bot Template
 * A bot that listens to messages on the socket and logs them to the console
 */
const { logger } = require('../utils');

module.exports = {
  name: 'Moderator Bot',
  description: 'A bot that listens to messages on the socket and logs them to the console',
  capabilities: ['messaging', 'monitoring'],
  
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
      config: botData.config || {},
      
      /**
       * Process incoming messages
       * @param {Object} message - Message to process
       */
      processMessage: async (message) => {
        // Log the message to the console
        logger.info(`[MODERATOR] Message received:`, {
          sender: message.sender,
          recipient: message.recipient,
          timestamp: message.timestamp,
          messageId: message.messageId,
          content: message.content,
          type: message.type
        });
        
        console.log(`[MODERATOR BOT] Message from ${message.sender}: ${message.content}`);
        
        // For now, the moderator just logs messages and doesn't respond
        // In the future, this could be extended to implement moderation rules
      },
      
      /**
       * Send a message to a recipient
       * @param {string} content - Message content
       * @param {string} recipient - Recipient ID
       * @returns {Object} - Send result
       */
      sendMessage: async (content, recipient) => {
        logger.debug(`Moderator bot sending message to ${recipient}`, { content });
        
        // In a real implementation, this would send to the main server
        return {
          sent: true,
          timestamp: Date.now(),
          messageId: Math.random().toString(36).substring(2, 15)
        };
      },
      
      /**
       * Shutdown the bot
       */
      shutdown: async () => {
        logger.info(`Shutting down Moderator bot: ${bot._id}`);
        bot.status = 'inactive';
        // Perform any cleanup here
        return true;
      }
    };
    
    logger.info(`Moderator bot initialized and ready to monitor messages`);
    return bot;
  }
};
