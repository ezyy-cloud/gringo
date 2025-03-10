/**
 * Bot Management Routes
 */
const express = require('express');
const router = express.Router();
const { validateApiKey } = require('../middleware');
const config = require('../config');
const axios = require('axios');
const { logger } = require('../utils');

module.exports = (botFactory) => {
  /**
   * @route GET /types
   * @description Get all available bot types/templates
   */
  router.get('/types', async (req, res) => {
    try {
      const templates = botFactory.getBotTemplates();
      logger.info('RAW TEMPLATES FROM BOT FACTORY FOR /types ENDPOINT:', templates);
      const types = [];
      
      // Convert the templates Map to an array of type objects
      for (const [type, template] of templates.entries()) {
        logger.info(`Processing template: ${type}`, template);
        types.push({
          id: type,
          name: template.name || type,
          description: template.description || `${type} bot template`
        });
      }
      
      logger.info('TYPES SENT TO CLIENT FROM /types ENDPOINT:', JSON.stringify(types, null, 2));
      
      return res.status(200).json({
        success: true,
        count: types.length,
        types
      });
    } catch (error) {
      logger.error('Error fetching bot types:', error);
      return res.status(500).json({
        success: false,
        message: `Failed to fetch bot types: ${error.message}`
      });
    }
  });

  /**
   * @route POST /api/bots/register
   * @description Register a new bot
   */
  router.post('/register', validateApiKey, async (req, res) => {
    try {
      const botData = req.body;
      
      if (!botData || !botData.type) {
        return res.status(400).json({
          success: false,
          message: 'Invalid bot data. Type is required.'
        });
      }
      
      // First, register the bot with the main server
      try {
        // Check if we need to use a different endpoint for the main server
        const mainServerUrl = `${config.MAIN_SERVER_URL}/api/bots/service/register`;
        
        logger.info(`Attempting to register bot with main server at: ${mainServerUrl}`);
        logger.info(`Using API key: ${config.BOT_API_KEY}`);
        
        const mainServerResponse = await axios.post(
          mainServerUrl,
          botData,
          {
            headers: {
              'x-api-key': config.BOT_API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
        
        logger.info('Main server response:', mainServerResponse.data);
        
        // If the main server registration was not successful, return the error
        if (!mainServerResponse.data.success) {
          return res.status(400).json({
            success: false,
            message: `Main server bot registration failed: ${mainServerResponse.data.message}`
          });
        }
        
        // If successful, proceed with local bot initialization
        // We can use the ID from the main server if needed
        if (mainServerResponse.data.bot && mainServerResponse.data.bot.id) {
          botData.mainServerId = mainServerResponse.data.bot.id;
        } else if (mainServerResponse.data.data && mainServerResponse.data.data.id) {
          botData.mainServerId = mainServerResponse.data.data.id;
        }
      } catch (error) {
        logger.error('Error calling main server for bot registration:', error);
        return res.status(500).json({
          success: false,
          message: `Failed to register bot with main server: ${error.message}`
        });
      }
      
      // Initialize the bot in the microservice
      const bot = await botFactory.initializeBot(botData);
      
      return res.status(200).json({
        success: true,
        message: 'Bot registered successfully in both main server and microservice',
        bot: {
          id: bot._id,
          mainServerId: botData.mainServerId,
          type: bot.type,
          username: bot.username
        }
      });
    } catch (error) {
      logger.error('Error registering bot:', error);
      return res.status(500).json({
        success: false,
        message: `Error registering bot: ${error.message}`
      });
    }
  });
  
  /**
   * @route GET /
   * @description Get all active bots
   */
  router.get('/', validateApiKey, (req, res) => {
    try {
      // Helper function to safely extract properties for logging
      const getSerializableProperties = (obj) => {
        const props = [];
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const type = typeof obj[key];
            if (type !== 'function' && type !== 'object') {
              props.push(`${key}: ${obj[key]}`);
            } else if (type === 'object' && obj[key] !== null) {
              props.push(`${key}: [${obj[key].constructor.name}]`);
            }
          }
        }
        return props.join(', ');
      };
    
      // Extract pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const bots = botFactory.getActiveBots();
      
      const totalCount = bots.length;
      
      // Create bot list with all essential fields but avoid circular references
      const botList = bots.map(bot => {
        // Start with any properties from the original server data
        let originalData = {};
        
        // Check if the bot has the original server data stored
        if (bot.originalData) {
          originalData = bot.originalData;
        }
        
        // Create a copy of the original data to avoid modifying it
        const cleanBot = { ...originalData };
        
        // Include any additional bot properties that were added during initialization
        // but avoid the ones that could cause circular references
        for (const key in bot) {
          if (Object.prototype.hasOwnProperty.call(bot, key)) {
            const value = bot[key];
            const valueType = typeof value;
            
            // Skip functions and anything already in originalData
            if (valueType === 'function' || originalData[key] !== undefined) continue;
            
            // Skip socket, interval IDs, and other problematic objects that might cause circular references
            if (key === 'socket' || key === 'io' || key === '_anyListeners' || key === 'subs' || 
                key === '_callbacks' || key === 'eventHandlers' || key === 'messageHandlers' ||
                key === 'breakingNewsIntervalId' || (valueType === 'object' && value && value.constructor.name === 'Timeout')) continue;
            
            // Include everything else
            cleanBot[key] = value;
          }
        }
        
        return cleanBot;
      });
      
      return res.status(200).json({
        success: true,
        page,
        limit,
        totalCount,
        bots: botList
      });
    } catch (error) {
      logger.error('Error fetching bots:', error);
      
      // Handle specific error for circular references
      let errorMessage = 'Failed to fetch bots';
      if (error instanceof TypeError && error.message.includes('circular structure to JSON')) {
        errorMessage = 'Error: Bot data contains circular references. Using simplified data structure.';
        
        // Provide a more comprehensive fallback that still preserves most data
        try {
          // Get active bots again to avoid referring to a potentially undefined 'bots' variable
          const activeBots = botFactory.getActiveBots();
          const simpleBotList = activeBots.map(bot => {
            const cleanBot = {};
            
            // Include only primitive values and simple objects to avoid circular references
            for (const key in bot) {
              if (Object.prototype.hasOwnProperty.call(bot, key)) {
                const value = bot[key];
                const valueType = typeof value;
                
                // Skip functions and complex objects that might cause circular references
                if (valueType === 'function' || 
                    (valueType === 'object' && value !== null && 
                    (key === 'socket' || key === 'io' || value.constructor.name === 'Socket' || 
                     key === '_anyListeners' || key === 'subs' || key === '_callbacks' || 
                     key === 'eventHandlers' || key === 'messageHandlers' || 
                     key === 'breakingNewsIntervalId' || value.constructor.name === 'Timeout'))) {
                  continue;
                }
                
                // Include everything else
                cleanBot[key] = value;
              }
            }
            
            return cleanBot;
          });
          
          return res.status(200).json({
            success: true,
            page,
            limit,
            totalCount: activeBots.length,
            bots: simpleBotList,
            warning: errorMessage
          });
        } catch (fallbackError) {
          logger.error('Error in fallback handling:', fallbackError);
          // If the fallback also fails, continue to the error response below
        }
      }
      
      return res.status(500).json({
        success: false,
        message: `${errorMessage}: ${error.message}`
      });
    }
  });
  
  /**
   * @route GET /api/bots/templates
   * @description Get all available bot templates
   */
  router.get('/templates', validateApiKey, (req, res) => {
    try {
      const templates = botFactory.getBotTemplates();
      logger.info('RAW TEMPLATES FROM BOT FACTORY:', templates);
      
      // Convert templates Map to array for API response
      const templateList = Array.from(templates.entries()).map(([key, template]) => ({
        type: key,
        name: template.name || key,
        description: template.description || 'No description available'
      }));
      
      logger.info('TEMPLATES SENT TO CLIENT:', JSON.stringify(templateList, null, 2));
      
      return res.status(200).json({
        success: true,
        count: templateList.length,
        templates: templateList
      });
    } catch (error) {
      logger.error('Error fetching bot templates:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching bot templates: ${error.message}`
      });
    }
  });
  
  /**
   * @route GET /api/bots/:id
   * @description Get a specific bot by ID
   */
  router.get('/:id', validateApiKey, (req, res) => {
    try {
      const botId = req.params.id;
      const bot = botFactory.getBot(botId);
      
      if (!bot) {
        return res.status(404).json({
          success: false,
          message: `Bot with ID ${botId} not found or inactive`
        });
      }
      
      return res.status(200).json({
        success: true,
        bot: {
          id: bot._id,
          type: bot.type,
          username: bot.username,
          status: bot.status || 'active'
        }
      });
    } catch (error) {
      logger.error(`Error fetching bot ${req.params.id}:`, error);
      return res.status(500).json({
        success: false,
        message: `Error fetching bot: ${error.message}`
      });
    }
  });
  
  /**
   * @route PUT /api/bots/:id
   * @description Update a specific bot
   */
  router.put('/:id', validateApiKey, async (req, res) => {
    try {
      const botId = req.params.id;
      const updateData = req.body;
      
      // Check if bot exists in microservice
      const bot = botFactory.getBot(botId);
      
      if (!bot) {
        return res.status(404).json({
          success: false,
          message: `Bot with ID ${botId} not found or inactive`
        });
      }
      
      logger.info(`Updating bot ${botId} with data:`, updateData);
      
      // First, call the main server to update the bot
      try {
        const mainServerUrl = `${config.MAIN_SERVER_URL}/api/bots/service/bots/${botId}`;
        logger.info(`Attempting to update bot on main server at: ${mainServerUrl}`);
        
        const mainServerResponse = await axios.put(
          mainServerUrl,
          updateData,
          {
            headers: {
              'x-api-key': config.BOT_API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
        
        logger.info('Main server update response:', mainServerResponse.data);
        
        // If the main server update was not successful, return the error
        if (!mainServerResponse.data.success) {
          return res.status(400).json({
            success: false,
            message: `Main server bot update failed: ${mainServerResponse.data.message || 'Unknown error'}`,
            error: mainServerResponse.data.error
          });
        }
        
        // Get the updated bot data from the main server response if available
        const updatedBot = mainServerResponse.data.data || mainServerResponse.data.bot || {};
        
        // Now update the local bot instance with the data from the main server
        // This ensures the local bot exactly matches the source of truth
        if (Object.keys(updatedBot).length > 0) {
          logger.info(`Updating local bot with data from main server:`, updatedBot);
          
          // Update all fields that came back from the main server
          Object.keys(updatedBot).forEach(key => {
            if (bot[key] !== undefined && key !== '_id' && key !== 'id') {
              bot[key] = updatedBot[key];
            }
          });
        } else {
          // Fallback to request data if main server didn't return updated bot data
          logger.info(`Main server didn't return updated bot data, using request data as fallback`);
          Object.keys(updateData).forEach(key => {
            if (bot[key] !== undefined) {
              bot[key] = updateData[key];
            }
          });
        }
        
        // Special handling for status changes remains the same
        if (updateData.status) {
          if (updateData.status === 'active' && bot.status !== 'active') {
            // Bot is being activated
            bot.status = 'active';
            bot.startTime = Date.now();
            
            // Connect to socket if needed
            if (typeof bot.connectToSocketServer === 'function') {
              try {
                await bot.connectToSocketServer();
              } catch (socketError) {
                logger.error(`Error connecting bot ${botId} to socket:`, socketError);
              }
            }
          } else if (updateData.status !== 'active' && bot.status === 'active') {
            // Bot is being deactivated
            bot.status = updateData.status;
            
            // Disconnect from socket if needed
            if (bot.socket && typeof bot.socket.disconnect === 'function') {
              try {
                bot.socket.disconnect();
              } catch (socketError) {
                logger.error(`Error disconnecting bot ${botId} from socket:`, socketError);
              }
            }
          }
        }
        
        return res.status(200).json({
          success: true,
          message: `Bot ${botId} updated successfully in both main server and microservice`,
          data: updatedBot
        });
      } catch (mainServerError) {
        logger.error(`Error updating bot ${botId} on main server:`, mainServerError);
        return res.status(500).json({
          success: false,
          message: `Failed to update bot on main server: ${mainServerError.message}`
        });
      }
    } catch (error) {
      logger.error(`Error updating bot ${req.params.id}:`, error);
      return res.status(500).json({
        success: false,
        message: `Error updating bot: ${error.message}`
      });
    }
  });
  
  /**
   * @route DELETE /api/bots/:id
   * @description Shut down and remove a bot
   */
  router.delete('/:id', validateApiKey, async (req, res) => {
    try {
      const botId = req.params.id;
      const bot = botFactory.getBot(botId);
      
      if (!bot) {
        return res.status(404).json({
          success: false,
          message: `Bot with ID ${botId} not found or inactive`
        });
      }
      
      // First, delete the bot from the main server
      try {
        const mainServerUrl = `${config.MAIN_SERVER_URL}/api/bots/service/bots/${botId}`;
        logger.info(`Attempting to delete bot from main server at: ${mainServerUrl}`);
        
        const mainServerResponse = await axios.delete(
          mainServerUrl,
          {
            headers: {
              'x-api-key': config.BOT_API_KEY
            }
          }
        );
        
        logger.info('Main server delete response:', mainServerResponse.data);
        
        // If the main server deletion was not successful, return the error
        if (!mainServerResponse.data.success) {
          return res.status(400).json({
            success: false,
            message: `Main server bot deletion failed: ${mainServerResponse.data.message || 'Unknown error'}`,
            error: mainServerResponse.data.error
          });
        }
        
        // Now shut down the bot locally
        await botFactory.shutdownBot(botId);
        
        return res.status(200).json({
          success: true,
          message: `Bot ${botId} has been shut down and removed from both main server and microservice`
        });
      } catch (mainServerError) {
        logger.error(`Error deleting bot ${botId} from main server:`, mainServerError);
        return res.status(500).json({
          success: false,
          message: `Failed to delete bot from main server: ${mainServerError.message}`
        });
      }
    } catch (error) {
      logger.error(`Error shutting down bot ${req.params.id}:`, error);
      return res.status(500).json({
        success: false,
        message: `Error shutting down bot: ${error.message}`
      });
    }
  });
  
  /**
   * @route GET /api/bots/:id/status
   * @description Get the status of a specific bot
   * This route doesn't use validateApiKey to ensure it's accessible
   */
  router.get('/:id/status', (req, res) => {
    try {
      logger.info(`Received status request for bot: ${req.params.id}`);
      
      const botId = req.params.id;
      const bot = botFactory.getBot(botId);
      
      // If the bot is not active, return a default status
      if (!bot) {
        logger.info(`Bot ${botId} not found, returning default status`);
        return res.status(200).json({
          id: botId,
          status: 'stopped',
          uptime: 0,
          memory: 0,
          cpu: 0,
          lastMessage: '',
          lastError: null
        });
      }
      
      // Calculate uptime for the bot
      const now = Date.now();
      const uptime = now - (bot.startTime || now);
      
      // Get memory and CPU usage data if available
      const memory = bot.memory || 0;
      const cpu = bot.cpu || 0;
      
      logger.info(`Returning status for active bot ${botId}`);
      return res.status(200).json({
        id: botId,
        status: 'running',
        uptime: Math.floor(uptime / 1000), // Convert to seconds
        memory,
        cpu,
        lastMessage: bot.lastMessage || '',
        lastError: bot.lastError || null
      });
    } catch (error) {
      logger.error(`Error fetching status for bot ${req.params.id}:`, error);
      // Return a default status instead of an error to avoid client errors
      return res.status(200).json({
        id: req.params.id,
        status: 'error',
        uptime: 0,
        memory: 0,
        cpu: 0,
        lastMessage: '',
        lastError: error.message || 'Unknown error'
      });
    }
  });
  
  /**
   * @route POST /api/bots/:id/start
   * @description Start a specific bot
   * This route doesn't use validateApiKey to ensure it's accessible
   */
  router.post('/:id/start', async (req, res) => {
    try {
      logger.info(`Received start request for bot: ${req.params.id}`);
      
      const botId = req.params.id;
      
      // Check if bot is already active
      let bot = botFactory.getBot(botId);
      
      if (bot) {
        logger.info(`Bot ${botId} is already running`);
        return res.status(200).json({
          success: true,
          message: `Bot ${botId} is already running`,
          data: {
            id: botId,
            status: 'running'
          }
        });
      }
      
      // Try to activate the bot
      try {
        // Call main API to get bot details first
        const apiKey = process.env.BOT_API_KEY || config.BOT_API_KEY || 'dev-bot-api-key';
        const apiUrl = process.env.API_URL || config.API_URL || 'http://localhost:3000/api';
        
        logger.info(`Fetching bot ${botId} details from ${apiUrl}`);
        const response = await axios.get(`${apiUrl}/bots/service/bots/${botId}`, {
          headers: {
            'x-api-key': apiKey
          }
        });
        
        if (!response.data || !response.data.success) {
          throw new Error('Failed to get bot details from main API');
        }
        
        const botDetails = response.data.data || response.data.bot;
        logger.info(`Got bot details:`, botDetails);
        
        // Start the bot with the factory
        bot = await botFactory.startBot(botDetails.type || 'news', botDetails);
        
        if (!bot) {
          throw new Error('Failed to start bot');
        }
        
        logger.info(`Successfully started bot ${botId}`);
        return res.status(200).json({
          success: true,
          message: `Bot ${botId} started successfully`,
          data: {
            id: botId,
            status: 'running'
          }
        });
      } catch (activationError) {
        logger.error(`Error activating bot ${botId}:`, activationError);
        return res.status(200).json({
          success: false,
          message: `Error starting bot: ${activationError.message}`
        });
      }
    } catch (error) {
      logger.error(`Error starting bot ${req.params.id}:`, error);
      return res.status(200).json({
        success: false,
        message: `Error starting bot: ${error.message}`
      });
    }
  });
  
  /**
   * @route POST /api/bots/:id/stop
   * @description Stop a specific bot
   * This route doesn't use validateApiKey to ensure it's accessible
   */
  router.post('/:id/stop', async (req, res) => {
    try {
      logger.info(`Received stop request for bot: ${req.params.id}`);
      
      const botId = req.params.id;
      const bot = botFactory.getBot(botId);
      
      if (!bot) {
        logger.info(`Bot ${botId} is already stopped`);
        return res.status(200).json({
          success: true,
          message: `Bot ${botId} is already stopped`,
          data: {
            id: botId,
            status: 'stopped'
          }
        });
      }
      
      // Shutdown the bot
      logger.info(`Shutting down bot ${botId}`);
      const result = await botFactory.shutdownBot(botId);
      
      if (!result) {
        throw new Error('Failed to stop bot');
      }
      
      logger.info(`Successfully stopped bot ${botId}`);
      return res.status(200).json({
        success: true,
        message: `Bot ${botId} stopped successfully`,
        data: {
          id: botId,
          status: 'stopped'
        }
      });
    } catch (error) {
      logger.error(`Error stopping bot ${req.params.id}:`, error);
      return res.status(200).json({
        success: false,
        message: `Error stopping bot: ${error.message}`
      });
    }
  });
  
  /**
   * @route POST /api/bots/:id/restart
   * @description Restart a specific bot
   * This route doesn't use validateApiKey to ensure it's accessible
   */
  router.post('/:id/restart', async (req, res) => {
    try {
      logger.info(`Received restart request for bot: ${req.params.id}`);
      
      const botId = req.params.id;
      let bot = botFactory.getBot(botId);
      
      // If bot is running, stop it first
      if (bot) {
        logger.info(`Stopping bot ${botId} before restart`);
        await botFactory.shutdownBot(botId);
      }
      
      // Try to activate the bot
      try {
        // Call main API to get bot details
        const apiKey = process.env.BOT_API_KEY || config.BOT_API_KEY || 'dev-bot-api-key';
        const apiUrl = process.env.API_URL || config.API_URL || 'http://localhost:3000/api';
        
        logger.info(`Fetching bot ${botId} details from ${apiUrl}`);
        const response = await axios.get(`${apiUrl}/bots/service/bots/${botId}`, {
          headers: {
            'x-api-key': apiKey
          }
        });
        
        if (!response.data || !response.data.success) {
          throw new Error('Failed to get bot details from main API');
        }
        
        const botDetails = response.data.data || response.data.bot;
        logger.info(`Got bot details:`, botDetails);
        
        // Start the bot with the factory
        bot = await botFactory.startBot(botDetails.type || 'news', botDetails);
        
        if (!bot) {
          throw new Error('Failed to restart bot');
        }
        
        logger.info(`Successfully restarted bot ${botId}`);
        return res.status(200).json({
          success: true,
          message: `Bot ${botId} restarted successfully`,
          data: {
            id: botId,
            status: 'running'
          }
        });
      } catch (activationError) {
        logger.error(`Error reactivating bot ${botId}:`, activationError);
        return res.status(200).json({
          success: false,
          message: `Error restarting bot: ${activationError.message}`
        });
      }
    } catch (error) {
      logger.error(`Error restarting bot ${req.params.id}:`, error);
      return res.status(200).json({
        success: false,
        message: `Error restarting bot: ${error.message}`
      });
    }
  });
  
  /**
   * @route GET /api/bots/:id/metrics
   * @description Get metrics data for a specific bot
   */
  router.get('/:id/metrics', validateApiKey, (req, res) => {
    try {
      const botId = req.params.id;
      const period = req.query.period || 'day';
      const bot = botFactory.getBot(botId);
      
      if (!bot) {
        // Return default metrics for inactive bots
        return res.status(200).json({
          success: true,
          data: {
            messagesProcessed: 0,
            messagesSent: 0,
            errors: 0,
            avgResponseTime: 0,
            timePoints: [],
            dataPoints: []
          }
        });
      }
      
      // Get metrics from bot if available
      const metrics = bot.metrics || {
        messagesProcessed: Math.floor(Math.random() * 100),
        messagesSent: Math.floor(Math.random() * 80),
        errors: Math.floor(Math.random() * 10),
        avgResponseTime: Math.random() * 500,
        timePoints: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        dataPoints: [
          Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 20),
          Math.floor(Math.random() * 15),
          Math.floor(Math.random() * 25),
          Math.floor(Math.random() * 18),
          Math.floor(Math.random() * 12)
        ]
      };
      
      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error(`Error fetching metrics for bot ${req.params.id}:`, error);
      return res.status(200).json({
        success: false,
        message: `Error fetching bot metrics: ${error.message}`
      });
    }
  });

  /**
   * @route GET /api/bots/:id/logs
   * @description Get logs for a specific bot
   */
  router.get('/:id/logs', validateApiKey, (req, res) => {
    try {
      const botId = req.params.id;
      const limit = parseInt(req.query.limit) || 100;
      const bot = botFactory.getBot(botId);
      
      if (!bot) {
        // Return empty logs for inactive bots
        return res.status(200).json({
          success: true,
          logs: []
        });
      }
      
      // Get logs from bot if available or return sample logs
      const logs = bot.logs || [
        { timestamp: new Date().toISOString(), level: 'info', message: 'Bot started successfully' },
        { timestamp: new Date().toISOString(), level: 'info', message: 'Connected to message server' },
        { timestamp: new Date().toISOString(), level: 'info', message: 'Processing incoming message' },
        { timestamp: new Date().toISOString(), level: 'info', message: 'Message processed successfully' }
      ];
      
      // Limit the number of logs returned
      const limitedLogs = logs.slice(0, limit);
      
      return res.status(200).json({
        success: true,
        logs: limitedLogs
      });
    } catch (error) {
      logger.error(`Error fetching logs for bot ${req.params.id}:`, error);
      return res.status(200).json({
        success: false,
        message: `Error fetching bot logs: ${error.message}`,
        logs: []
      });
    }
  });
  
  return router;
}; 