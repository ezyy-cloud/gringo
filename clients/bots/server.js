/**
 * Bot Server
 * Standalone server that manages and communicates with bots
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import configuration, middleware, routes and utilities
const config = require('./config');
const { errorHandler, notFound, rateLimiter, requestLogger } = require('./middleware');
const { logger } = require('./utils');
const registerRoutes = require('./routes');

// Import BotFactory singleton instance
const botFactory = require('./botFactory/index');

// Import template registration function
const registerTemplates = require('./templates/index');

/**
 * Initialize and start the bot server
 */
async function startServer() {
  try {
    // Create Express app
    const app = express();
    
    // Register bot templates
    logger.info('Registering bot templates');
    const templatesCount = registerTemplates(botFactory);
    logger.info(`Registered ${templatesCount} bot templates`);
    
    // Apply middleware
    app.use(cors({
      origin: config.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'x-api-key', 'authorization'],
      credentials: true
    }));
    app.use(bodyParser.json());
    app.use(rateLimiter);
    app.use(requestLogger);
    
    // Register routes
    app.use(registerRoutes(botFactory));
    
    // Error handling
    app.use(notFound);
    app.use(errorHandler);
    
    // Start server
    const PORT = config.PORT;
    app.listen(PORT, () => {
      logger.info(`Bot server running on port ${PORT}`);
      
      // Initialize active bots from the main server
      botFactory.initializeActiveBots()
        .then(count => {
          logger.info(`Initialized ${count} active bots`);
        })
        .catch(error => {
          logger.error('Failed to initialize active bots', error);
        });
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      logger.info('Shutting down bot server');
      await botFactory.shutdownAllBots();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Shutting down bot server');
      await botFactory.shutdownAllBots();
      process.exit(0);
    });
    
    process.on('uncaughtException', error => {
      logger.error('Uncaught exception', error);
    });
    
    process.on('unhandledRejection', error => {
      logger.error('Unhandled rejection', error);
    });
    
  } catch (error) {
    logger.error('Failed to start bot server', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 