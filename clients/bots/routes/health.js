/**
 * Health and Status Routes
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config');
const { logger } = require('../utils');
const botFactory = require('../botFactory');

// Server start time for uptime calculation
const SERVER_START_TIME = Date.now();

/**
 * @route GET /health
 * @description Basic health check endpoint
 */
router.get('/health', (req, res) => {
  const uptime = Date.now() - SERVER_START_TIME;
  
  return res.status(200).json({
    status: 'ok',
    service: 'bot-server',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 1000)} seconds`
  });
});

/**
 * @route GET /api/test-connection
 * @description Test connection to main server
 */
router.get('/api/test-connection', async (req, res) => {
  try {
    // Try to connect to the main server
    const response = await axios.get(`${config.MAIN_SERVER_URL}/api/health`, {
      headers: {
        'x-api-key': config.BOT_API_KEY
      },
      timeout: 5000
    });
    
    return res.status(200).json({
      success: true,
      connected: true,
      mainServer: {
        status: response.data.status || 'ok',
        message: 'Connection to main server successful'
      }
    });
  } catch (error) {
    logger.error('Failed to connect to main server', error);
    
    // Return 200 even on error, just indicate that connection failed
    // This prevents the client from seeing a 500 error
    return res.status(200).json({
      success: false,
      connected: false,
      mainServer: {
        status: 'error',
        message: `Failed to connect to main server: ${error.message}`
      },
      botService: {
        status: 'ok',
        message: 'Bot service is running but cannot connect to main server'
      }
    });
  }
});

/**
 * @route GET /types
 * @description Get all available bot template types
 */
router.get('/types', async (req, res) => {
  try {
    const templates = botFactory.getBotTemplates();
    const types = [];
    
    for (const [type, template] of templates.entries()) {
      types.push({
        id: type,
        name: template.name || type,
        description: template.description || `${type} bot template`
      });
    }
    
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

module.exports = router; 