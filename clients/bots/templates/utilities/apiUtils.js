/**
 * API Utility Functions
 * 
 * A collection of reusable functions for handling API requests,
 * data processing, and content formatting.
 */

const axios = require('axios');

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
  } = options;
  
  let attempts = 0;
  
  while (attempts <= maxRetries) {
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
      
      return response;
    } catch (error) {
      attempts++;
      
      // Special handling for rate limiting (429)
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] 
          ? parseInt(error.response.headers['retry-after'], 10) * 1000 
          : 5000; // Default to 5 seconds if no Retry-After header
        
        console.log(`Rate limit exceeded (429). Waiting ${retryAfter/1000} seconds before retry ${attempts}/${maxRetries}`);
        
        // If this is our last attempt, don't wait just to fail
        if (attempts <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          continue;
        }
      }
      // Check if we should retry other errors
      else if (attempts <= maxRetries && shouldRetry(error)) {
        console.log(`API request failed (attempt ${attempts}/${maxRetries}): ${error.message}`);
        
        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempts - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If we've exhausted retries or shouldn't retry, throw the error
      throw error;
    }
  }
};

/**
 * Determine if a failed request should be retried
 *
 * @param {Error} error - The error that occurred
 * @returns {boolean} - Whether to retry the request
 */
const shouldRetry = (error) => {
  // Retry on network errors
  if (!error.response) {
    return true;
  }
  
  // Retry on certain status codes
  const retryStatusCodes = [429, 500, 502, 503, 504];
  return retryStatusCodes.includes(error.response.status);
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
    console.log(`Fixing image URL format: ${imageUrl}`);
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
    console.log(`${uniqueSourcesMessage} ${uniqueSources.join(', ')}`);
  }
  
  // Log the countries if available
  if (debug && results.some(item => item.country)) {
    const countries = results
      .map(item => item.country && item.country.length > 0 ? item.country[0] : null)
      .filter(Boolean);
    const uniqueCountries = [...new Set(countries)];
    
    if (uniqueCountries.length > 0) {
      console.log(`${uniqueCountriesMessage} ${uniqueCountries.join(', ')}`);
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
    if (retries > 0 && error.response) {
      // Retry on certain status codes
      if ([429, 503, 502, 500, 422].includes(error.response.status)) {
        console.log(`Request failed with status ${error.response.status}. Retrying... (${retries} attempts left)`);
        
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
  formatContentWithUrl
}; 