const Bot = require('../models/Bot');
const User = require('../models/User');
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const botUtils = require('../utils/botUtils');

// Error response utility
const errorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: message
  });
};

// @desc    Register a new bot
// @route   POST /api/bots/register
// @access  Admin
exports.registerBot = async (req, res) => {
  try {
    const { username, email, password, purpose, type, capabilities, webhookUrl, rateLimits, creator, status } = req.body;

    console.log('Bot registration request with status:', status);

    // Validate required fields
    if (!username || !email || !password || !purpose) {
      return errorResponse(res, 'Please provide username, email, password, and purpose', 400);
    }

    // Ensure status is valid
    const validStatus = botUtils.VALID_BOT_STATUSES;
    const botStatus = status && validStatus.includes(status) ? status : 'pending';

    // Check if username already exists
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return errorResponse(res, 'Username already exists', 400);
    }

    // Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return errorResponse(res, 'Email already exists', 400);
    }

    // Use provided creator ID or fall back to the requesting user
    let creatorId = req.user._id;
    
    // If a creator ID was provided and it looks like a valid MongoDB ID, use it
    if (creator && mongoose.Types.ObjectId.isValid(creator)) {
      // Check if the creator exists in the database
      const creatorExists = await User.findById(creator);
      if (creatorExists) {
        creatorId = creator;
      } else {
        console.warn(`Creator ID ${creator} was provided but user not found. Using ${req.user._id} instead.`);
      }
    }

    // Validate bot type against available templates
    if (type && !botUtils.isValidBotType(type)) {
      return errorResponse(res, `Invalid bot type. Valid types are: ${botUtils.VALID_BOT_TYPES.join(', ')}`, 400);
    }

    // Get default capabilities for the bot type if not provided
    const botCapabilities = capabilities || botUtils.getDefaultCapabilitiesForType(type || 'news');

    // Create the bot with explicit status
    const bot = new Bot({
      username,
      email,
      password,
      purpose,
      type: type || 'news', // Default to 'news' if no type is provided
      creator: creatorId,
      status: botStatus, // Use validated status
      capabilities: botCapabilities,
      webhookUrl: webhookUrl || null,
      rateLimits: rateLimits || undefined
    });

    // Generate API key
    const apiKey = bot.generateApiKey();

    // Save the bot
    await bot.save();

    console.log('Bot created with type:', type || 'news', 'and status:', botStatus);

    // Return the bot data with the API key (only returned once at creation)
    res.status(201).json({
      success: true,
      data: {
        _id: bot._id,
        username: bot.username,
        email: bot.email,
        purpose: bot.purpose,
        capabilities: bot.capabilities,
        status: bot.status,
        apiKey
      }
    });
  } catch (error) {
    console.error('Error registering bot:', error);
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get all bots
// @route   GET /api/bots
// @access  Admin
exports.getAllBots = async (req, res) => {
  try {
    // Apply filters from query params
    const filter = { isBot: true };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.capability) {
      filter.capabilities = { $in: [req.query.capability] };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get bots with pagination
    const bots = await Bot.find(filter)
      .select('-password -apiKey')
      .populate('creator', 'username email')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Get total count for pagination
    const total = await Bot.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: bots.length,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      },
      data: bots
    });
  } catch (error) {
    console.error('Get bots error:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get a single bot
// @route   GET /api/bots/:id
// @access  Admin
exports.getBotById = async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id)
      .select('-password -apiKey')
      .populate('creator', 'username email');
    
    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }
    
    res.status(200).json({
      success: true,
      data: bot
    });
  } catch (error) {
    console.error('Get bot error:', error);
    
    // Handle invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return errorResponse(res, 'Bot not found with that ID', 404);
    }
    
    errorResponse(res, error.message, 500);
  }
};

