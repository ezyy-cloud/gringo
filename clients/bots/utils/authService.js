/**
 * Bot Authentication Service
 * 
 * Centralized authentication management for bots:
 * - Handles authentication with the main server
 * - Caches authentication tokens
 * - Refreshes expired tokens
 * - Provides fallback to mock auth for development
 */

const axios = require('axios');

// Use a standalone logger to avoid circular dependencies
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  debug: (msg, ...args) => process.env.DEBUG === 'true' ? console.log(`[DEBUG] ${msg}`, ...args) : null
};

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const BOT_API_KEY = process.env.BOT_API_KEY || 'dev-bot-api-key';
const USE_MOCK_AUTH = process.env.MOCK_AUTH === 'true';
const API_KEY = process.env.BOT_API_KEY || process.env.API_KEY;

// Default expiry times (in milliseconds)
const DEFAULT_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MOCK_TOKEN_EXPIRY = 60 * 60 * 1000;         // 1 hour
const ERROR_TOKEN_EXPIRY = 30 * 60 * 1000;        // 30 minutes

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
 * Create a mock authentication token for testing and development
 * 
 * @param {string} botId - The bot's ID
 * @param {number} [expiry=MOCK_TOKEN_EXPIRY] - How long the token should be valid (ms)
 * @returns {Object} Authentication response with mock token
 */
function createMockToken(botId, expiry = MOCK_TOKEN_EXPIRY) {
  if (!botId) {
    return createResponse(false, null, 'Cannot create mock token: Missing botId');
  }
  
  try {
    const mockToken = `mock_token_${botId}_${Date.now()}`;
    
    // Cache the mock token
    tokenCache.set(botId, {
      token: mockToken,
      expiry: Date.now() + expiry
    });
    
    logger.info(`Created mock authentication token for bot ${botId}`);
    return createResponse(true, mockToken);
  } catch (error) {
    logger.error(`Error creating mock token: ${error?.message || 'Unknown error'}`);
    return createResponse(false, null, `Failed to create mock token: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Authenticate a bot with the server
 * @param {string} botId - The bot's unique identifier
 * @param {string} apiKey - The API key for authentication
 * @param {boolean} forceRefresh - Force refresh the token even if one exists
 * @returns {Promise<Object>} - Response containing success status, token and error if any
 */
async function authenticateBot(botId, apiKey, forceRefresh = false) {
  if (!botId) {
    console.warn('[AuthService] Missing botId in authenticateBot call');
    return createResponse(false, null, 'Missing botId');
  }

  // Use the provided API key or fallback to the environment variable
  const effectiveApiKey = apiKey || BOT_API_KEY;
  
  if (!effectiveApiKey) {
    console.warn('[AuthService] No API key available for authentication');
    return createResponse(false, null, 'Missing API key');
  }

  // Check if we have a cached token that's not expired and not forcing refresh
  if (!forceRefresh && tokenCache.has(botId)) {
    const cachedAuth = tokenCache.get(botId);
    
    // Check if token is still valid (not expired)
    if (cachedAuth && cachedAuth.expiry > Date.now()) {
      logger.debug(`Using cached auth token for bot ${botId}`);
      return createResponse(true, cachedAuth.token);
    }
    
    // Token expired, remove from cache
    tokenCache.delete(botId);
    logger.debug(`Removed expired token for bot ${botId}`);
  }

  // For development/testing environments, use mock authentication
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.MOCK_AUTH === 'true') {
    try {
      console.info('[AuthService] Using mock authentication for development/testing');
      const mockToken = createMockToken(botId);
      
      // Cache the token
      tokenCache.set(botId, {
        token: mockToken,
        expiry: Date.now() + MOCK_TOKEN_EXPIRY
      });
      
      return createResponse(true, mockToken);
    } catch (error) {
      console.error('[AuthService] Error creating mock token:', error);
      return createResponse(false, null, 'Mock authentication failed');
    }
  }

  // Production mode - authenticate with the server
  try {
    console.info(`[AuthService] Authenticating bot ${botId} with server`);
    
    const response = await axios.post(`${API_URL}/api/bots/authenticate`, {
      botId,
      apiKey: effectiveApiKey
    });
    
    if (response.data && response.data.success && response.data.token) {
      const token = response.data.token;
      const expiresIn = response.data.expiresIn || DEFAULT_TOKEN_EXPIRY;
      
      // Cache the token
      tokenCache.set(botId, {
        token,
        expiry: Date.now() + expiresIn
      });
      
      console.info(`[AuthService] Successfully authenticated bot ${botId} with server`);
      return createResponse(true, token);
    } else {
      const errorMsg = response.data?.message || 'Unknown authentication error';
      console.error(`[AuthService] Server authentication failed: ${errorMsg}`);
      return createResponse(false, null, errorMsg);
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || 'Unknown error during authentication';
    console.error(`[AuthService] Authentication error:`, errorMsg);
    
    // In development, fallback to mock authentication as a last resort
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.warn('[AuthService] Falling back to mock authentication after server error');
      const mockToken = createMockToken(botId);
      
      tokenCache.set(botId, {
        token: mockToken,
        expiry: Date.now() + MOCK_TOKEN_EXPIRY
      });
      
      return createResponse(true, mockToken);
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
  
  // Fall back to mock token in non-production
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`Creating emergency mock token for bot ${botId}`);
    const mockResult = createMockToken(botId);
    if (mockResult.success) {
      bot.authToken = mockResult.token;
      return mockResult.token;
    }
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
  createAuthHeaders,
  createMockToken // Expose for testing
}; 