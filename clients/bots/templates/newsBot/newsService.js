/**
 * News Service
 * Handles fetching news from external APIs and processing news items
 */
const { logger } = require('../../utils');
const axios = require('axios');
const apiUtils = require('../utilities/apiUtils');
const cacheUtils = require('../utilities/cacheUtils');
const newsPublisher = require('./newsPublisher');
const countryUtils = require('./countryUtils');

// News API configuration - using latest endpoint
const NEWSDATA_API_URL = 'https://newsdata.io/api/1/latest';

// Create a cache for news items
const newsCache = cacheUtils.createCache({
  name: 'NewsCache',
  maxSize: 100,
  ttl: 30 * 60 * 1000 // 30 minutes (increased from 10 minutes)
});

// Cache for storing news by country/language/category
const newsByCountryCache = {};

// Cache TTL for country-specific news (30 minutes)
const COUNTRY_CACHE_TTL = 30 * 60 * 1000;

// Reduce cache expiration time to ensure fresh news
const CACHE_EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2 hours (down from 24 hours)

// Function to check if a country cache entry is expired
const isCountryCacheExpired = (cacheKey) => {
  if (!newsByCountryCache[cacheKey]) return true;
  
  const cacheAge = Date.now() - newsByCountryCache[cacheKey].timestamp;
  return cacheAge > CACHE_EXPIRY_TIME;
};

