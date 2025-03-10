/**
 * News Bot - Publisher
 * Handles posting news items to the platform
 */
const { logger } = require('../../utils');
const authService = require('../../utils/authService');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

// Server configuration
const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'http://localhost:3000';
const API_KEY = process.env.BOT_API_KEY || process.env.API_KEY;

// Log configuration for debugging
if (!process.env.MAIN_SERVER_URL) {
  logger.warn('MAIN_SERVER_URL not found in environment, using default: http://localhost:3000');
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
function setRateLimited(retryAfterHeader) {
  // Parse retry-after header or default to 60 seconds
  let retryAfter = 60 * 1000; // Default 60 seconds
  
  if (retryAfterHeader) {
    // If retry-after is in seconds
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
 * Post a news item with an image to the platform
 * @param {string} content - Formatted content text
 * @param {string} imageUrl - URL of the image to download and attach
 * @param {Object} location - Location data (optional)
 * @param {Object} config - Bot configuration
 * @param {Object} bot - Bot instance for authentication
 * @returns {Object} - Post result
 */
async function postNewsWithImage(bot, newsItem, imageUrl) {
  let tempFilePath = null;
  // Define apiUrl at the beginning of the function so it's available in all scopes
  const apiUrl = `${MAIN_SERVER_URL}/api/messages/with-image`;
  
  try {
    // Validate inputs
    if (!bot) {
      throw new Error('Invalid bot instance');
    }
    
    if (!newsItem) {
      throw new Error('Invalid news item');
    }
    
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      throw new Error('Invalid image URL');
    }
    
    // Check if we're currently rate limited
    if (isRateLimited()) {
      return { 
        success: false, 
        error: 'Rate limited, please try again later',
        rateLimited: true,
        retryAfter: Math.ceil(rateLimitState.retryAfter / 1000)
      };
    }
    
    // Download the image
    logger.info(`Downloading image: ${imageUrl}`);
    tempFilePath = await downloadImage(imageUrl);
    
    // Set up retry mechanism
    const maxRetries = 1;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        if (!tempFilePath) {
          throw new Error('Image download failed - no tempFilePath');
        }
        
        const stats = fs.statSync(tempFilePath);
        const fileSize = stats.size;
        const fileType = getFileTypeFromPath(tempFilePath);
        
        logger.info(`Preparing image upload with content type: ${fileType}, size: ${fileSize} bytes`);
        
        // Get authentication token
        let authToken = bot.authToken;
        const apiKey = bot.apiKey || process.env.BOT_API_KEY || 'dev-bot-api-key';
        
        if (!authToken) {
          logger.warn('No auth token available, attempting to authenticate');
          if (typeof bot.authenticate === 'function') {
            const authenticated = await bot.authenticate();
            if (!authenticated) {
              logger.error('Authentication failed');
              throw new Error('Authentication failed - could not get token');
            }
            authToken = bot.authToken;
          } else {
            // Try to get a token from authService directly
            try {
              const auth = await authService.authenticateBot(bot._id, apiKey);
              if (auth && auth.success && auth.token) {
                authToken = auth.token;
                bot.authToken = authToken; // Store for future use
              } else {
                logger.error('Authentication failed via authService');
                throw new Error('Authentication failed - no token and authentication service failed');
              }
            } catch (authError) {
              logger.error(`Error authenticating via authService: ${authError.message}`);
              throw new Error('Authentication failed - authService error');
            }
          }
        }
        
        // Make sure we have a token after authentication attempts
        if (!authToken) {
          logger.error('Failed to obtain authentication token after all attempts');
          throw new Error('Authentication failed - could not obtain token');
        }
        
        logger.info('Using authentication token for request');
        
        // Make the API request
        logger.info(`Sending post request to: ${apiUrl}`);
        logger.info(`Request headers: Auth=${authToken ? 'Present' : 'Missing'}, API Key=${apiKey ? 'Present' : 'Missing'}`);
        
        // Extract message content from newsItem 
        const messageText = typeof newsItem.formattedContent === 'string' 
          ? newsItem.formattedContent 
          : (newsItem.formattedContent?.content || newsItem.title || 'News update');
        
        // Create a direct multipart form data request
        const directForm = new FormData();
        
        // Add the critical message field
        directForm.append('message', messageText);
        
        // Add socketId field which is required
        const socketId = `newsbot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        directForm.append('socketId', socketId);
        
        // Add username
        const username = (bot && bot.username) ? bot.username : 'NewsBot';
        directForm.append('username', username);
        
        // Add location if available
        if (newsItem.location) {
          directForm.append('location', JSON.stringify({
            latitude: newsItem.location.latitude,
            longitude: newsItem.location.longitude,
            fuzzyLocation: true
          }));
        }
        
        // Add the image file
        directForm.append('image', fs.createReadStream(tempFilePath), {
          filename: path.basename(tempFilePath),
          contentType: getFileTypeFromPath(tempFilePath)
        });
        
        // Log what we're about to send
        logger.info(`Sending message: "${messageText.substring(0, 50)}..."`);
        logger.info(`With username: ${username}`);
        logger.info(`With image file: ${tempFilePath}`);
        
        const response = await axios.post(apiUrl, directForm, {
          headers: {
            ...directForm.getHeaders(),
            'Authorization': `Bearer ${authToken}`,
            'X-API-Key': apiKey
          }
        });
        
        const imageResult = response.data;
        logger.info(`Successfully posted news with image: ${newsItem.title}`);
        return imageResult;
      } catch (apiError) {
        // Check for rate limiting (429) error
        if (apiError.response && apiError.response.status === 429) {
          logger.warn('Rate limited (429 Too Many Requests)');
          
          // Set rate limited state for future requests
          setRateLimited(apiError.response.headers['retry-after']);
          
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
                
                // Make sure tempFilePath is still valid
                if (!tempFilePath || !fs.existsSync(tempFilePath)) {
                  logger.error('Temp file no longer available for retry');
                  // Try to re-download the image
                  try {
                    tempFilePath = await downloadImage(imageUrl);
                  } catch (redownloadError) {
                    logger.error(`Error re-downloading image: ${redownloadError.message}`);
                    throw new Error('Failed to re-download image for retry');
                  }
                }
                
                // Create a new form data with the temp file path (not buffer)
                const retryFormData = prepareImageFormData(newsItem.formattedContent || newsItem, tempFilePath, newsItem.location, bot);
                
                // Make the retry request
                logger.info('Sending retry request with new token');
                
                // Extract message content from newsItem for retry
                const retryMessageText = typeof newsItem.formattedContent === 'string' 
                  ? newsItem.formattedContent 
                  : (newsItem.formattedContent?.content || newsItem.title || 'News update');
                
                // Create a direct multipart form data request for retry
                const retryDirectForm = new FormData();
                
                // Add the critical fields
                retryDirectForm.append('message', retryMessageText);
                const retrySocketId = `newsbot_retry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                retryDirectForm.append('socketId', retrySocketId);
                retryDirectForm.append('username', (bot && bot.username) ? bot.username : 'NewsBot');
                
                // Add location if available
                if (newsItem.location) {
                  retryDirectForm.append('location', JSON.stringify({
                    latitude: newsItem.location.latitude,
                    longitude: newsItem.location.longitude,
                    fuzzyLocation: true
                  }));
                }
                
                // Add the image file for retry
                retryDirectForm.append('image', fs.createReadStream(tempFilePath), {
                  filename: path.basename(tempFilePath),
                  contentType: getFileTypeFromPath(tempFilePath)
                });
                
                // Get the current token after re-authentication
                const currentToken = bot.authToken;
                
                // Send the retry request
                const retryResponse = await axios.post(apiUrl, retryDirectForm, {
                  headers: {
                    ...retryDirectForm.getHeaders(),
                    'Authorization': `Bearer ${currentToken}`,
                    'X-API-Key': bot.apiKey || process.env.BOT_API_KEY || 'dev-bot-api-key'
                  }
                });
                
                const retryResult = retryResponse.data;
                logger.info(`Retry successful for news item: ${newsItem.title}`);
                return retryResult;
              } else {
                logger.error('Token refresh failed - could not get new token');
              }
            } else {
              logger.error('Cannot refresh token - bot does not have authenticate method');
            }
          } catch (retryError) {
            logger.error(`Error during token refresh: ${retryError.message}`);
          }
        }
        
        // If we get here, throw the error to be caught by the outer try/catch
        throw new Error(errorData?.message || apiError.message || 'Error posting with image');
      }
    }
  } catch (error) {
    logger.error(`Failed to post news item: ${newsItem.title} - ${error.message}`);
    throw error;
  } finally {
    // Clean up temp file
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
 * Download an image from a URL to a temporary file
 * @param {string} url - The image URL
 * @returns {Promise<string>} - The path to the temporary file
 */
async function downloadImage(url) {
  try {
    logger.info(`Downloading image: ${url}`);
    
    // Create a temporary file path
    const extension = getExtensionFromUrl(url) || 'jpg';
    const tempFilePath = path.join(os.tmpdir(), `news_img_${Date.now()}.${extension}`);
    
    // Create a write stream
    const writer = fs.createWriteStream(tempFilePath);
    
    // Download the image
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 15000, // 15 seconds
      headers: {
        'User-Agent': 'NewsBot/1.0'
      }
    });
    
    // Check if we got a valid image response
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }
    
    // Pipe the image data to the file
    response.data.pipe(writer);
    
    // Return a promise that resolves when the file is written
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(tempFilePath));
      writer.on('error', (err) => {
        fs.unlink(tempFilePath, () => {}); // Clean up on error
        reject(err);
      });
    });
  } catch (error) {
    logger.error(`Error downloading image: ${error.message}`);
    throw error;
  }
}

