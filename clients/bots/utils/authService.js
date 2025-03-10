/**
 * Bot Authentication Service
 * 
 * Centralized authentication management for bots:
 * - Handles authentication with the main server
 * - Caches authentication tokens
 * - Refreshes expired tokens
 */

const axios = require('axios');
const logger = require('./logger');

// Configuration
const API_URL = process.env.MAIN_SERVER_URL || 'https://api.gringo.ezyy.cloud';
const API_KEY = process.env.BOT_API_KEY || process.env.API_KEY;

// Default expiry time (in milliseconds)
const DEFAULT_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Token cache to avoid frequent auth requests
// Structure: { botId: { token: 'token', expiry: timestamp } }
const tokenCache = new Map();

/**
 * Create a safe, standardized response object to ensure consistent return structure
 * 
 * @param {boolean} success - Whether the operation was successful
 * @param {string|null} token - The authentication token (if successful)
 * @param {string|null} error - Error message (if unsuccessful)
 * @returns {Object} Standardized response object
 */
function createResponse(success, token = null, error = null) {
  return {
    success: Boolean(success),
    token: token,
    error: error
  };
}

/**
 * Authenticate a bot with the main server
 * @param {string} botId - The bot ID to authenticate
 * @param {string} apiKey - The API key to use for authentication
 * @param {boolean} forceRefresh - Whether to force a refresh of the token
 * @returns {Promise<Object>} - Authentication result
 */
async function authenticateBot(botId, apiKey, forceRefresh = false) {
  try {
    // Validate parameters
    if (!botId) {
      logger.warn('[AuthService] Missing botId in authenticateBot call');
      return createResponse(false, null, 'Missing botId');
    }
    
    // Use provided API key or fallback to environment variable
    const effectiveApiKey = apiKey || API_KEY;
    
    if (!effectiveApiKey) {
      logger.warn('[AuthService] No API key available for authentication');
      return createResponse(false, null, 'No API key available');
    }
    
    // Authenticate with the main server
    logger.info(`[AuthService] Authenticating bot ${botId} with server at ${API_URL}`);
    logger.info(`[AuthService] Using API key: ${effectiveApiKey.substring(0, 3)}...${effectiveApiKey.substring(effectiveApiKey.length - 4)}`);
    
    const response = await axios.post(
      `${API_URL}/api/bots/authenticate`,
      { 
        botId: botId,
        apiKey: effectiveApiKey 
      },
      {
        headers: {
          'x-api-key': effectiveApiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Check if the response is successful
    if (response.data.success && response.data.token) {
      logger.info(`[AuthService] Successfully authenticated bot ${botId}`);
      return createResponse(true, response.data.token);
    } else {
      const errorMsg = response.data.message || 'Unknown error';
      logger.error(`[AuthService] Server authentication failed: ${errorMsg}`);
      return createResponse(false, null, errorMsg);
    }
  } catch (error) {
    const errorMsg = error.message || 'Unknown error';
    logger.error(`[AuthService] Error authenticating with server: ${errorMsg}`);
    
    if (error.response) {
      logger.error(`[AuthService] Response status: ${error.response.status}`);
      logger.error(`[AuthService] Response data:`, error.response.data);
    }
    
    return createResponse(false, null, errorMsg);
  }
}

/**
 * Get a valid authentication token for a bot
 * Will refresh if needed
 * 
 * @param {Object} bot - Bot instance with id and apiKey
 * @returns {Promise<string|null>} The authentication token or null
 */
async function getAuthToken(bot) {
  // Check bot object
  if (!bot) {
    logger.error('Cannot get auth token: Invalid bot object');
    return null;
  }
  
  // Get botId from either id or _id
  const botId = bot.id || bot._id;
  
  if (!botId) {
    logger.error('Cannot get auth token: Bot has no id or _id');
    return null;
  }
  
  // First check for direct authToken property on bot
  if (bot.authToken) {
    logger.debug(`Using direct authToken from bot ${botId}`);
    return bot.authToken;
  }
  
  // Then check for cached token
  if (tokenCache.has(botId)) {
    const cachedAuth = tokenCache.get(botId);
    
    // Return cached token if not expired
    if (cachedAuth && cachedAuth.expiry > Date.now()) {
      logger.debug(`Using cached auth token for bot ${botId}`);
      return cachedAuth.token;
    }
    
    // Token expired, remove from cache
    tokenCache.delete(botId);
    logger.debug(`Removed expired token for bot ${botId}`);
  }
  
  try {
    // Authenticate the bot
    const apiKey = bot.apiKey || API_KEY;
    const result = await authenticateBot(botId, apiKey);
    
    // Return the token if authentication was successful
    if (result && result.success && result.token) {
      // Store token on bot object for future use
      bot.authToken = result.token;
      return result.token;
    } else {
      logger.error(`Failed to get auth token: ${result?.error || 'Unknown error'}`);
    }
  } catch (error) {
    logger.error(`Error in getAuthToken for bot ${botId}: ${error?.message || 'Unknown error'}`);
  }
  
  return null;
}

/**
 * Clear cached authentication tokens
 * 
 * @param {string} [botId] - Optional bot ID to clear specific cache
 */
function clearAuthCache(botId) {
  if (botId) {
    tokenCache.delete(botId);
    logger.debug(`Cleared auth cache for bot ${botId}`);
  } else {
    tokenCache.clear();
    logger.debug('Cleared all auth caches');
  }
}

/**
 * Create authorization headers for API requests
 * 
 * @param {string} token - Auth token
 * @param {string} [apiKey] - Optional API key
 * @returns {Object} Headers object
 */
function createAuthHeaders(token, apiKey) {
  const headers = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  
  return headers;
}

// Export the service
module.exports = {
  authenticateBot,
  getAuthToken,
  clearAuthCache,
  createAuthHeaders
}; 