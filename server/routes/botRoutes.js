const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');
const { adminProtect } = require('../middleware/adminMiddleware');
const { botProtect, botRateLimiter, verifyWebhookSignature, botServiceProtect } = require('../middleware/botMiddleware');
const Bot = require('../models/Bot');
const mongoose = require('mongoose');

// Admin bot management routes (protected)
router.post('/register', adminProtect, botController.registerBot);
router.get('/', adminProtect, botController.getAllBots);
router.get('/types', adminProtect, botController.getBotTypes);
router.get('/:id', adminProtect, botController.getBotById);
router.put('/:id', adminProtect, botController.updateBot);
router.delete('/:id', adminProtect, botController.deleteBot);
router.post('/:id/api-key', adminProtect, botController.regenerateApiKey);

// Bot Service API routes (different authentication)
// Used by the bot microservice
router.post('/service/register', botServiceProtect, botController.registerBot);
router.post('/service/get-api-key', botServiceProtect, botController.getBotApiKey);
router.post('/service/message', botServiceProtect, botController.sendMessageToBot);
router.get('/service/bots', botServiceProtect, botController.getAllBots);
router.get('/service/bots/:id', botServiceProtect, botController.getBotById);
router.put('/service/bots/:id', botServiceProtect, botController.updateBot);
router.delete('/service/bots/:id', botServiceProtect, botController.deleteBot);

// Enhanced bot details endpoint with better error handling
router.get('/service/bots/:id/details', botServiceProtect, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[SERVER] Fetching detailed bot info for ID: ${id}`);
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`[SERVER] Invalid bot ID format: ${id}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid bot ID format'
      });
    }
    
    // Find the bot with all fields
    const bot = await Bot.findById(id);
    
    // Log the attempt result
    if (!bot) {
      console.log(`[SERVER] Bot not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }
    
    console.log(`[SERVER] Successfully found bot: ${bot.username} (${bot._id})`);
    
    // Return the bot data (excluding sensitive fields)
    res.status(200).json({
      success: true,
      bot: {
        _id: bot._id,
        username: bot.username,
        email: bot.email,
        type: bot.type || 'unknown',
        purpose: bot.purpose,
        capabilities: bot.capabilities,
        status: bot.status,
        creator: bot.creator,
        webhookUrl: bot.webhookUrl,
        rateLimits: bot.rateLimits,
        lastActive: bot.lastActive,
        createdAt: bot.createdAt,
        updatedAt: bot.updatedAt,
        config: bot.config || {}
      }
    });
  } catch (error) {
    console.error(`[SERVER] Error fetching bot details: ${error.message}`, error);
    res.status(500).json({
      success: false,
      error: 'Error fetching bot details',
      message: error.message
    });
  }
});

// Direct service endpoint to update bot type
router.put('/service/set-type/:id', botServiceProtect, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Type is required'
      });
    }

    const bot = await Bot.findById(id);
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }

    // Update the bot type
    bot.type = type;
    await bot.save();

    return res.status(200).json({
      success: true,
      data: bot
    });
  } catch (error) {
    console.error('Error setting bot type:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to set bot type'
    });
  }
});

// Bot authentication route (public)
router.post('/authenticate', botController.authenticateBot);

// Bot API routes (protected by botProtect and rate limited)
router.use('/api', botProtect, botRateLimiter);

// Bot webhook callback route
router.post('/webhook/:id', verifyWebhookSignature, (req, res) => {
  // Simple placeholder for webhook handling
  console.log(`Received webhook for bot ${req.params.id}:`, req.body);
  res.status(200).json({ success: true });
});

// Routes for bot microservice communication
router.post('/message', botController.sendMessageToBot);
router.get('/active', botController.getActiveBots);

// Add missing route for bot status - fixed path to match client request 
router.get('/:id/status', async (req, res) => {
  try {
    console.log(`[SERVER] Received status request for bot: ${req.params.id}`);
    
    const { id } = req.params;
    
    // Find the bot first to validate it exists
    const bot = await Bot.findById(id);
    if (!bot) {
      console.log(`[SERVER] Bot ${id} not found`);
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }
    
    // Return a placeholder status (you would replace this with actual status data)
    return res.status(200).json({
      id: bot._id,
      status: bot.status === 'active' ? 'running' : 'stopped',
      uptime: 0,
      memory: 0,
      cpu: 0,
      lastMessage: '',
      lastError: null
    });
  } catch (error) {
    console.error(`[SERVER] Error getting bot status for ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get bot status'
    });
  }
});

// Add missing start, stop, and restart endpoints
router.post('/:id/start', async (req, res) => {
  try {
    console.log(`[SERVER] Received start request for bot: ${req.params.id}`);
    
    const { id } = req.params;
    
    // Find the bot to validate it exists
    const bot = await Bot.findById(id);
    if (!bot) {
      console.log(`[SERVER] Bot ${id} not found`);
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }
    
    // Update the bot status to active
    bot.status = 'active';
    await bot.save();
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Bot started successfully',
      data: {
        id: bot._id,
        status: 'running'
      }
    });
  } catch (error) {
    console.error(`[SERVER] Error starting bot: ${error.message}`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to start bot',
      message: error.message
    });
  }
});

router.post('/:id/stop', async (req, res) => {
  try {
    console.log(`[SERVER] Received stop request for bot: ${req.params.id}`);
    
    const { id } = req.params;
    
    // Find the bot to validate it exists
    const bot = await Bot.findById(id);
    if (!bot) {
      console.log(`[SERVER] Bot ${id} not found`);
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }
    
    // Update the bot status to inactive
    bot.status = 'inactive';
    await bot.save();
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Bot stopped successfully',
      data: {
        id: bot._id,
        status: 'stopped'
      }
    });
  } catch (error) {
    console.error(`[SERVER] Error stopping bot: ${error.message}`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop bot',
      message: error.message
    });
  }
});

router.post('/:id/restart', async (req, res) => {
  try {
    console.log(`[SERVER] Received restart request for bot: ${req.params.id}`);
    
    const { id } = req.params;
    
    // Find the bot to validate it exists
    const bot = await Bot.findById(id);
    if (!bot) {
      console.log(`[SERVER] Bot ${id} not found`);
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }
    
    // Update the bot status to inactive
    bot.status = 'inactive';
    await bot.save();
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Bot restarted successfully',
      data: {
        id: bot._id,
        status: 'stopped'
      }
    });
  } catch (error) {
    console.error(`[SERVER] Error restarting bot: ${error.message}`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart bot',
      message: error.message
    });
  }
});

module.exports = router;