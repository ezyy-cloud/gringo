const jwt = require('jsonwebtoken');
const Bot = require('../models/Bot');

// Error response utility
const errorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error: message
  });
};

// Protect routes that require bot authentication
exports.botProtect = async (req, res, next) => {
  try {
    let token;
    
    // Check Authorization header for token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Make sure token exists
    if (!token) {
      return errorResponse(res, 'Not authorized to access this route', 401);
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if the user in the token is a bot
      const bot = await Bot.findById(decoded.id);
      
      if (!bot || !bot.isBot) {
        return errorResponse(res, 'Not authorized as a bot', 401);
      }
      
      // Check if the bot is active
      if (bot.status !== 'active') {
        return errorResponse(res, 'Bot is not active', 403);
      }
      
      // Add bot to request object
      req.bot = bot;
      
      // Update last active timestamp
      bot.lastActive = Date.now();
      await bot.save();
      
      next();
    } catch (error) {
      // Invalid token
      return errorResponse(res, 'Not authorized to access this route', 401);
    }
  } catch (error) {
    console.error('Bot protection middleware error:', error);
    errorResponse(res, 'Server error', 500);
  }
};

// Rate limiting for bot actions
exports.botRateLimiter = async (req, res, next) => {
  try {
    const bot = req.bot;
    
    // Check if bot exists and has rate limits
    if (!bot || !bot.rateLimits) {
      return next();
    }
    
    // Get current time
    const now = Date.now();
    
    // Get rate limits from bot configuration
    const { messagesPerMinute, actionsPerHour } = bot.rateLimits;
    
    // Initialize rate limit tracking in bot.config if it doesn't exist
    if (!bot.config.rateTracking) {
      bot.config.rateTracking = {
        messages: {
          count: 0,
          resetTime: now + 60000 // 1 minute from now
        },
        actions: {
          count: 0,
          resetTime: now + 3600000 // 1 hour from now
        }
      };
      await bot.save();
    }
    
    const tracking = bot.config.rateTracking;
    
    // Reset counters if time has elapsed
    if (now > tracking.messages.resetTime) {
      tracking.messages.count = 0;
      tracking.messages.resetTime = now + 60000;
    }
    
    if (now > tracking.actions.resetTime) {
      tracking.actions.count = 0;
      tracking.actions.resetTime = now + 3600000;
    }
    
    // Check if request is for sending a message
    if (req.path.includes('/messages') && req.method === 'POST') {
      // Check if bot has exceeded message rate limit
      if (tracking.messages.count >= messagesPerMinute) {
        return errorResponse(res, `Rate limit exceeded for messages. Maximum ${messagesPerMinute} messages per minute.`, 429);
      }
      
      // Increment message count
      tracking.messages.count++;
    } else {
      // Check if bot has exceeded action rate limit
      if (tracking.actions.count >= actionsPerHour) {
        return errorResponse(res, `Rate limit exceeded for actions. Maximum ${actionsPerHour} actions per hour.`, 429);
      }
      
      // Increment action count
      tracking.actions.count++;
    }
    
    // Save updated tracking information
    await bot.save();
    
    next();
  } catch (error) {
    console.error('Bot rate limiter middleware error:', error);
    errorResponse(res, 'Server error', 500);
  }
};

// Webhook verification middleware
exports.verifyWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    
    if (!signature) {
      return errorResponse(res, 'Missing webhook signature', 401);
    }
    
    // Get the raw body of the request
    const body = JSON.stringify(req.body);
    
    // Compute expected signature using HMAC-SHA256
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    
    // Compare signatures (using a safe string comparison to prevent timing attacks)
    // Use a timing-safe equal for strings instead of buffers (which may not be the same length)
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(signature.length > expectedSignature.length
        ? expectedSignature.padEnd(signature.length, '0')
        : expectedSignature),
      Buffer.from(signature.length > expectedSignature.length
        ? signature
        : signature.padEnd(expectedSignature.length, '0'))
    );
    
    if (!signaturesMatch) {
      return errorResponse(res, 'Invalid webhook signature', 401);
    }
    
    next();
  } catch (error) {
    console.error('Webhook verification error:', error);
    errorResponse(res, 'Webhook verification failed', 401);
  }
};

// Middleware for authenticating requests from the bot microservice
exports.botServiceProtect = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    // Check if API key is provided
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Bot service API key required'
      });
    }
    
    // Verify API key against environment variable
    const expectedApiKey = process.env.BOT_API_KEY || 'dev-bot-api-key';
    
    if (apiKey !== expectedApiKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid bot service API key'
      });
    }
    
    // Add a system user to the request for bot service operations
    // This ensures req.user._id is available in controller functions
    req.user = {
      _id: process.env.SYSTEM_USER_ID || '000000000000000000000000',
      username: 'system',
      role: 'system'
    };
    
    // If we have a botId in the request, pre-load it
    if (req.body.botId || req.params.id) {
      const botId = req.body.botId || req.params.id;
      const Bot = require('../models/Bot');
      
      try {
        const bot = await Bot.findById(botId);
        if (bot) {
          req.bot = bot;
        }
      } catch (error) {
        // Just log the error, don't block the request
        console.error('Error loading bot:', error);
      }
    }
    
    next();
  } catch (error) {
    console.error('Bot service authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Bot service authentication error'
    });
  }
}; 