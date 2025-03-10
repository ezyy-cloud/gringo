/**
 * Weather Bot - Alert Publisher
 * Handles posting weather alerts to the platform
 */
const { logger } = require('../../utils');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Server configuration
const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'http://localhost:3100';
const API_KEY = process.env.BOT_API_KEY || process.env.API_KEY;

// Log configuration for debugging
if (!process.env.MAIN_SERVER_URL) {
  logger.warn(`MAIN_SERVER_URL not found in environment, using default: ${MAIN_SERVER_URL}`);
}

if (!API_KEY) {
  logger.error('No BOT_API_KEY or API_KEY found in environment variables. API requests may fail!');
} else {
  logger.info(`Using API key: ${API_KEY.substring(0, 4)}...${API_KEY.length > 8 ? API_KEY.substring(API_KEY.length - 4) : '****'}`);
}

// Add rate limiting state tracking
const rateLimitState = {
  isRateLimited: false,
  retryAfter: 0,
  lastRateLimitTime: 0
};

// Helper function to check if we're currently rate limited
function isRateLimited() {
  if (!rateLimitState.isRateLimited) return false;
  
  const now = Date.now();
  const timeElapsed = now - rateLimitState.lastRateLimitTime;
  
  // If enough time has passed since the rate limit, clear the state
  if (timeElapsed > rateLimitState.retryAfter) {
    rateLimitState.isRateLimited = false;
    logger.info('Rate limit period has expired, resuming normal operation');
    return false;
  }
  
  // Still rate limited
  const waitTimeRemaining = Math.ceil((rateLimitState.retryAfter - timeElapsed) / 1000);
  logger.warn(`Still rate limited for ${waitTimeRemaining} more seconds`);
  return true;
}

// Helper function to set rate limit state when a 429 is received
function setRateLimit(error) {
  // Parse retry-after header or default to 60 seconds
  let retryAfter = 60 * 1000; // Default 60 seconds
  
  if (error.response && error.response.headers && error.response.headers['retry-after']) {
    // If retry-after is in seconds
    const retryAfterHeader = error.response.headers['retry-after'];
    if (!isNaN(retryAfterHeader)) {
      retryAfter = parseInt(retryAfterHeader) * 1000;
    } 
    // If retry-after is a date
    else {
      const retryDate = new Date(retryAfterHeader);
      if (!isNaN(retryDate.getTime())) {
        retryAfter = retryDate.getTime() - Date.now();
      }
    }
  }
  
  // Add some jitter to prevent all bots from retrying simultaneously
  const jitter = Math.floor(Math.random() * 5000); // 0-5 seconds of jitter
  retryAfter += jitter;
  
  // Ensure minimum backoff of 30 seconds
  retryAfter = Math.max(retryAfter, 30000);
  
  // Set the rate limit state
  rateLimitState.isRateLimited = true;
  rateLimitState.retryAfter = retryAfter;
  rateLimitState.lastRateLimitTime = Date.now();
  
  logger.warn(`Rate limited. Will retry after ${Math.ceil(retryAfter / 1000)} seconds`);
}

/**
 * Get an image URL for a weather icon emoji
 * @param {string} icon - The icon emoji
 * @returns {string|null} - URL to the icon image or null if not available
 */
