/**
 * Bot Server Middleware
 */
const config = require('../config');
const rateLimiter = require('./rateLimiter');

/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Server error:', err);
  
  // Send error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.LOG_LEVEL === 'debug' ? err.message : undefined
  });
}

/**
 * Not found middleware
 */
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
}

/**
 * API key validation middleware
 */
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  // For testing environment, accept 'test-key'
  if (process.env.NODE_ENV === 'test' && apiKey === 'test-key') {
    return next();
  }
  
  if (!apiKey || apiKey !== config.BOT_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing API key'
    });
  }
  
  next();
}

/**
 * Bot ID validation middleware
 */
function validateBotId(botFactory) {
  return (req, res, next) => {
    const botId = req.params.id || req.body.botId;
    
    if (!botId) {
      return res.status(400).json({
        success: false,
        message: 'Bot ID is required'
      });
    }
    
    const bot = botFactory.getBot(botId);
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: `Bot with ID ${botId} not found or inactive`
      });
    }
    
    // Add bot to request object for later use
    req.bot = bot;
    
    next();
  };
}

/**
 * Request logger middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log when the request completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}

module.exports = {
  errorHandler,
  notFound,
  validateApiKey,
  validateBotId,
  rateLimiter,
  requestLogger
}; 