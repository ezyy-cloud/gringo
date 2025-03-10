/**
 * Weather Bot - Webhook Handler
 * Handles incoming webhooks from weather alert services
 */
const express = require('express');
const router = express.Router();
const alertProcessor = require('./alertProcessor');
const { logger } = require('../../utils');
const mockData = require('./mockData');

// Store the bot instance globally for the router
let botInstance = null;

/**
 * Set the bot instance for use with webhooks
 * @param {Object} bot - The bot instance
 */
function setBotInstance(bot) {
  botInstance = bot;
  console.log(`Bot instance set for webhook handler: ${bot.username}`);
}

/**
 * Main webhook endpoint for receiving weather alerts
 * Endpoint: /api/weather/alerts
 */
router.post('/api/weather/alerts', async (req, res) => {
  try {
    logger.info('Received weather alert webhook');
    
    // Validate the request and extract alert data
    const alertData = req.body;
    
    if (!alertData || !alertData.alert || !alertData.alert.id) {
      logger.error('Invalid alert data received in webhook');
      return res.status(400).json({ error: 'Invalid alert data' });
    }
    
    // Log key alert data
    logger.info(`Alert received: ID=${alertData.alert.id}, Type=${alertData.msg_type}, Severity=${alertData.severity}`);
    
    // Log bot instance
    logger.info(`Bot instance available: ${botInstance ? 'Yes - ' + botInstance.username : 'No'}`);
    
    // Process the alert asynchronously to avoid blocking the response
    alertProcessor.processAlert(alertData, botInstance)
      .then(result => {
        logger.info(`Alert processed successfully: ${alertData.alert.id}`);
      })
      .catch(error => {
        logger.error(`Error processing alert ${alertData.alert.id}: ${error.message}`);
      });
    
    // Respond immediately to acknowledge receipt
    return res.status(200).json({ success: true, alertId: alertData.alert.id });
  } catch (error) {
    logger.error(`Error in webhook handler: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Development endpoint to test with mock alerts
 * Endpoint: /api/weather/mock-alert
 */
router.post('/api/weather/mock-alert', async (req, res) => {
  try {
    // Only available in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Endpoint not available in production' });
    }
    
    logger.info('Mock alert requested');
    
    // Check if bot instance is available
    if (!botInstance) {
      logger.warn('No bot instance available for mock alert. Waiting for bot initialization...');
      
      // Wait for a short time to see if the bot gets initialized
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check again
      if (!botInstance) {
        logger.error('Bot instance still not available after waiting. Mock alert may not be processed correctly.');
      } else {
        logger.info(`Bot instance now available: ${botInstance.username}`);
      }
    } else {
      logger.info(`Bot instance available for mock alert: ${botInstance.username}`);
      
      // Ensure the bot is authenticated
      if (!botInstance.authToken && typeof botInstance.authenticate === 'function') {
        logger.info('Authenticating bot for mock alert...');
        await botInstance.authenticate();
      }
    }
    
    // Generate mock alert data (or use provided data)
    const mockAlert = req.body?.alert ? req.body : mockData.generateMockAlert(req.body);
    
    // Log the bot instance and alert details
    logger.info(`Processing mock alert: ${mockAlert.alert.id}`);
    logger.info(`Using bot: ${botInstance ? botInstance.username : 'No bot instance available'}`);
    
    // Process the mock alert with bot instance
    const result = await alertProcessor.processAlert(mockAlert, botInstance);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Mock alert processed', 
      alertId: mockAlert.alert.id,
      result 
    });
  } catch (error) {
    logger.error(`Error generating/processing mock alert: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Export the router and the setBotInstance function
module.exports = {
  router,
  setBotInstance
}; 