function getIconImageUrl(icon) {
  // Map of weather icons to Unsplash image URLs
  const iconMap = {
    '⚡️': 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=500&auto=format&fit=crop',  // Lightning
    '🌪': 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?q=80&w=500&auto=format&fit=crop',  // Tornado
    '🌊': 'https://images.unsplash.com/photo-1494564605686-2e931f77a8e2?q=80&w=500&auto=format&fit=crop',  // Flood/Wave
    '🔥': 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=500&auto=format&fit=crop',  // Fire
    '❄️': 'https://images.unsplash.com/photo-1457269449834-928af64c684d?q=80&w=500&auto=format&fit=crop',  // Snow
    '🌧': 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?q=80&w=500&auto=format&fit=crop',  // Rain
    '💨': 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?q=80&w=500&auto=format&fit=crop',  // Wind
    '☁️': 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=500&auto=format&fit=crop',  // Clouds
    '⛅️': 'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?q=80&w=500&auto=format&fit=crop',  // Partly cloudy
    '🌞': 'https://images.unsplash.com/photo-1506588345361-5e12b7380de7?q=80&w=500&auto=format&fit=crop',  // Extreme heat
    '🌡': 'https://images.unsplash.com/photo-1583075850023-9478af4432f0?q=80&w=500&auto=format&fit=crop',  // Temperature
    '💧': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=500&auto=format&fit=crop',     // Water
    '🌫': 'https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?q=80&w=500&auto=format&fit=crop',  // Fog
    '🧊': 'https://images.unsplash.com/photo-1551899892-56314e56db58?q=80&w=500&auto=format&fit=crop',     // Ice
    '⚠️': 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=500&auto=format&fit=crop'      // Warning
  };
  
  // Default warning image from Unsplash
  const defaultImage = 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=500&auto=format&fit=crop';
  
  // Return the URL for the icon or the default warning image
  return iconMap[icon] || defaultImage;
}

/**
 * Download an image from a URL to a temporary file
 * @param {string} url - URL of the image to download
 * @returns {Promise<string>} - Path to the downloaded temporary file
 */
async function downloadImage(url) {
  try {
    logger.info(`Downloading image from URL: ${url}`);
    
    // Create a temporary file path
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `weather_alert_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.png`);
    
    // Download the image
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });
    
    // Check if the response is an image
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`URL did not return an image (content-type: ${contentType})`);
    }
    
    // Save the image to a temporary file
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        logger.info(`Image downloaded successfully to: ${tempFilePath}`);
        resolve(tempFilePath);
      });
      writer.on('error', (err) => {
        logger.error(`Error writing image to file: ${err.message}`);
        fs.unlink(tempFilePath, () => {}); // Clean up the file
        reject(err);
      });
    });
  } catch (error) {
    logger.error(`Error downloading image: ${error.message}`);
    throw error;
  }
}

/**
 * Get the file type from a file path
 * @param {string} filePath - Path to the file
 * @returns {string} - MIME type of the file
 */
function getFileTypeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Publish an alert with an image to a channel
 * @param {Object} alert - Formatted alert
 * @param {Object|null} bot - Bot instance (optional)
 * @returns {Promise<Object>} - Response object
 */
