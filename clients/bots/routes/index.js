/**
 * Routes Index
 * Exports all route modules to be used in the main server file
 */
const express = require('express');

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
  
  return router;
}

module.exports = registerRoutes; 