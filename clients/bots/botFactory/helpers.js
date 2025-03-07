/**
 * Bot Factory Helpers
 * 
 * Contains private helper methods for the BotFactory:
 * - Validation
 * - API key retrieval
 * - Bot enhancement
 * - Socket connection
 * - Server interaction
 */

const axios = require('axios');
const { addSocketCapability } = require('../utils/socketUtil');

// Configuration
const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'http://localhost:3000';
const BOT_API_KEY = process.env.BOT_API_KEY || 'dev-bot-api-key';

/**
 * Validate bot data is complete
 * @param {object} botData - The bot data to validate
 * @returns {boolean} True if valid
 * @throws {Error} If invalid
 */
function validateBotData(botData) {
  if (!botData) {
    throw new Error('Bot data is required');
  }
  
  // Destructure with default values
  const { type, username } = botData;
  
  if (!type) {
    throw new Error('Bot type is required');
  }
  
  if (!username) {
    throw new Error('Bot username is required');
  }
  
  return true;
}

/**
 * Retrieve bot API key from server
 * @param {string} botId - The bot ID
 * @param {string} username - The bot username
 * @returns {string|null} The API key or null
 */
async function retrieveBotApiKey(botId, username) {
  try {
    console.log(`Getting API key for bot ${username} (${botId})`);
    const response = await axios.post(
      `${MAIN_SERVER_URL}/api/bots/service/get-api-key`,
      { botId },
      {
        headers: {
          'x-api-key': BOT_API_KEY
        }
      }
    );
    
    if (response.data.success && response.data.apiKey) {
      console.log(`Retrieved API key for bot ${username}`);
      return response.data.apiKey;
    } else {
      console.warn(`Could not retrieve API key for bot ${username}: ${response.data.message || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.error(`Error retrieving API key for bot ${username}:`, error.message);
    return null;
  }
}

/**
 * Add common methods and properties to bot instance
 * @param {object} botInstance - The bot instance to enhance
 * @param {object} templateConfig - The template config
 * @param {object} botConfig - The bot-specific config
 * @param {string} status - The bot status
 * @param {string} apiKey - The bot API key
 * @returns {object} The enhanced bot instance
 */
function enhanceBotInstance(botInstance, templateConfig, botConfig, status, apiKey) {
  // Make sure the bot has critical properties
  botInstance.config = { ...templateConfig, ...botConfig };
  botInstance.status = status || 'inactive';
  botInstance.startTime = null;
  botInstance.apiKey = apiKey;
  
  // Add common methods if not present
  if (!botInstance.logs) {
    botInstance.logs = [];
  }
  
  if (!botInstance.log) {
    botInstance.log = (message) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`;
      botInstance.logs.push(logEntry);
      
      // Keep logs reasonably sized
      if (botInstance.logs.length > 100) {
        botInstance.logs.shift();
      }
      
      // Log to console as well
      console.log(`Bot ${botInstance.username}: ${message}`);
    };
  }
  
  // Add activation method if not present
  if (!botInstance.activate) {
    botInstance.activate = async () => {
      if (botInstance.status === 'active') {
        botInstance.log('Already active');
        return true;
      }
      
      botInstance.status = 'active';
      botInstance.startTime = new Date();
      botInstance.log('Activated');
      
      // Connect to socket if method exists
      if (typeof botInstance.connectToSocketServer === 'function') {
        await botInstance.connectToSocketServer();
      }
      
      return true;
    };
  }
  
  // Add socket capabilities if not present
  if (!botInstance.connectToSocketServer) {
    addSocketCapability(botInstance, MAIN_SERVER_URL);
  }
  
  return botInstance;
}

/**
 * Connect bot to socket server
 * @param {object} botInstance - The bot instance to connect
 * @returns {boolean} True if successful, false otherwise
 */
async function connectBotToSocket(botInstance) {
  try {
    // Activate the bot if not already active
    if (botInstance.status !== 'active') {
      botInstance.status = 'active';
      botInstance.startTime = new Date();
    }
    
    if (typeof botInstance.connectToSocketServer !== 'function') {
      console.warn(`Bot ${botInstance.username} does not have connectToSocketServer method`);
      return false;
    }
    
    await botInstance.connectToSocketServer();
    return true;
  } catch (error) {
    console.error(`Error connecting bot ${botInstance.username} to socket:`, error);
    return false;
  }
}

/**
 * Fetch bots data from the main server with retries
 * @returns {Array} Array of bot data objects
 */
async function fetchBotsFromServer() {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      const url = `${MAIN_SERVER_URL}/api/bots/service/bots?limit=100`;
      console.log(`Attempting to connect to: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'x-api-key': BOT_API_KEY
        }
      });
      
      // Log the raw response data
      console.log('================= BOT DATA FROM MAIN SERVER =================');
      console.log('FULL RESPONSE:', JSON.stringify(response.data, null, 2));
      
      const botsData = response.data.data || [];
      
      // Store the original data for each bot
      botsData.forEach(bot => {
        // Store a copy of the original data
        bot.originalData = { ...bot };
      });
      
      // Log processed bot data
      console.log('BOT COUNT:', botsData.length);
      console.log('FIRST BOT (if available):', botsData.length > 0 ? JSON.stringify(botsData[0], null, 2) : 'No bots available');
      console.log('BOT TYPES:', botsData.map(bot => bot.type).filter((v, i, a) => a.indexOf(v) === i));
      console.log('=============================================================');
      
      return botsData;
    } catch (error) {
      retryCount++;
      console.error(`Attempt ${retryCount}/${maxRetries} failed:`, error.message);
      
      if (error.response && error.response.status === 401) {
        console.error('Authentication failed. Check your BOT_API_KEY environment variable.');
      }
      
      if (retryCount === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
    }
  }
  
  return []; // Should never reach here due to throw above, but keeps TypeScript happy
}

module.exports = {
  validateBotData,
  retrieveBotApiKey,
  enhanceBotInstance,
  connectBotToSocket,
  fetchBotsFromServer
}; 