async function publishAlertToChannel(alert, bot = null) {
  let tempFilePath = null;
  
  try {
    // Check if we're rate limited
    if (isRateLimited()) {
      logger.warn(`Skipping post due to active rate limiting: ${alert.title}`);
      return { 
        success: false, 
        error: 'Rate limited, try again later', 
        rateLimited: true,
        retryAfter: Math.ceil((rateLimitState.retryAfter - (Date.now() - rateLimitState.lastRateLimitTime)) / 1000)
      };
    }
    
    // Ensure we have a valid bot instance
    if (!bot) {
      logger.error('No bot instance provided for publishing alert');
      return { success: false, error: 'No bot instance provided' };
    }
    
    // Get the bot's username
    const username = bot.username || 'WeatherBot';
    logger.info(`Publishing alert as user: ${username}`);
    
    // Get the image URL for the icon
    let imageUrl = null;
    if (alert.icon) {
      imageUrl = getIconImageUrl(alert.icon);
      logger.info(`Using image URL for icon: ${imageUrl}`);
    } else {
      logger.warn('No icon provided in alert, using default warning icon');
      imageUrl = 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=500&auto=format&fit=crop';
    }
    
    // Prepare location data
    let locationData = null;
    if (alert.coordinates) {
      locationData = {
        longitude: alert.coordinates.longitude,
        latitude: alert.coordinates.latitude,
        fuzzyLocation: true
      };
      logger.info(`Using location data: ${JSON.stringify(locationData)}`);
    } else {
      // Default to New York coordinates if none provided
      locationData = {
        longitude: -74.0060,
        latitude: 40.7128,
        fuzzyLocation: true
      };
      logger.info(`No coordinates in alert, using default location: ${JSON.stringify(locationData)}`);
    }
    
    // Set up retry mechanism
    const maxRetries = 1;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        // Try to download the image
        logger.info(`Downloading image: ${imageUrl}`);
        try {
          tempFilePath = await downloadImage(imageUrl);
          
          if (!tempFilePath) {
            throw new Error('Image download failed - no tempFilePath');
          }
          
          const stats = fs.statSync(tempFilePath);
          const fileSize = stats.size;
          const fileType = getFileTypeFromPath(tempFilePath);
          
          logger.info(`Preparing image upload with content type: ${fileType}, size: ${fileSize} bytes`);
          
          // Get authentication token
          const authToken = bot.authToken;
          const apiKey = bot.apiKey || API_KEY || 'dev-bot-api-key';
          
          if (!authToken) {
            logger.warn('No auth token available, attempting to authenticate');
            if (typeof bot.authenticate === 'function') {
              await bot.authenticate();
            } else {
              logger.error('Bot does not have authenticate method');
              throw new Error('Authentication failed - no token and no authenticate method');
            }
          }
          
          // Make sure we're using the latest token after possible authentication
          const tokenToUse = bot.authToken;
          
          logger.info('Using bot.authToken for authentication');
          
          // Make the API request with image
          const apiUrl = `${MAIN_SERVER_URL}/api/messages/with-image`;
          logger.info(`Sending post request to: ${apiUrl}`);
          logger.info(`Request headers: Auth=${tokenToUse ? 'Present' : 'Missing'}, API Key=${apiKey ? 'Present' : 'Missing'}`);
          
          // Create a multipart form data request
          const formData = new FormData();
          
          // Add the message content
          formData.append('message', alert.content);
          formData.append('title', alert.title);
          
          // Add socketId field which is required by the API
          const socketId = `weatherbot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          formData.append('socketId', socketId);
          
          // Add username fields
          formData.append('username', username);
          formData.append('senderUsername', username);
          formData.append('sender', username);
          
          // Add other alert metadata
          if (alert.alertId) formData.append('alertId', alert.alertId);
          if (alert.severity) formData.append('severity', alert.severity);
          if (alert.urgency) formData.append('urgency', alert.urgency);
          if (alert.certainty) formData.append('certainty', alert.certainty);
          if (alert.source) formData.append('source', alert.source);
          formData.append('type', 'alert');
          formData.append('isApiMessage', 'true');
          
          // IMPORTANT: Always add location data
          formData.append('location', JSON.stringify(locationData));
          
          // Add the image file
          formData.append('image', fs.createReadStream(tempFilePath), {
            filename: path.basename(tempFilePath),
            contentType: getFileTypeFromPath(tempFilePath)
          });
          
          // Log what we're about to send
          logger.info(`Sending message: "${alert.content.substring(0, 50)}..."`);
          logger.info(`With username: ${username}`);
          logger.info(`With image file: ${tempFilePath}`);
          logger.info(`With location: ${JSON.stringify(locationData)}`);
          
          const response = await axios.post(apiUrl, formData, {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${tokenToUse}`,
              'X-API-Key': apiKey
            }
          });
          
          const imageResult = response.data;
          logger.info(`Successfully posted alert with image: ${alert.title}`);
          return { success: true, data: imageResult };
        } catch (imageError) {
          // If image download or upload fails, fall back to text-only message
          logger.error(`Error with image: ${imageError.message}, falling back to text-only message`);
          
          // Get authentication token
          const authToken = bot.authToken;
          const apiKey = bot.apiKey || API_KEY || 'dev-bot-api-key';
          
          if (!authToken) {
            logger.warn('No auth token available, attempting to authenticate for text-only message');
            if (typeof bot.authenticate === 'function') {
              await bot.authenticate();
            } else {
              logger.error('Bot does not have authenticate method');
              throw new Error('Authentication failed - no token and no authenticate method');
            }
          }
          
          // Make sure we're using the latest token after possible authentication
          const tokenToUse = bot.authToken;
          
          // Make the API request with text only
          const apiUrl = `${MAIN_SERVER_URL}/api/messages`;
          logger.info(`Sending text-only post request to: ${apiUrl}`);
          
          // Create JSON payload for text-only message
          const messageData = {
            message: alert.content,
            title: alert.title,
            alertId: alert.alertId,
            severity: alert.severity,
            urgency: alert.urgency,
            certainty: alert.certainty,
            source: alert.source,
            type: 'alert',
            username: username,
            senderUsername: username,
            sender: username,
            isApiMessage: true,
            // IMPORTANT: Always include location data
            location: locationData
          };
          
          // Log what we're about to send
          logger.info(`Sending text-only message: "${alert.content.substring(0, 50)}..."`);
          logger.info(`With username: ${username}`);
          logger.info(`With location: ${JSON.stringify(locationData)}`);
          
          const response = await axios.post(apiUrl, messageData, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokenToUse}`,
              'X-API-Key': apiKey
            }
          });
          
          const textResult = response.data;
          logger.info(`Successfully posted text-only alert: ${alert.title}`);
          return { success: true, data: textResult };
        }
      } catch (apiError) {
        // Check for rate limiting (429) error
        if (apiError.response && apiError.response.status === 429) {
          logger.warn('Rate limited (429 Too Many Requests)');
          
          // Set rate limited state for future requests
          setRateLimit(apiError);
          
          // Return rate limit info
          return { 
            success: false, 
            error: apiError.response.data?.message || 'Too many requests, please try again later.',
            rateLimited: true,
            retryAfter: Math.ceil(rateLimitState.retryAfter / 1000)
          };
        }
        
        // Handle API errors
        const status = apiError.response?.status;
        const errorData = apiError.response?.data;
        
        logger.error('Error posting to API:');
        logger.error(`API error response status: ${status}`);
        logger.error(`API error response data: ${JSON.stringify(errorData, null, 2)}`);
        
        // Handle authentication errors with token refresh
        if (status === 401 && retryCount < maxRetries) {
          retryCount++;
          logger.info('Received 401 error, attempting to refresh auth token and retry...');
          
          try {
            // Refresh token by re-authenticating
            logger.info('Re-authenticating bot using bot.authenticate method');
            if (typeof bot.authenticate === 'function') {
              const authenticated = await bot.authenticate();
              
              if (authenticated && bot.authToken) {
                logger.info('Successfully refreshed auth token, retrying post...');
                // Continue to next iteration of the loop with the new token
                continue;
              }
            } else {
              logger.error('Bot does not have authenticate method');
            }
          } catch (authError) {
            logger.error(`Error refreshing auth token: ${authError.message}`);
          }
        }
        
        // If we get here, either it's not an auth error or we failed to refresh the token
        logger.error(`Error posting alert: ${apiError.message}`);
        return { success: false, error: apiError.message };
      }
    }
    
    // If we get here, we've exhausted our retries
    return { success: false, error: 'Failed after maximum retries' };
  } catch (error) {
    logger.error(`Error in publishAlertToChannel: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    // Clean up temp file if it exists
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        logger.debug('Temporary image file deleted');
      }
    } catch (cleanupError) {
      logger.error(`Error cleaning up temp file: ${cleanupError.message}`);
    }
  }
}