// Function to clean up expired cache entries
const cleanupExpiredCache = () => {
  const now = Date.now();
  let expiredCount = 0;
  let totalCount = 0;
  
  // Get all cache keys
  const cacheKeys = Object.keys(newsByCountryCache);
  totalCount = cacheKeys.length;
  
  // Remove expired entries
  cacheKeys.forEach(key => {
    if (isCountryCacheExpired(key)) {
      delete newsByCountryCache[key];
      expiredCount++;
    }
  });
  
  // If we have too many entries, remove oldest ones even if not expired
  const MAX_CACHE_ENTRIES = 50; // Limit cache size
  if (Object.keys(newsByCountryCache).length > MAX_CACHE_ENTRIES) {
    // Sort by timestamp (oldest first)
    const sortedEntries = Object.entries(newsByCountryCache)
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    // Remove oldest entries until we're under the limit
    const entriesToRemove = sortedEntries.length - MAX_CACHE_ENTRIES;
    for (let i = 0; i < entriesToRemove; i++) {
      const [key] = sortedEntries[i];
      delete newsByCountryCache[key];
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    logger.info(`Cleaned up ${expiredCount}/${totalCount} cache entries`);
  }
};

// Run cache cleanup every 15 minutes
setInterval(cleanupExpiredCache, 15 * 60 * 1000);

// Additional configuration for advanced news filtering
const NEWS_API_CONFIG = {
  // Default values for API parameters
  defaultSize: 10,             // Number of results per request
  defaultTimeframe: 6,         // Last 6 hours
  defaultPriorityDomain: 'top', // Use top quality news sources
  defaultFullContent: 0,        // Don't include full content to save bandwidth
  defaultImage: 1,              // Only return news with images
  defaultRemoveDuplicate: 1,    // Remove duplicate articles
};

/**
 * Process news update
 * 
 * @param {Object} bot - The bot instance
 * @returns {Object} - Processing result
 */
async function processNewsUpdate(bot) {
  logger.info('Processing scheduled news update');
  
  try {
    // Ensure bot has a config object
    if (!bot.config) {
      bot.config = {};
    }
    
    // Add rate limiting configuration
    bot.config.maxCountriesPerBatch = bot.config.maxCountriesPerBatch || 3;
    
    // Authenticate the bot before posting news
    let authenticated = false;
    if (typeof bot.authenticate === 'function') {
      logger.info('Authenticating bot before posting news...');
      try {
        // Try authentication only once with a timeout to prevent hanging
        authenticated = await Promise.race([
          bot.authenticate(),
          new Promise(resolve => setTimeout(() => {
            logger.warn('Authentication timed out after 5 seconds');
            resolve(false);
          }, 5000))
        ]);
        
        if (!authenticated) {
          logger.error('Failed to authenticate bot. Cannot post news.');
          
          // In development mode, continue even without authentication
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('Development mode: Continuing despite authentication failure');
            // Create emergency token to allow posting in dev mode
            if (!bot.authToken) {
              bot.authToken = `emergency_token_${Date.now()}`;
              logger.info('Created emergency token for posting');
            }
          } else {
            return { success: false, error: 'Authentication failed' };
          }
        }
      } catch (error) {
        logger.error(`Error during bot authentication: ${error?.message || 'Unknown error'}`);
        
        // In development mode, continue even with auth errors
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Development mode: Continuing despite authentication error');
          // Create emergency token to allow posting in dev mode
          if (!bot.authToken) {
            bot.authToken = `emergency_token_${Date.now()}`;
            logger.info('Created emergency token for posting after error');
          }
        } else {
          return { success: false, error: 'Authentication error' };
        }
      }
    } else {
      logger.warn('Bot does not have authenticate method - may cause posting issues');
    }
    
    // Select a country from the list to get news for
    const countryList = bot.config.countries || 'us';
    const country = getRandomCountry(countryList);
    logger.info(`Selected country for this update: ${country}`);
    
    // Get news for this country
    const newsItems = await getNewsForCountry(country, bot.config);
    
    if (!newsItems || newsItems.length === 0) {
      logger.info(`No news items found for country: ${country}`);
      return { success: false, message: 'No news items found' };
    }
    
    logger.info(`Found ${newsItems.length} news items for country: ${country}`);
    
    // Process news items
    const processedItems = [];
    const maxItems = Math.min(newsItems.length, bot.config.maxNewsItemsPerRun);
    
    for (let i = 0; i < maxItems; i++) {
      try {
        const newsItem = newsItems[i];
        logger.info(`Processing news item: ${newsItem.title.substring(0, 50)}...`);
        
        // Process the news item
        let processedItem;
        if (typeof bot.processNewsItem === 'function') {
          // Use the bot's processNewsItem method if available
          processedItem = await bot.processNewsItem(newsItem);
        } else {
          // Basic processing if no method provided
          processedItem = {
            ...newsItem,
            title: newsItem.title,
            content: newsItem.description || newsItem.content,
            url: newsItem.link
          };
        }
        
        // Prepare bot instance for posting
        let publisherBot = bot;
        
        // Ensure the bot has a valid ID
        if (!publisherBot._id && !publisherBot.id) {
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('Development mode: Adding mock ID to bot for publishing');
            publisherBot = {
              ...publisherBot,
              _id: `mock_bot_${Date.now()}`,
              authToken: publisherBot.authToken || `mock_token_${Date.now()}`
            };
          } else {
            logger.error('Invalid bot instance - missing ID, cannot post news');
            continue; // Skip to next news item
          }
        }
        
        // Post the news item
        try {
          if (processedItem.image_url && typeof processedItem.image_url === 'string' && processedItem.image_url.startsWith('http')) {
            // Post with image
            const postResult = await newsPublisher.postNewsWithImage(publisherBot, processedItem, processedItem.image_url);
            logger.info(`Posted news item with image: ${processedItem.title.substring(0, 30)}...`);
            processedItems.push(processedItem);
          } else {
            // Post without image
            const postResult = await newsPublisher.postNewsItem(publisherBot, processedItem);
            logger.info(`Posted news item without image: ${processedItem.title.substring(0, 30)}...`);
            processedItems.push(processedItem);
          }
        } catch (postError) {
          logger.error(`Error posting news item: ${processedItem.title}`, postError.message);
          
          // If authentication error, try to re-authenticate for future requests
          if (postError.message && (
              postError.message.includes('401') || 
              postError.message.includes('auth') || 
              postError.message.includes('token'))) {
            logger.info('Authentication error detected - breaking news processing loop');
            
            // Try to re-authenticate for future requests
            if (typeof bot.authenticate === 'function') {
              try {
                logger.info('Attempting to re-authenticate for future requests');
                await bot.authenticate();
              } catch (authError) {
                logger.error('Failed to re-authenticate:', authError.message);
              }
            }
            
            break;
          }
        }
      } catch (error) {
        logger.error(`Error processing news item: ${newsItems[i].title}`, error);
      }
    }
    
    return {
      success: true,
      country,
      processedCount: processedItems.length,
      totalFound: newsItems.length,
      items: processedItems
    };
  } catch (error) {
    logger.error('Error processing news update:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get news for a specific country
 * @param {string} countryCode - Two-letter country code
 * @param {Object} config - Bot configuration
 * @returns {Array} - Array of news items
 */
async function getNewsForCountry(countryCode, config) {
  const cacheKey = `${countryCode}_${config.language || 'en'}_${config.category || 'general'}`;
  
  // Check if we've already hit rate limits today
  const today = new Date().toISOString().split('T')[0];
  const rateLimitKey = `rateLimit_${today}`;
  const currentUsage = global[rateLimitKey] || 0;
  
  // Calculate how many credits we should have left for the day
  const now = new Date();
  const hoursElapsed = now.getHours() + (now.getMinutes() / 60);
  const dayProgress = hoursElapsed / 24; // 0 to 1 representing progress through the day
  const targetUsage = Math.floor(200 * dayProgress);
  const safetyBuffer = 10; // Keep some credits in reserve
  
  // Only use cache if we're significantly ahead of our target usage
  const shouldUseCache = currentUsage > targetUsage + safetyBuffer;
  
  if (shouldUseCache && newsByCountryCache[cacheKey] && !isCountryCacheExpired(cacheKey)) {
    logger.info(`Using cached news data for ${countryCode} (ahead of target usage)`);
    return newsByCountryCache[cacheKey].items || [];
  }
  
  // If we're near the daily limit, use cache even if expired
  if (currentUsage >= 190) {
    logger.warn(`Near daily limit (${currentUsage}/200). Using any available cached data.`);
    
    if (newsByCountryCache[cacheKey] && newsByCountryCache[cacheKey].items) {
      logger.info(`Using cached news data for ${countryCode} to preserve remaining credits`);
      return newsByCountryCache[cacheKey].items;
    }
    
    logger.warn(`No cached data available for ${countryCode}. Skipping to preserve credits.`);
    return [];
  }
  
  // Prepare API request parameters - keeping it minimal to avoid 422 errors
  const params = {
    // Required parameter
    apikey: process.env.NEWSDATA_API_KEY || config.newsApiKey || 'pub_73415c925b1126c7d5fe25c53b7a0e1bebad0',
    
    // Geographic filtering
    country: countryCode,
    
    // Content filtering
    language: config.language || 'en',
    
    // Always require images
    image: 1,
    
    // Prioritize breaking news
    category: config.category || 'top',
    
    // Limit results to conserve credits
    size: config.size || 3
  };
  
  logger.info(`Making API request with params: ${JSON.stringify(params)}`);
  
  try {
    // Make the API request with enhanced error handling and retries
    const response = await apiUtils.makeRequest({
      url: NEWSDATA_API_URL,
      method: 'GET',
      params,
      maxRetries: 2, // Reduced retries to avoid wasting credits
      retryDelay: 15000 // 15 second delay between retries
    });
    
    // Track API usage
    if (!global[rateLimitKey]) global[rateLimitKey] = 0;
    global[rateLimitKey]++;
    
    logger.info(`API usage today: ${global[rateLimitKey]}/200 credits`);
    
    // Check for successful response
    if (!response.data) {
      logger.error('No data in API response');
      return [];
    }
    
    // Check for API error messages
    if (response.data.status === 'error') {
      logger.error(`API returned error: ${response.data.message || 'Unknown error'}`);
      return [];
    }
    
    // Process and cache the results
    const results = response.data.results || [];
    
    // Cache the results
    newsByCountryCache[cacheKey] = {
      timestamp: Date.now(),
      items: results
    };
    
    logger.info(`Got ${results.length} news items for country ${countryCode}`);
    return results;
  } catch (error) {
    logger.error(`Error fetching news for country ${countryCode}: ${JSON.stringify(error)}`);
    
    // If we get a rate limit error, track it
    if (error.response && error.response.status === 429) {
      logger.warn(`Rate limit exceeded for NewsData API. Waiting before next request.`);
      
      // Mark that we've hit the rate limit
      if (!global[rateLimitKey]) global[rateLimitKey] = 180; // Set to near limit
      
      // Add a longer delay after a rate limit error
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute delay
    } else {
      // Add a delay after an error
      logger.info(`Waiting 15 seconds before fetching news for next country...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
    
    // If we have cached data, use it as fallback after API error
    if (newsByCountryCache[cacheKey] && newsByCountryCache[cacheKey].items) {
      logger.info(`Using cached news data for ${countryCode} after API error`);
      return newsByCountryCache[cacheKey].items;
    }
    
    return [];
  }
}

/**
 * Get a random country from a country list
 * @param {string} countriesList - Comma-separated list of country codes
 * @returns {string} - A single country code
 */
function getRandomCountry(countriesList) {
  // If no countries provided, use the next country from our rotation
  if (!countriesList || countriesList === '') {
    return countryUtils.getNextCountryBatch(1);
  }
  
  // If countries provided, select one randomly
  const countries = countriesList.split(',').map(c => c.trim()).filter(c => c);
  
  if (countries.length === 0) {
    return countryUtils.getNextCountryBatch(1);
  }
  
  // Get a random country from the provided list
  const randomIndex = Math.floor(Math.random() * countries.length);
  return countries[randomIndex];
}

/**
 * Get news based on a specific search term
 * @param {string} searchTerm - Term to search for
 * @param {Object} config - Bot configuration
 * @returns {Array} - Array of news items
 */
async function searchNews(searchTerm, config) {
  try {
    logger.info(`Searching news for term: "${searchTerm}"`);
    
    // Create a unique cache key
    const cacheKey = `search_${searchTerm}_${config.language || 'en'}`;
    
    // Check cache first
    if (newsByCountryCache[cacheKey] && !newsByCountryCache[cacheKey].isExpired()) {
      logger.info(`Using cached search results for "${searchTerm}"`);
      return newsByCountryCache[cacheKey].getAll();
    }
    
    // Prepare request parameters
    const params = {
      // Required parameter
      apikey: process.env.NEWSDATA_API_KEY || config.newsApiKey || 'pub_73415c925b1126c7d5fe25c53b7a0e1bebad0',
      
      // Search functionality
      q: searchTerm,
      
      // Content filtering
      language: config.language || 'en',
      
      // Always require images
      image: 1
    };
    
    // Optionally add a few more parameters, but keep it minimal
    if (config.size) params.size = config.size;
    
    logger.info(`Making search API request with params: ${JSON.stringify(params)}`);
    
    // Make the API request
    const response = await apiUtils.makeRequest({
      url: NEWSDATA_API_URL,
      method: 'GET',
      params,
      maxRetries: 3,
      retryDelay: 1000
    });
    
    // Process the response the same way as getNewsForCountry
    if (!response.data || !response.data.results || !Array.isArray(response.data.results)) {
      logger.error('Invalid search results from API');
      return [];
    }
    
    const newsItems = response.data.results;
    
    // Follow the same processing pattern as getNewsForCountry
    const validItems = newsItems.filter(item => (
      item.title && 
      item.description
    ));
    
    const processedItems = validItems.map(item => ({
      article_id: item.article_id || `news_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      title: item.title,
      description: item.description || item.content || 'No description available',
      content: item.content,
      link: item.link,
      pubDate: item.pubDate,
      image_url: item.image_url ? apiUtils.validateImageUrl(item.image_url) : null,
      source_id: item.source_id,
      source_name: item.source_name,
      country: item.country,
      category: item.category,
      language: item.language
    }));
    
    // Cache the results
    newsByCountryCache[cacheKey] = cacheUtils.createCache({
      name: `Search_${searchTerm}`,
      maxSize: 100,
      ttl: 10 * 60 * 1000 // 10 minutes
    });
    
    processedItems.forEach(item => {
      newsByCountryCache[cacheKey].add(item, 'article_id');
    });
    
    return processedItems;
  } catch (error) {
    logger.error(`Error searching news for term "${searchTerm}":`, error);
    return [];
  }
}

/**
 * Get news items from multiple countries
 * 
 * @param {Object} config - Configuration parameters
 * @param {boolean} [isStartup=false] - Whether this is the initial startup fetch
 * @returns {Array} - Array of news items
 */
async function getNews(config, isStartup = false) {
  try {
    logger.info('Getting news from multiple countries');
    
    // Get the current usage and target
    const today = new Date().toISOString().split('T')[0];
    const rateLimitKey = `rateLimit_${today}`;
    const currentUsage = global[rateLimitKey] || 0;
    
    // Calculate how many countries we can safely process
    // We want to ensure even distribution throughout the day
    const now = new Date();
    const hoursElapsed = now.getHours() + (now.getMinutes() / 60);
    const dayProgress = hoursElapsed / 24; // 0 to 1 representing progress through the day
    const targetUsage = Math.floor(200 * dayProgress);
    
    // On startup, only process one country to avoid rate limits
    let countriesToProcess = isStartup ? 1 : 1; // Default to 1 country
    
    if (!isStartup) {
      if (currentUsage < targetUsage - 10) {
        // We're behind schedule, process more countries
        countriesToProcess = Math.min(3, Math.floor((targetUsage - currentUsage) / 3));
        logger.info(`Behind target usage (${currentUsage}/${targetUsage}), processing ${countriesToProcess} countries`);
      } else if (currentUsage > targetUsage + 10) {
        // We're ahead of schedule, be more conservative
        countriesToProcess = 1;
        logger.info(`Ahead of target usage (${currentUsage}/${targetUsage}), processing only ${countriesToProcess} country`);
      } else {
        logger.info(`On target with usage (${currentUsage}/${targetUsage}), processing ${countriesToProcess} country`);
      }
    } else {
      logger.info('Initial startup fetch - processing only one country');
    }
    
    // If we're near the daily limit, don't process any countries
    if (currentUsage >= 190) {
      logger.warn(`Near daily limit (${currentUsage}/200). Skipping news update.`);
      return [];
    }
    
    // Get the next batch of countries using our country rotation utility
    const countryString = countryUtils.getNextCountryBatch(countriesToProcess);
    const countries = countryString.split(',');
    
    logger.info(`Using countries for this fetch: ${countryString} (${countries.length} countries)`);
    logger.info(`Total countries in rotation: ${countryUtils.getTotalCountries()}`);
    
    let allNewsItems = [];
    
    // Process countries sequentially to avoid rate limiting
    for (const country of countries) {
      try {
        // Add a delay between requests to respect rate limits
        if (countries.indexOf(country) > 0) {
          const delaySeconds = 10;
          logger.info(`Waiting ${delaySeconds} seconds before fetching news for next country...`);
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
        
        // Prioritize breaking news
        const countryItems = await getNewsForCountry(country.trim(), { 
          ...config,
          image: 1,
          size: 3,
          category: 'top' // Focus on top/breaking news
        });
        
        if (Array.isArray(countryItems)) {
          allNewsItems = allNewsItems.concat(countryItems);
        }
      } catch (error) {
        logger.error(`Error fetching news for country ${country}, continuing with next country: ${error.message}`);
        
        // Add delay after an error
        logger.info(`Adding delay after error before continuing...`);
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }
    
    // Remove duplicates (articles with the same title)
    const uniqueItems = [];
    const titleMap = new Map();
    
    // Sort by newest first to prioritize breaking news
    allNewsItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate) : new Date(0);
      const dateB = b.pubDate ? new Date(b.pubDate) : new Date(0);
      return dateB - dateA; // Newest first
    });
    
    // Filter for unique items
    allNewsItems.forEach(item => {
      if (!titleMap.has(item.title)) {
        titleMap.set(item.title, true);
        uniqueItems.push(item);
      }
    });
    
    logger.info(`Got ${uniqueItems.length} unique news items from ${countries.length} countries`);
    return uniqueItems;
  } catch (error) {
    logger.error('Error getting news:', error);
    return [];
  }
}

module.exports = {
  processNewsUpdate,
  getNewsForCountry,
  searchNews,
  getNews
}; 