// @desc    Update bot status or configuration
// @route   PUT /api/bots/:id
// @access  Admin
exports.updateBot = async (req, res) => {
  try {
    const { status, purpose, capabilities, webhookUrl, rateLimits, config, type } = req.body;
    
    // Find the bot
    let bot = await Bot.findById(req.params.id);
    
    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }
    
    // Validate bot type if provided
    if (type && !botUtils.isValidBotType(type)) {
      return errorResponse(res, `Invalid bot type. Valid types are: ${botUtils.VALID_BOT_TYPES.join(', ')}`, 400);
    }
    
    // Update fields if provided
    if (status) bot.status = status;
    if (purpose) bot.purpose = purpose;
    if (capabilities) bot.capabilities = capabilities;
    if (webhookUrl !== undefined) bot.webhookUrl = webhookUrl;
    if (rateLimits) bot.rateLimits = { ...bot.rateLimits, ...rateLimits };
    if (config) bot.config = { ...bot.config, ...config };
    if (type) bot.type = type;
    
    console.log('Updating bot with type:', type || bot.type || 'news');
    
    // If no type is set, provide a default
    if (!bot.type) {
      bot.type = 'news';
      console.log('Setting default type "news" for bot without type');
    }
    
    // Save the bot
    await bot.save();
    
    res.status(200).json({
      success: true,
      data: {
        _id: bot._id,
        username: bot.username,
        email: bot.email,
        purpose: bot.purpose,
        capabilities: bot.capabilities,
        status: bot.status,
        webhookUrl: bot.webhookUrl,
        rateLimits: bot.rateLimits,
        config: bot.config
      }
    });
  } catch (error) {
    console.error('Update bot error:', error);
    
    // Handle invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return errorResponse(res, 'Bot not found with that ID', 404);
    }
    
    errorResponse(res, error.message, 500);
  }
};

// @desc    Delete a bot
// @route   DELETE /api/bots/:id
// @access  Admin
exports.deleteBot = async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    
    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }
    
    await bot.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete bot error:', error);
    
    // Handle invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return errorResponse(res, 'Bot not found with that ID', 404);
    }
    
    errorResponse(res, error.message, 500);
  }
};

// @desc    Regenerate bot API key
// @route   POST /api/bots/:id/api-key
// @access  Admin
exports.regenerateApiKey = async (req, res) => {
  try {
    // Find the bot with API key field
    const bot = await Bot.findById(req.params.id).select('+apiKey');
    
    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }
    
    // Generate a new API key
    const apiKey = bot.generateApiKey();
    
    // Save the bot
    await bot.save();
    
    res.status(200).json({
      success: true,
      data: {
        apiKey // Return the new API key
      }
    });
  } catch (error) {
    console.error('Regenerate API key error:', error);
    
    // Handle invalid ID format
    if (error instanceof mongoose.Error.CastError) {
      return errorResponse(res, 'Bot not found with that ID', 404);
    }
    
    errorResponse(res, error.message, 500);
  }
};