/**
 * Publish an alert to a specific user
 * @param {Object} alert - Formatted alert
 * @param {Object} user - User to send alert to
 * @param {Object|null} bot - Bot instance (optional)
 * @returns {Promise<Object>} - Response object
 */
async function publishAlertToUser(alert, user, bot = null) {
  let tempFilePath = null;
  
  try {
    // Check if we're rate limited
    if (isRateLimited()) {
      logger.warn(`Skipping post due to active rate limiting: ${alert.title}`);
      return { 
        success: false, 
        error: 'Rate limited, try again later', 
        rateLimited: true,
        retryAfter: Math.ceil((rateLimitState.retryAfter - (Date.now() - rateLimitState.lastRateLimitTime)) / 1000)
      };
    }
    
    // Ensure we have a valid bot instance
    if (!bot) {
      logger.error('No bot instance provided for publishing direct message');
      return { success: false, error: 'No bot instance provided' };
    }
    
    // Get the bot's username
    const username = bot.username || 'WeatherBot';
    logger.info(`Publishing direct message as user: ${username}`);
    
    // Prepare location data
    let locationData = null;
    if (user.location) {
      locationData = {
        latitude: user.location.latitude,
        longitude: user.location.longitude,
        fuzzyLocation: true
      };
      logger.info(`Using user location data: ${JSON.stringify(locationData)}`);
    } else if (alert.coordinates) {
      locationData = {
        longitude: alert.coordinates.longitude,
        latitude: alert.coordinates.latitude,
        fuzzyLocation: true
      };
      logger.info(`Using alert location data: ${JSON.stringify(locationData)}`);
    } else {
      // Default to New York coordinates if none provided
      locationData = {
        longitude: -74.0060,
        latitude: 40.7128,
        fuzzyLocation: true
      };
      logger.info(`No coordinates in alert or user, using default location: ${JSON.stringify(locationData)}`);
    }
    
    // Get the image URL for the icon
    let imageUrl = null;
    if (alert.icon) {
      imageUrl = getIconImageUrl(alert.icon);
      logger.info(`Using image URL for icon: ${imageUrl}`);
    } else {
      logger.warn('No icon provided in alert, using default warning icon');
      imageUrl = 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=500&auto=format&fit=crop';
    }
    
    // Set up retry mechanism
    const maxRetries = 1;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        // Try to download the image
        logger.info(`Downloading image for direct message: ${imageUrl}`);
        try {
          tempFilePath = await downloadImage(imageUrl);
          
          if (!tempFilePath) {
            throw new Error('Image download failed - no tempFilePath');
          }
          
          const stats = fs.statSync(tempFilePath);
          const fileSize = stats.size;
          const fileType = getFileTypeFromPath(tempFilePath);
          
          logger.info(`Preparing direct message image upload with content type: ${fileType}, size: ${fileSize} bytes`);
          
          // Get authentication token
          const authToken = bot.authToken;
          const apiKey = bot.apiKey || API_KEY || 'dev-bot-api-key';
          
          if (!authToken) {
            logger.warn('No auth token available for direct message, attempting to authenticate');
            if (typeof bot.authenticate === 'function') {
              await bot.authenticate();
            } else {
              logger.error('Bot does not have authenticate method');
              throw new Error('Authentication failed - no token and no authenticate method');
            }
          }
          
          // Make sure we're using the latest token after possible authentication
          const tokenToUse = bot.authToken;
          
          logger.info('Using bot.authToken for direct message authentication');
          
          // Make the API request with image
          const apiUrl = `${MAIN_SERVER_URL}/api/messages/direct-with-image`;
          logger.info(`Sending direct message post request to: ${apiUrl}`);
          logger.info(`Direct message request headers: Auth=${tokenToUse ? 'Present' : 'Missing'}, API Key=${apiKey ? 'Present' : 'Missing'}`);
          
          // Create a multipart form data request
          const formData = new FormData();
          
          // Add the message content
          formData.append('message', alert.content);
          formData.append('title', alert.title);
          formData.append('recipientId', user.userId);
          
          // Add socketId field which is required by the API
          const socketId = `weatherbot_dm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          formData.append('socketId', socketId);
          
          // Add username fields
          formData.append('username', username);
          formData.append('senderUsername', username);
          formData.append('sender', username);
          
          // Add other alert metadata
          if (alert.alertId) formData.append('alertId', alert.alertId);
          if (alert.severity) formData.append('severity', alert.severity);
          if (alert.urgency) formData.append('urgency', alert.urgency);
          if (alert.certainty) formData.append('certainty', alert.certainty);
          if (alert.source) formData.append('source', alert.source);
          formData.append('type', 'alert');
          formData.append('isApiMessage', 'true');
          
          // IMPORTANT: Always add location data
          formData.append('location', JSON.stringify(locationData));
          
          // Add the image file
          formData.append('image', fs.createReadStream(tempFilePath), {
            filename: path.basename(tempFilePath),
            contentType: getFileTypeFromPath(tempFilePath)
          });
          
          // Log what we're about to send
          logger.info(`Sending direct message: "${alert.content.substring(0, 50)}..."`);
          logger.info(`To user: ${user.userId}`);
          logger.info(`With username: ${username}`);
          logger.info(`With image file: ${tempFilePath}`);
          logger.info(`With location: ${JSON.stringify(locationData)}`);
          
          const response = await axios.post(apiUrl, formData, {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${tokenToUse}`,
              'X-API-Key': apiKey
            }
          });
          
          const imageResult = response.data;
          logger.info(`Successfully posted direct message with image to user ${user.userId}: ${alert.title}`);
          return { success: true, data: imageResult };
        } catch (imageError) {
          // If image download or upload fails, fall back to text-only message
          logger.error(`Error with direct message image: ${imageError.message}, falling back to text-only message`);
          
          // Get authentication token
          const authToken = bot.authToken;
          const apiKey = bot.apiKey || API_KEY || 'dev-bot-api-key';
          
          if (!authToken) {
            logger.warn('No auth token available, attempting to authenticate for text-only direct message');
            if (typeof bot.authenticate === 'function') {
              await bot.authenticate();
            } else {
              logger.error('Bot does not have authenticate method');
              throw new Error('Authentication failed - no token and no authenticate method');
            }
          }
          
          // Make sure we're using the latest token after possible authentication
          const tokenToUse = bot.authToken;
          
          // Make the API request with text only
          const apiUrl = `${MAIN_SERVER_URL}/api/messages/direct`;
          logger.info(`Sending text-only direct message post request to: ${apiUrl}`);
          
          // Create JSON payload for text-only message
          const messageData = {
            message: alert.content,
            title: alert.title,
            alertId: alert.alertId,
            recipientId: user.userId,
            severity: alert.severity,
            urgency: alert.urgency,
            certainty: alert.certainty,
            source: alert.source,
            type: 'alert',
            username: username,
            senderUsername: username,
            sender: username,
            isApiMessage: true,
            // IMPORTANT: Always include location data
            location: locationData
          };
          
          // Log what we're about to send
          logger.info(`Sending text-only direct message: "${alert.content.substring(0, 50)}..."`);
          logger.info(`To user: ${user.userId}`);
          logger.info(`With username: ${username}`);
          logger.info(`With location: ${JSON.stringify(locationData)}`);
          
          const response = await axios.post(apiUrl, messageData, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokenToUse}`,
              'X-API-Key': apiKey
            }
          });
          
          const textResult = response.data;
          logger.info(`Successfully posted text-only direct message to user ${user.userId}: ${alert.title}`);
          return { success: true, data: textResult };
        }
      } catch (apiError) {
        // Check for rate limiting (429) error
        if (apiError.response && apiError.response.status === 429) {
          logger.warn('Rate limited (429 Too Many Requests) for direct message');
          
          // Set rate limited state for future requests
          setRateLimit(apiError);
          
          // Return rate limit info
          return { 
            success: false, 
            error: apiError.response.data?.message || 'Too many requests, please try again later.',
            rateLimited: true,
            retryAfter: Math.ceil(rateLimitState.retryAfter / 1000)
          };
        }
        
        // Handle API errors
        const status = apiError.response?.status;
        const errorData = apiError.response?.data;
        
        logger.error('Error posting direct message to API:');
        logger.error(`API error response status: ${status}`);
        logger.error(`API error response data: ${JSON.stringify(errorData, null, 2)}`);
        
        // Handle authentication errors with token refresh
        if (status === 401 && retryCount < maxRetries) {
          retryCount++;
          logger.info('Received 401 error for direct message, attempting to refresh auth token and retry...');
          
          try {
            // Refresh token by re-authenticating
            logger.info('Re-authenticating bot for direct message using bot.authenticate method');
            if (typeof bot.authenticate === 'function') {
              const authenticated = await bot.authenticate();
              
              if (authenticated && bot.authToken) {
                logger.info('Successfully refreshed auth token for direct message, retrying post...');
                // Continue to next iteration of the loop with the new token
                continue;
              }
            } else {
              logger.error('Bot does not have authenticate method for direct message');
            }
          } catch (authError) {
            logger.error(`Error refreshing auth token for direct message: ${authError.message}`);
          }
        }
        
        // If we get here, either it's not an auth error or we failed to refresh the token
        logger.error(`Error posting direct message: ${apiError.message}`);
        return { success: false, error: apiError.message };
      }
    }
    
    // If we get here, we've exhausted our retries
    return { success: false, error: 'Failed after maximum retries for direct message' };
  } catch (error) {
    logger.error(`Error in publishAlertToUser: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    // Clean up temp file if it exists
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        logger.debug('Temporary direct message image file deleted');
      }
    } catch (cleanupError) {
      logger.error(`Error cleaning up direct message temp file: ${cleanupError.message}`);
    }
  }
}

