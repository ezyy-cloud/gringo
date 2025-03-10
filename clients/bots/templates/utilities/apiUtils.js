/**
 * API Utility Functions
 * 
 * A collection of reusable functions for handling API requests,
 * data processing, and content formatting.
 */

const axios = require('axios');
const { logger } = require('../../utils');

/**
 * Safely stringify an object, handling circular references
 * 
 * @param {Object} obj - The object to stringify
 * @returns {string} - JSON string representation of the object
 */
const safeStringify = (obj) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    // Skip null and undefined values
    if (value === null || value === undefined) {
      return value;
    }
    
    // Handle circular references
    if (typeof value === 'object') {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    
    // Handle Error objects
    if (value instanceof Error) {
      return {
        message: value.message,
        name: value.name,
        stack: value.stack,
        code: value.code
      };
    }
    
    return value;
  }, 2);
};

/**
 * Make an API request with retry capabilities
 *
 * @param {Object} options - Request options
 * @param {string} options.url - URL to request
 * @param {string} options.method - HTTP method (GET, POST, etc.)
 * @param {Object} options.params - URL parameters
 * @param {Object} options.data - Request body for POST requests
 * @param {Object} options.headers - Request headers
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.retryDelay - Delay between retries in ms
 * @param {boolean} options.logResponse - Whether to log the response
 * @returns {Object} - Response data
 */
const makeRequest = async (options) => {
  const {
    url,
    method = 'GET',
    params = {},
    data = null,
    headers = {},
    maxRetries = 3,
    retryDelay = 1000,
    logResponse = false
  } = options;
  
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      // Make the request with axios
      const response = await axios({
        url,
        method,
        params,
        data,
        headers,
        timeout: 10000 // 10 second timeout
      });
      
      if (logResponse) {
        logger.debug(`API Response (${url}):`, response.data);
      }
      
      // Log the full response structure for debugging
      logger.info(`API response structure: ${Object.keys(response).join(', ')}`);
      
      // Return the full response object instead of just response.data
      return response;
    } catch (error) {
      attempts++;
      
      // Check if we should retry
      if (attempts >= maxRetries) {
        throw error;
      }
      
      // Handle rate limiting (429)
      if (error.response && error.response.status === 429) {
        // Get retry-after header or use default delay
        const retryAfter = (error.response.headers['retry-after'] * 1000) || retryDelay * Math.pow(2, attempts);
        
        logger.info(`Rate limit exceeded (429). Waiting ${retryAfter/1000} seconds before retry ${attempts}/${maxRetries}`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        continue;
      }
      
      // For other errors, use exponential backoff
      const delay = retryDelay * Math.pow(2, attempts - 1);
      
      // Create a detailed error log
      const errorDetails = {
        message: error.message,
        name: error.name,
        code: error.code
      };
      
      // Add response details if available
      if (error.response) {
        errorDetails.response = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
      }
      
      logger.info(`API request failed (attempt ${attempts}/${maxRetries}): ${safeStringify(errorDetails)}`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts`);
};

/**
 * Validate and fix image URLs
 * 
 * @param {string} imageUrl - The image URL to validate
 * @return {string} - The validated image URL
 */
const validateImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // Fix URL format if needed
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    logger.info(`Fixing image URL format: ${imageUrl}`);
    imageUrl = 'https://' + imageUrl.replace(/^\/\//, '');
  }
  
  return imageUrl;
};

/**
 * Transform API response into standard format
 * 
 * @param {Array} results - API response items
 * @param {Object} options - Transformation options
 * @returns {Array} - Transformed items
 */
const processApiResults = (results, options = {}) => {
  const { 
    debug = false,
    transformItem = null,
    uniqueSourcesMessage = 'Received data from sources:',
    uniqueCountriesMessage = 'Received data from countries:'
  } = options;
  
  if (!results || !Array.isArray(results)) {
    return [];
  }
  
  // Log the sources to help debug
  if (debug && results.some(item => item.source_id)) {
    const sources = results.map(item => item.source_id).filter(Boolean);
    const uniqueSources = [...new Set(sources)];
    logger.info(`${uniqueSourcesMessage} ${uniqueSources.join(', ')}`);
  }
  
  // Log the countries if available
  if (debug && results.some(item => item.country)) {
    const countries = results
      .map(item => item.country && item.country.length > 0 ? item.country[0] : null)
      .filter(Boolean);
    const uniqueCountries = [...new Set(countries)];
    
    if (uniqueCountries.length > 0) {
      logger.info(`${uniqueCountriesMessage} ${uniqueCountries.join(', ')}`);
    }
  }
  
  // Use custom transform function if provided, otherwise return results as is
  return transformItem ? results.map(transformItem) : results;
};

/**
 * Download data from a URL with auto-retry on certain errors
 *
 * @param {string} url - The URL to download from
 * @param {Object} options - Request options
 * @param {number} retries - Number of retries allowed
 * @returns {Object} - Response data
 */
const downloadWithRetry = async (url, options = {}, retries = 2) => {
  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    // Create a detailed error object for logging
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code
    };
    
    // Add response details if available
    if (error.response) {
      errorDetails.response = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
    }
    
    // Log the detailed error
    logger.error(`Download error for URL ${url}: ${safeStringify(errorDetails)}`);
    
    if (retries > 0 && error.response) {
      // Retry on certain status codes
      if ([429, 503, 502, 500, 422].includes(error.response.status)) {
        logger.info(`Request failed with status ${error.response.status}. Retrying... (${retries} attempts left)`);
        
        // Wait before retry with exponential backoff (1s, 2s, 4s...)
        const delay = 1000 * Math.pow(2, 3 - retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Try with minimal parameters for 422 errors specifically
        if (error.response.status === 422 && options.params) {
          const minimalParams = {
            ...options.params,
            // Keep only essential parameters
            country: undefined,
            timeframe: undefined
          };
          
          return downloadWithRetry(url, { ...options, params: minimalParams }, retries - 1);
        }
        
        return downloadWithRetry(url, options, retries - 1);
      }
    }
    
    // Re-throw the error if we can't handle it
    throw error;
  }
};

/**
 * Format content to fit within character limit
 * 
 * @param {string} title - Content title 
 * @param {string} url - URL to append
 * @param {string} source - Content source
 * @param {number} maxChars - Maximum characters allowed
 * @returns {string} - Formatted content string
 */
const formatContentWithUrl = (title, url, source = null, maxChars = 120) => {
  // Add prefix and source attribution if provided
  const prefix = '';
  const sourcePart = source ? ` via ${source}` : '';
  
  // Add URL, calculating its display length as 23 characters (shortened URL)
  const urlPart = url ? ` ${url}` : '';
  const urlDisplayLength = url ? 23 : 0;
  
  // Calculate available characters for content
  const availableChars = maxChars - prefix.length - sourcePart.length - urlDisplayLength;
  
  let contentText = title;
  
  // Ensure the content is within limit
  if (contentText.length > availableChars) {
    contentText = contentText.substring(0, availableChars - 3) + '...';
  }
  
  // Assemble the full message with the URL part added after truncation
  return prefix + contentText + sourcePart + urlPart;
};

module.exports = {
  makeRequest,
  validateImageUrl,
  processApiResults,
  downloadWithRetry,
  formatContentWithUrl,
  safeStringify
}; 