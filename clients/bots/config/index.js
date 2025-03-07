/**
 * Bot Server Configuration
 */

const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './.env' });

module.exports = {
  // Server configuration
  PORT: process.env.BOT_SERVER_PORT || 3100,
  
  // Main server connection
  MAIN_SERVER_URL: process.env.MAIN_SERVER_URL || 'http://localhost:3000',
  
  // Authentication
  BOT_API_KEY: process.env.BOT_API_KEY || 'dev-bot-api-key',
  
  // CORS settings
  CORS_ORIGIN: process.env.CORS_ORIGIN || ['http://localhost:3001', 'http://localhost:3000', '*'],
  
  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: process.env.MAX_REQUESTS_PER_MINUTE || 100,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
}; 