/**
 * Publish an alert to multiple users
 * @param {Object} alert - Formatted alert
 * @param {Array} users - Array of users to send alert to
 * @param {Object|null} bot - Bot instance (optional)
 * @returns {Promise<Object>} - Response object
 */
async function publishAlertToUsers(alert, users, bot = null) {
  if (!users || !Array.isArray(users) || users.length === 0) {
    logger.warn('No users provided for alert distribution');
    return { success: false, error: 'No users provided' };
  }
  
  logger.info(`Publishing alert to ${users.length} users`);
  
  const results = {
    success: true,
    total: users.length,
    sent: 0,
    failed: 0,
    details: []
  };
  
  // Process each user
  for (const user of users) {
    try {
      const result = await publishAlertToUser(alert, user, bot);
      
      if (result.success) {
        results.sent++;
        results.details.push({
          userId: user.userId,
          success: true
        });
      } else {
        results.failed++;
        results.details.push({
          userId: user.userId,
          success: false,
          error: result.error
        });
        
        // If we hit a rate limit, stop processing more users
        if (result.rateLimited) {
          logger.warn(`Rate limited while sending to user ${user.userId}, pausing remaining sends`);
          results.rateLimited = true;
          results.retryAfter = result.retryAfter;
          break;
        }
      }
    } catch (error) {
      logger.error(`Error sending alert to user ${user.userId}: ${error.message}`);
      results.failed++;
      results.details.push({
        userId: user.userId,
        success: false,
        error: error.message
      });
    }
  }
  
  // Update overall success flag
  results.success = results.failed === 0;
  
  logger.info(`Alert distribution complete: ${results.sent} sent, ${results.failed} failed`);
  return results;
}

// Module exports
module.exports = {
  publishAlertToChannel,
  publishAlertToUser,
  publishAlertToUsers,
  downloadImage,
  getIconImageUrl
}; 