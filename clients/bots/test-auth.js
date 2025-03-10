/**
 * Test script for bot authentication
 * This tests the authentication flow for the moderatorBot
 */
const { logger } = require('./utils');
const axios = require('axios');

logger.info('Starting moderator bot authentication test...');

// Load environment variables
require('dotenv').config();

// Import required modules
const moderatorBot = require('./templates/moderatorBot');
const authService = require('./utils/authService');

// Configuration
const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'https://api.gringo.ezyy.cloud';
const BOT_API_KEY = process.env.BOT_API_KEY || 'dev-bot-api-key';

// Function to fetch bots from the server
async function fetchBotsFromServer() {
  try {
    const url = `${MAIN_SERVER_URL}/api/bots/service/bots?limit=100`;
    logger.info(`Attempting to connect to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'x-api-key': BOT_API_KEY
      }
    });
    
    const botsData = response.data.data || [];
    logger.info(`Retrieved ${botsData.length} bots from server`);
    
    return botsData;
  } catch (error) {
    logger.error(`Error fetching bots from server: ${error.message}`);
    return [];
  }
}

// Create a mock bot instance for testing
const createBot = async () => {
  logger.info('Creating bot instance...');
  
  // Get API key from environment or use default (and log a message)
  const apiKey = process.env.BOT_API_KEY || 'dev-bot-api-key';
  
  // Set environment for testing
  process.env.NODE_ENV = 'development';
  process.env.MOCK_AUTH = 'true';
  
  logger.info(`Using API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Fetch bots from server to get a real moderator bot ID
  const bots = await fetchBotsFromServer();
  
  // Find a moderator bot
  const moderatorBotData = bots.find(bot => bot.type === 'moderator') || {
    _id: '507f1f77bcf86cd799439011',  // Fallback to a valid MongoDB ObjectId format
    username: 'testModeratorBot'
  };
  
  logger.info(`Using bot ID: ${moderatorBotData._id} (${moderatorBotData.username || 'unknown'})`);
  
  // Initialize bot with test configuration and a real bot ID
  const botInstance = await moderatorBot.initialize({
    _id: moderatorBotData._id,
    username: moderatorBotData.username || 'testModeratorBot',
    apiKey: apiKey,
    status: 'active',
    config: {
      // Default moderation settings
      profanityFilter: true,
      spamDetection: true,
      contentWarnings: true,
      autoModeration: true
    }
  });
  
  return botInstance;
};

/**
 * Main test function
 */
async function runTest() {
  logger.info('Starting moderator bot authentication test...');
  
  try {
    // Create the bot instance
    const bot = await createBot();
    
    if (!bot) {
      logger.error('Failed to create bot instance');
      return;
    }
    
    // Test authentication
    logger.info(`Testing authentication for bot ID: ${bot._id}`);
    const authenticated = await bot.authenticate();
    
    if (authenticated) {
      logger.info('Authentication successful!');
      logger.info(`Bot auth token: ${bot.authToken.substring(0, 10)}...`);
    } else {
      logger.error('Authentication failed');
    }
    
    logger.info('Test completed');
  } catch (error) {
    logger.error('Test failed with error:', error);
  }
}

// Run the test
runTest(); 