/**
 * Weather Bot - Main Bot Implementation
 * A bot that receives weather alerts via webhooks only
 */
const { logger } = require('../../utils');
const authService = require('../../utils/authService');
const alertProcessor = require('./alertProcessor');
const mockData = require('./mockData');
const alertWebhookHandler = require('./alertWebhookHandler');

module.exports = {
  name: 'Weather Bot',
  description: 'A bot that processes severe weather alerts received via webhooks',
  capabilities: ['publishing'],
  
  /**
   * Initialize the Weather bot
   * @param {Object} botData - Configuration data for the bot
   * @returns {Object} - Initialized bot instance
   */
  initialize: async (botData) => {
    logger.info(`Initializing Weather Bot: ${botData._id}`);
    
    // Default configuration for the weather bot
    const defaultConfig = {
      // API authentication
      apiKey: process.env.OPENWEATHERMAP_API_KEY || 'your_key_here',
      
      // Alert settings
      minSeverity: 'Moderate', // Minimum severity level to report
      maxAlertsPerRun: 3,      // maximum alerts per webhook call
      
      // Bot behavior
      debugMode: process.env.NODE_ENV !== 'production'
    };
    
    // Merge with provided configuration
    const config = { ...defaultConfig, ...botData.config };
    
    // Initialize bot
    const bot = {
      _id: botData._id,
      name: 'Weather Bot',
      username: botData.username || 'WeatherBot',
      apiKey: botData.apiKey || process.env.BOT_API_KEY,
      authToken: botData.authToken,
      config,
      status: 'initialized',
      
      // Authenticate the bot
      authenticate: async () => {
        logger.info(`Authenticating Weather Bot: ${bot.username} (${bot._id})`);
        
        // Try to authenticate with the server using BOT_API_KEY
        try {
          // Use the API key from the bot or from the environment
          const apiKey = bot.apiKey || process.env.BOT_API_KEY;
          
          if (!apiKey) {
            logger.error('No API key available for authentication');
            return false;
          }
          
          logger.info(`Authenticating with API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 4)}`);
          
          // Always use the real authentication service
          try {
            // Force FORCE_REAL_CALLS to true to ensure we use the real auth service
            process.env.FORCE_REAL_CALLS = 'true';
            
            const auth = await authService.authenticateBot(bot._id, apiKey);
            
            if (auth && auth.success && auth.token) {
              bot.authToken = auth.token;
              logger.info(`Authentication successful with server token: ${auth.token.substring(0, 10)}...`);
              return true;
            } else {
              const errorMsg = auth?.error || 'Unknown authentication error';
              logger.error(`Authentication failed: ${errorMsg}`);
              return false;
            }
          } catch (serviceError) {
            logger.error(`Auth service error: ${serviceError?.message || 'Unknown error'}`);
            return false;
          }
        } catch (error) {
          const errorMsg = error?.message || 'Unknown error';
          logger.error(`Authentication error: ${errorMsg}`);
          return false;
        }
      },
      
      // Main run function (used for testing webhook functionality only)
      run: async (isStartup = false) => {
        try {
          logger.info('Weather Bot run starting (webhook test)');
          
          if (bot.config.debugMode) {
            // Generate a single mock alert for testing webhook processing
            logger.info('Generating mock alert for webhook testing');
            
            const mockAlert = mockData.generateMockAlert();
            logger.info(`Generated mock alert: ${mockAlert.alert.id}`);
            
            // Process the alert as if it came through webhook
            const result = await alertProcessor.processAlert(mockAlert, bot);
            
            return {
              success: result.success,
              message: 'Webhook test alert processed',
              alertId: mockAlert.alert.id
            };
          }
          
          return {
            success: true,
            message: 'Bot is running in webhook-only mode. No polling is performed.'
          };
        } catch (error) {
          logger.error(`Error in Weather Bot run: ${error.message}`);
          return { success: false, error: error.message };
        }
      },
      
      // Shutdown the bot
      shutdown: async () => {
        logger.info(`Shutting down Weather Bot: ${bot._id}`);
        bot.status = 'inactive';
        return true;
      }
    };
    
    logger.info('Weather Bot initialized in webhook-only mode');
    
    // Set the bot instance in the webhook handler
    alertWebhookHandler.setBotInstance(bot);
    logger.info(`Provided bot instance [${bot.username}] to webhook handler`);
    
    return bot;
  },
  
  // Get the webhook handler for Express
  getWebhookHandler: () => {
    return alertWebhookHandler.router;
  }
}; 