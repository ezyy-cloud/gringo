/**
 * Routes Index
 * Exports all route modules to be used in the main server file
 */
const express = require('express');
const { logger } = require('../utils');

/**
 * Initialize and register all routes
 * @param {Object} botFactory - Instance of the BotFactory class
 * @returns {Object} router - Express router with all routes registered
 */
function registerRoutes(botFactory) {
  const router = express.Router();
  
  // Import route modules and pass botFactory to each
  const healthRoutes = require('./health');
  const botRoutes = require('./bots')(botFactory);
  const messageRoutes = require('./messages')(botFactory);
  
  // Register routes with appropriate prefixes
  router.use('/', healthRoutes);
  router.use('/api/bots', botRoutes);
  router.use('/api/messages', messageRoutes);
  
  // Register webhook routes for weather bot
  // This ensures the webhooks work regardless of whether 
  // bot instances are active or not
  try {
    // Get weather bot template
    const weatherTemplate = botFactory.getBotTemplate('weather', false);
    if (weatherTemplate && typeof weatherTemplate.getWebhookHandler === 'function') {
      // Get the webhook handler router 
      const weatherWebhookHandler = weatherTemplate.getWebhookHandler();
      
      if (weatherWebhookHandler) {
        router.use('/', weatherWebhookHandler);
        logger.debug('Registered webhook handler for Weather Bot');
      } else {
        logger.warn('Weather Bot webhook handler is null or undefined');
      }
    }
  } catch (error) {
    logger.error('Error registering webhook handler for Weather Bot:', error);
  }
  
  return router;
}

module.exports = registerRoutes; 