// @desc    Authenticate a bot with API key (for bot use)
// @route   POST /api/bots/authenticate
// @access  Public
exports.authenticateBot = async (req, res) => {
  try {
    console.log('[SERVER] Bot authentication attempt with payload:', { 
      ...req.body,
      apiKey: req.body.apiKey ? '****' + req.body.apiKey.slice(-4) : undefined 
    });
    
    // Extract bot ID and API key, allowing for different payload formats
    const botId = req.body.botId || req.body.id;
    const apiKey = req.body.apiKey;
    
    // Check for required fields
    if (!apiKey || !botId) {
      console.log('[SERVER] Bot authentication failed: Missing bot ID or API key');
      return errorResponse(res, 'Please provide bot ID and API key', 400);
    }
    
    // Find the bot with API key field
    const bot = await Bot.findById(botId).select('+apiKey');
    
    if (!bot) {
      console.log(`[SERVER] Bot authentication failed: Bot ${botId} not found`);
      return errorResponse(res, 'Bot not found', 404);
    }
    
    // Verify API key first
    if (!bot.verifyApiKey(apiKey)) {
      console.log(`[SERVER] Bot authentication failed: Invalid API key for bot ${botId}`);
      return errorResponse(res, 'Invalid API key', 401);
    }
    
    // For development, temporarily allow all bots to authenticate regardless of status
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SERVER] Development mode: Allowing bot ${botId} to authenticate despite status ${bot.status}`);
    } 
    // In production, check if bot is active
    else if (bot.status !== 'active') {
      console.log(`[SERVER] Bot authentication failed: Bot ${botId} is not active (status: ${bot.status})`);
      return errorResponse(res, 'Bot is not active, cannot authenticate for socket connection', 403);
    }
    
    // Update last active timestamp
    bot.lastActive = Date.now();
    await bot.save();
    
    // Create token payload
    const token = generateBotToken(bot);
    
    console.log(`[SERVER] Bot authentication successful for bot ${botId}`);
    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    console.error('Bot authentication error:', error);
    errorResponse(res, error.message, 500);
  }
};

// Generate a JWT token for bot authentication
const generateBotToken = (bot) => {
  const jwt = require('jsonwebtoken');
  
  const payload = {
    id: bot._id,
    username: bot.username,
    isBot: true
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_BOT_EXPIRE || '1d' }
  );
};

// Send a message to a bot via the bot microservice
exports.sendMessageToBot = async (req, res) => {
  try {
    const { message, botId } = req.body;
    
    // Validate required fields
    if (!message || !botId) {
      return res.status(400).json({
        success: false,
        message: 'Message content and bot ID are required'
      });
    }
    
    // Forward the message to the bot microservice
    const response = await axios.post(
      `${process.env.BOT_SERVICE_URL || 'http://localhost:3100'}/api/messages/receive`,
      {
        message,
        botId
      },
      {
        headers: {
          'x-api-key': process.env.BOT_API_KEY || 'dev-bot-api-key'
        }
      }
    );
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error sending message to bot:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message to bot'
    });
  }
};

// Get active bots for the bot service
exports.getActiveBots = async (req, res) => {
  try {
    console.log('getActiveBots called with headers:', JSON.stringify(req.headers));
    
    // Verify API key
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.BOT_API_KEY || 'dev-bot-api-key';
    
    // Log the API key check for debugging (don't include actual keys in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Key Check - Received: '${apiKey}'`);
      console.log(`API Key Check - Expected: '${expectedApiKey}'`);
      console.log(`API Key Check - Match: ${apiKey === expectedApiKey ? 'Yes' : 'No'}`);
    }
    
    // Allow bypassing API key in development mode
    if (process.env.NODE_ENV === 'development' && req.query.bypassAuth === 'true') {
      console.log('Bypassing API key authentication in development mode');
    } else if (apiKey !== expectedApiKey) {
      console.log('API key authentication failed');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    // Find all active bots
    const bots = await Bot.find({ 
      isBot: true,
      status: 'active'
    }).select('-password -webhookSecret');
    
    // Ensure we always have at least one active bot for testing
    if (bots.length === 0 && process.env.NODE_ENV === 'development') {
      console.log('No active bots found, returning mock bot data for development');
      
      // Find any bot to use as an example
      const anyBot = await Bot.findOne({ isBot: true }).select('-password -webhookSecret');
      
      if (anyBot) {
        // Use the found bot but adjust its status
        anyBot.status = 'active';
        
        // Return the modified bot without saving changes to database
        return res.status(200).json({
          success: true,
          bots: [anyBot]
        });
      }
    }
    
    // Return all active bots
    return res.status(200).json({
      success: true,
      bots
    });
  } catch (error) {
    console.error('Error fetching active bots:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Add a new function to get bot types
exports.getBotTypes = (req, res) => {
  try {
    const botTypes = botUtils.getBotTypesForUI();
    res.status(200).json({
      success: true,
      data: botTypes
    });
  } catch (error) {
    return errorResponse(res, 'Error retrieving bot types', 500, error);
  }
};

// @desc    Get a bot's API key (for bot service use only)
// @route   POST /api/bots/service/get-api-key
// @access  Bot Service Only
exports.getBotApiKey = async (req, res) => {
  try {
    const { botId } = req.body;
    
    if (!botId) {
      return errorResponse(res, 'Bot ID is required', 400);
    }
    
    // Find the bot with API key field
    const bot = await Bot.findById(botId).select('+apiKey');
    
    if (!bot) {
      return errorResponse(res, 'Bot not found', 404);
    }
    
    // Remove the active status check to allow retrieving API keys for bots in any status
    // This allows the bot service to manage bots regardless of their status
    
    res.status(200).json({
      success: true,
      apiKey: bot.apiKey
    });
  } catch (error) {
    console.error('Error getting bot API key:', error);
    errorResponse(res, error.message, 500);
  }
}; 