/**
 * Get file extension from URL
 * @param {string} url - The URL to extract extension from
 * @returns {string} - The file extension
 */
function getExtensionFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const extension = pathname.split('.').pop().toLowerCase();
    
    // Check if it's a valid image extension
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    return validExtensions.includes(extension) ? extension : 'jpg';
  } catch (error) {
    return 'jpg'; // Default to jpg
  }
}

/**
 * Get file type based on file path extension
 * @param {string} filePath - Path to the file
 * @returns {string} - The mime type
 */
function getFileTypeFromPath(filePath) {
  const extension = path.extname(filePath).toLowerCase().substring(1);
  
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Prepare form data for image submission
 * @param {string|Object} content - Message content or news item object
 * @param {string} imagePath - Path to the local image file
 * @param {Object|null} location - Location data
 * @param {Object|null} bot - Bot instance
 * @returns {FormData} - Prepared form data
 */
function prepareImageFormData(content, imagePath, location = null, bot = null) {
  try {
    const formData = new FormData();
    
    // Debug what content we have
    logger.info('prepareImageFormData content type: ' + typeof content);
    logger.info('prepareImageFormData content: ' + JSON.stringify(content, null, 2).substring(0, 200) + '...');
    
    // Extract the actual message text
    let messageText = '';
    if (typeof content === 'string') {
      messageText = content;
    } else if (content.content) {
      messageText = content.content;
    } else if (content.text) {
      messageText = content.text;
    } else if (content.title) {
      messageText = content.title;
    }
    
    logger.info('Message text to be sent: ' + messageText);
    
    // Add the message content - THIS IS THE CRITICAL FIELD REQUIRED BY THE API
    formData.append('message', messageText);
    
    // Add title and source if available
    if (content.title) {
      formData.append('title', content.title);
    }
    
    if (content.source) {
      formData.append('source', content.source);
    }
    
    if (content.url) {
      formData.append('sourceUrl', content.url);
    }
    
    // Generate message ID if not provided
    const messageId = content.messageId || `news_img_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Use bot username if provided, otherwise default to 'NewsBot'
    const username = (bot && bot.username) ? bot.username : 'NewsBot';
    
    // Add required message metadata
    formData.append('username', username);
    formData.append('senderUsername', username);
    formData.append('messageId', messageId);
    formData.append('isApiMessage', 'true');
    formData.append('sequence', '0');
    formData.append('isResend', 'false');
    formData.append('type', 'post');
    formData.append('source', 'api');
    formData.append('likes', '0');
    formData.append('hasLink', content.url ? 'true' : 'false');
    
    // Add a generated socketId for tracking and consistency
    const botSocketId = `bot_${username}_${Date.now()}`;
    formData.append('socketId', botSocketId);
    
    // Add location if available
    if (location) {
      // Create location data object with the proper structure
      const locationData = {};
      
      if (location.latitude && location.longitude) {
        locationData.latitude = location.latitude;
        locationData.longitude = location.longitude;
        
        // Always include fuzzyLocation flag
        locationData.fuzzyLocation = location.fuzzyLocation !== undefined ?
          location.fuzzyLocation : true;
        
        if (location.name) {
          locationData.locationName = location.name;
        }
        
        // Append location as JSON string (required format for the server)
        formData.append('location', JSON.stringify(locationData));
        logger.info(`Adding location data to form: ${JSON.stringify(locationData)}`);
      }
    }
    
    // Add the image
    const fileName = path.basename(imagePath);
    formData.append('image', fs.createReadStream(imagePath), {
      filename: fileName,
      contentType: getFileTypeFromPath(imagePath)
    });
    
    return formData;
  } catch (error) {
    logger.error(`Error preparing form data: ${error.message}`);
    throw error;
  }
}

/**
 * Post news item without an image - This will now skip these items
 * @param {Object} bot - The bot instance
 * @param {Object} newsItem - The news item to post
 * @returns {Promise<Object>} - Response object
 */
async function postNewsItem(bot, newsItem) {
  // Check if we're currently rate limited
  if (isRateLimited()) {
    logger.warn(`Skipping post due to active rate limiting: ${newsItem.title}`);
    return { 
      success: false, 
      error: 'Rate limited, try again later', 
      rateLimited: true,
      retryAfter: Math.ceil((rateLimitState.retryAfter - (Date.now() - rateLimitState.lastRateLimitTime)) / 1000)
    };
  }
  
  try {
    logger.info(`No image available for news item: ${newsItem.title || 'untitled'} - skipping`);
    
    // Skip news items without images
    return { 
      success: false, 
      error: 'News item has no image - skipping as per configuration', 
      skipped: true 
    };
  } catch (error) {
    logger.error(`Error processing news item: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  postNewsWithImage,
  downloadImage,
  postNewsItem
};