/**
 * Weather Bot Template
 * A bot that provides weather information
 */
const { logger } = require('../../utils');
const weatherService = require('./weatherService');
const messageHandler = require('./messageHandler');

module.exports = {
  name: 'Weather Bot',
  description: 'A bot that provides weather information',
  capabilities: ['messaging'],
  
  /**
   * Initialize the Weather bot
   * @param {Object} botData - Configuration data for the bot
   * @returns {Object} - Initialized bot instance
   */
  initialize: async (botData) => {
    logger.info(`Initializing Weather bot: ${botData._id}`);
    
    // Create the bot instance
    const bot = {
      _id: botData._id,
      type: 'weather',
      username: botData.username || 'WeatherBot',
      status: 'active',
      config: botData.config || {},
      
      // Process incoming messages using the dedicated handler
      processMessage: async (message) => {
        return messageHandler.processMessage(message, bot);
      },
      
      // Send a message to a recipient
      sendMessage: async (content, recipient) => {
        logger.debug(`Weather bot sending message to ${recipient}`, { content });
        
        // In a real implementation, this would send to the main server
        // For now, just log and return success
        return {
          sent: true,
          timestamp: Date.now(),
          messageId: Math.random().toString(36).substring(2, 15)
        };
      },
      
      // Shutdown the bot
      shutdown: async () => {
        logger.info(`Shutting down Weather bot: ${bot._id}`);
        bot.status = 'inactive';
        // Perform any cleanup here
        return true;
      }
    };
    
    return bot;
  }
}; 