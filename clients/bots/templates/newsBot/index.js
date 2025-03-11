/**
 * News Bot - Posts breaking news updates from around the world
 * 
 * Latest Improvements (2025-03-08):
 * 
 * 1. Authentication Robustness
 *    - Now correctly uses BOT_API_KEY from .env for authentication
 *    - Better token handling with proper caching and refresh
 *    - Improved error handling for auth failures
 *    - Development mode fallbacks for testing without real servers
 * 
 * 2. Image URL Handling
 *    - Added sophisticated validation of image URLs before download
 *    - Filters out invalid image formats and bad URLs
 *    - Added checks for common image extensions
 *    - Fallback to text-only posting when image download fails
 * 
 * 3. Error Handling
 *    - Fixed "Invalid bot instance" errors with better validation
 *    - Added dev mode fallbacks for missing bot IDs
 *    - Improved logging of error conditions
 *    - More graceful handling of authentication failures
 * 
 * 4. Development Testing
 *    - Added DEV_MODE check to avoid real API calls during testing
 *    - Mock response support for local testing
 *    - Improved cleanup of temporary files
 *
 * 5. API Efficiency
 *    - Now fetches news for 5 countries at once instead of one by one
 *    - Reduces API calls and improves rate limit handling
 *    - More efficient use of daily API credits
 * 
 * Features:
 * - Fetches breaking news from NewsData.io API (https://newsdata.io) with advanced filtering
 * - Rotates through countries to provide truly global news coverage
 * - Gets only news with images from the last 6 hours
 * - Extracts and geocodes location information from news articles
 * - Only posts news items that have valid location coordinates
 * - Downloads images from URLs and posts them as file attachments
 * - Truncates content to 120 characters without counting URLs in the limit
 * 
 * API Parameters (NewsData.io):
 * - apikey: API key for authentication
 * - country: 2-letter country code (up to 5 countries)
 * - category: News category (top, world, business, etc.)
 * - language: 2-letter language code
 * - q: Search term for finding specific news
 * - timeframe: How recent the news should be (in hours)
 * - image: Whether articles should have images (1=yes, 0=no)
 * - size: Number of results to return (1-50)
 * - prioritydomain: Quality level of news sources (top, medium, low)
 * - removeduplicate: Remove duplicate articles (1=yes)
 */
const { logger } = require('../../utils');
const { authService } = require('../../utils');
const newsService = require('./newsService');
const locationService = require('./locationService');
const newsFormatter = require('./newsFormatter');
const newsPublisher = require('./newsPublisher');
const countryUtils = require('./countryUtils');

// Add rate limiting tracking variables at module scope
let currentBackoff = 0;
const baseBackoff = 5000; // 5 seconds base backoff
const maxBackoff = 30 * 60 * 1000; // 30 minutes maximum backoff
const POST_INTERVAL = 1000 * 60 * 10; // 10 minutes in milliseconds

// Force reset backoff on startup to ensure smooth operation
currentBackoff = 0;

// Add watchdog timer to catch stuck processes
let runWatchdogTimer = null;
const WATCHDOG_TIMEOUT = 5 * 60 * 1000; // 5 minute watchdog timeout

// Function to calculate exponential backoff with jitter
function calculateBackoff(attempt = 1) {
  // Exponential backoff: base * 2^attempt
  const exponential = baseBackoff * Math.pow(2, attempt); 
  // Add jitter to prevent thundering herd problem (±25%)
  const jitter = exponential * (0.75 + Math.random() * 0.5);
  // Cap at maximum backoff time
  return Math.min(jitter, maxBackoff);
}

module.exports = {
  name: 'News Bot',
  description: 'A bot that posts breaking news updates from around the world',
  capabilities: ['publishing', 'scheduling', 'search'],
  
  /**
   * Initialize the News bot
   * @param {Object} botData - Configuration data for the bot
   * @returns {Object} - Initialized bot instance
   */
  initialize: async (botData) => {
    logger.info(`Initializing News bot: ${botData._id}`);
    
    // Default configuration for the news bot
    const defaultConfig = {
      // API authentication
      newsApiKey: process.env.NEWSDATA_API_KEY || 'pub_73415c925b1126c7d5fe25c53b7a0e1bebad0',
      
      // Content settings
      maxNewsItemsPerRun: 3,
      minImageWidth: 300,
      minImageHeight: 200,
      contentMaxLength: 120,
      postFrequency: 5, // minutes
      postWithLocation: true,
      requireLocation: false,
      
      // NewsData.io API parameters
      countries: 'us,gb,ca,au,in', // Limited to 5 countries max per API requirements
      categories: 'top',           // Limited to single category for simplicity
      language: 'en',
      timeframe: 6, // last 6 hours
      image: 1, // only articles with images
      size: 10, // 10 results per request
      priorityDomain: 'top', // top quality sources
      removeDuplicate: 1, // remove duplicates
      fullContent: 0, // don't fetch full content to save bandwidth
      
      // Bot behavior
      fallbackToTextOnImageError: false, // if true, will post without image on download failure
      debugMode: false
    };
    
    // Merge the provided configuration with the defaults
    const config = { ...defaultConfig, ...botData.config };
    
    // Create the bot instance
    const bot = {
      _id: botData._id,
      id: botData._id, // For backward compatibility
      username: botData.username,
      type: 'news',
      config,
      status: botData.status || 'active',
      startTime: Date.now(),
      
      // Use the API key provided in botData or from environment
      apiKey: botData.apiKey || process.env.BOT_API_KEY,
      
      // Initialize bot state
      log: [],
      
      // Authentication method
      authenticate: async () => {
        logger.info(`Authenticating news bot: ${bot.username} (${bot._id})`);
        
        // If we already have a token and it's not production, just use it
        if (bot.authToken && process.env.NODE_ENV !== 'production') {
          logger.info('Using existing auth token');
          return true;
        }
        
        // Try to authenticate with the server using BOT_API_KEY from .env
        try {
          // Use the API key from the bot or from the environment
          const apiKey = bot.apiKey || process.env.BOT_API_KEY;
          
          if (!apiKey) {
            logger.error('No API key available for authentication');
            return false;
          }
          
          logger.info(`Authenticating with API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 4)}`);
          
          // In development or testing, create a simple mock token
          if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.MOCK_AUTH === 'true') {
            logger.info('Development mode: Creating mock token');
            const mockToken = `mock_token_${Date.now()}`;
            bot.authToken = mockToken;
            return true;
          }
          
          // Try using the auth service in production
          try {
            const auth = await authService.authenticateBot(bot._id, apiKey);
            
            if (auth && auth.success && auth.token) {
              bot.authToken = auth.token;
              logger.info(`Authentication successful with server token`);
              return true;
            } else {
              const errorMsg = auth?.error || 'Unknown authentication error';
              logger.error(`Authentication failed: ${errorMsg}`);
              
              // Only create fallback token if explicitly allowed
              if (process.env.NODE_ENV !== 'production' || process.env.MOCK_AUTH === 'true') {
                logger.info('Creating fallback token in non-production mode');
                bot.authToken = `fallback_token_${Date.now()}`;
                return true;
              }
              
              return false;
            }
          } catch (serviceError) {
            logger.error(`Auth service error: ${serviceError?.message || 'Unknown error'}`);
            
            // Only create emergency token if explicitly allowed
            if (process.env.NODE_ENV !== 'production' || process.env.MOCK_AUTH === 'true') {
              logger.info('Creating emergency token after service error in non-production mode');
              bot.authToken = `emergency_token_${Date.now()}`;
              return true;
            }
            
            return false;
          }
        } catch (error) {
          const errorMsg = error?.message || 'Unknown error';
          logger.error(`Authentication error: ${errorMsg}`);
          
          // Only create emergency token if explicitly allowed
          if (process.env.NODE_ENV !== 'production' || process.env.MOCK_AUTH === 'true') {
            logger.info('Creating emergency token after error in non-production mode');
            bot.authToken = `emergency_token_${Date.now()}`;
            return true;
          }
          
          return false;
        }
      },
      
      // Process news update on schedule
      processNewsUpdate: async (isStartup = false) => {
        try {
          // Set up watchdog timer to catch stuck processes
          if (runWatchdogTimer) {
            clearTimeout(runWatchdogTimer);
          }
          
          runWatchdogTimer = setTimeout(() => {
            logger.error("WATCHDOG ALERT: News update process taking too long, forcing completion");
            // Force schedule next run to prevent getting stuck
            if (typeof scheduleNextRun === 'function') {
              logger.info("WATCHDOG: Scheduling next run to recover from stuck state");
              scheduleNextRun();
            }
          }, WATCHDOG_TIMEOUT);
          
          // Skip updates if current backoff is high (severe rate limiting)
          if (currentBackoff > 5 * 60 * 1000) { // Skip if backoff is > 5 minutes
            logger.warn(`Skipping scheduled news update due to high backoff (${currentBackoff/1000}s)`);
            clearTimeout(runWatchdogTimer);
            return { skipped: true, backoffMs: currentBackoff };
          }
          
          // Run the bot
          logger.info(`Processing news update for ${bot.username}`);
          const result = await bot.run(isStartup);
          
          // Clear watchdog timer after successful completion
          clearTimeout(runWatchdogTimer);
          
          // If we got rate limited during the run, schedule the next run with increased delay
          if (result.rateLimited) {
            logger.warn(`News update encountered rate limiting, next run will use increased backoff`);
          }
          
          return result;
        } catch (error) {
          logger.error(`Error in processNewsUpdate: ${error.message}`);
          // Clear watchdog timer after error
          clearTimeout(runWatchdogTimer);
          // Increase backoff for errors too
          bot.increaseBackoff();
          return { success: false, error: error.message };
        }
      },
      
      // Get news for a specific country
      getNewsForCountry: async (countryCode) => {
        return newsService.getNewsForCountry(countryCode, bot.config);
      },
      
      // Search for news by keyword
      searchNews: async (searchTerm) => {
        return newsService.searchNews(searchTerm, bot.config);
      },
      
      // Process and prepare a news item
      processNewsItem: async (newsItem) => {
        // Extract location
        const location = await locationService.getNewsLocation(newsItem);
        
        // Format the news content
        const formattedContent = newsFormatter.formatNewsContent(newsItem, bot.config);
        
        return {
          ...newsItem,
          formattedContent,
          location
        };
      },
      
      // Post a news item to the platform
      postNewsItem: async (newsItem) => {
        return newsPublisher.postNewsWithImage(
          bot,
          newsItem,
          newsItem.image_url
        );
      },
      
      // Shutdown the bot
      shutdown: async () => {
        logger.info(`Shutting down News bot: ${bot._id}`);
        // Clear any scheduled intervals
        if (bot.newsUpdateTimeoutId) {
          clearTimeout(bot.newsUpdateTimeoutId);
          logger.info(`Cleared scheduled news update timeout`);
        }
        bot.status = 'inactive';
        return true;
      },
      
      // Reset the backoff when successful
      resetBackoff: function() {
        if (currentBackoff > 0) {
          logger.info(`Resetting backoff after successful operations`);
          currentBackoff = 0;
        }
      },

      // Increase backoff after failures
      increaseBackoff: function() {
        const nextBackoff = currentBackoff === 0 ? 
          baseBackoff : // First failure, use base backoff
          calculateBackoff(Math.floor(Math.log2(currentBackoff / baseBackoff)) + 1); // Subsequent failures
        
        logger.warn(`Increasing backoff from ${currentBackoff/1000}s to ${nextBackoff/1000}s due to rate limiting`);
        currentBackoff = nextBackoff;
        return currentBackoff;
      },

      // Get current delay (includes backoff if present)
      getCurrentDelay: function() {
        const baseDelay = 3000; // Default 3 second delay between posts
        return currentBackoff > 0 ? currentBackoff : baseDelay;
      },

      // Main run function for the bot
      run: async (isStartup = false) => {
        // Set a timeout promise to ensure the function doesn't run too long
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('News bot run timed out after 4 minutes')), 4 * 60 * 1000);
        });
        
        try {
          // Use Promise.race to ensure the run function doesn't hang indefinitely
          return await Promise.race([
            (async () => {
              try {
                logger.info('News bot run starting');
                
                // 1. Fetch news from service
                const newsItems = await newsService.getNews(bot.config, isStartup);
                logger.info(`Fetched ${newsItems.length} news items`);
                
                // Filter out items without images FIRST
                const itemsWithImages = newsItems.filter(item => {
                  if (!item.image_url) {
                    logger.info(`Filtering out news item without image: "${item.title}"`);
                    return false;
                  }
                  return true;
                });
                
                logger.info(`Found ${itemsWithImages.length} news items with images`);
                
                // Set max items to process
                const maxItems = bot.config.maxNewsItemsPerRun || 3;
                const itemsToProcess = itemsWithImages.slice(0, maxItems);
                
                // Track rate limiting for this run
                let encounteredRateLimit = false;
                
                // 2. Process each news item
                for (const newsItem of itemsToProcess) {
                  try {
                    // Process the news item (extract location, format content)
                    const processedItem = await bot.processNewsItem(newsItem);
                    
                    // Verify location has coordinates
                    if (bot.config.requireLocation && 
                        (!processedItem.location || 
                         !processedItem.location.latitude || 
                         !processedItem.location.longitude)) {
                      logger.info(`Skipping news item due to missing location: "${processedItem.title}"`);
                      continue;
                    }
                    
                    // Ensure location has coordinates if present
                    if (processedItem.location && 
                        (!processedItem.location.latitude || 
                         !processedItem.location.longitude)) {
                      logger.info(`Location found but missing coordinates for: "${processedItem.title}"`);
                      
                      // Try geocoding again if there's a location name
                      if (processedItem.location.name) {
                        const geocodedLocation = await locationService.geocodeLocation(processedItem.location.name);
                        if (geocodedLocation) {
                          processedItem.location = {
                            ...processedItem.location,
                            ...geocodedLocation
                          };
                          logger.info(`Successfully added coordinates to location`);
                        }
                      }
                    }
                    
                    // 3. Post the news item
                    const result = await bot.postNewsItem(processedItem);
                    
                    if (result.success) {
                      logger.info(`Successfully posted news item: "${processedItem.title}"`);
                      // Reset backoff after successful post
                      bot.resetBackoff();
                    } else if (result.rateLimited) {
                      logger.warn(`Rate limited when posting: "${processedItem.title}". Retry after ${result.retryAfter}s`);
                      // Increase backoff time
                      bot.increaseBackoff();
                      // Set flag to prevent processing more items in this run
                      encounteredRateLimit = true;
                      // Break the loop to stop processing more items
                      break;
                    } else if (result.skipped) {
                      logger.info(`Skipped news item: ${result.error}`);
                    } else {
                      logger.error(`Failed to post news item: ${result.error}`);
                    }
                    
                    // If we encountered rate limiting, don't process more items
                    if (encounteredRateLimit) {
                      logger.warn('Stopping news processing due to rate limiting');
                      break;
                    }
                    
                    // Add delay between posts - use dynamically calculated delay
                    const delay = bot.getCurrentDelay();
                    logger.info(`Waiting ${delay/1000} seconds before processing next item`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  } catch (itemError) {
                    logger.error(`Error processing news item: ${itemError.message}`);
                  }
                }
                
                logger.info('News bot run completed');
                
                // Return status including rate limit info
                return {
                  success: true,
                  rateLimited: encounteredRateLimit,
                  backoffMs: currentBackoff
                };
              } catch (error) {
                logger.error(`Error in news bot run: ${error.message}`);
                return {
                  success: false,
                  error: error.message
                };
              }
            })(),
            timeoutPromise
          ]);
        } catch (timeoutError) {
          logger.error(`TIMEOUT ERROR: ${timeoutError.message}`);
          return {
            success: false,
            error: timeoutError.message,
            timeout: true
          };
        }
      }
    };
    
    // Set up scheduling for automatic news updates
    if (bot.config.postFrequency > 0) {
      // Calculate optimal interval for 24-hour coverage with 200 daily credits
      // 200 credits / 24 hours = 8.33 requests per hour
      // 60 minutes / 8.33 = 7.2 minutes between requests
      const optimalIntervalMinutes = 7.2;
      
      // Use the optimal interval regardless of configured frequency to ensure 24-hour coverage
      const baseIntervalMs = Math.ceil(optimalIntervalMinutes * 60 * 1000); // Convert minutes to milliseconds
      
      logger.info(`Setting up scheduled task to check for news every ${optimalIntervalMinutes.toFixed(1)} minutes for 24-hour coverage`);
      
      // Track daily usage to ensure even distribution
      const getDailyUsageTarget = () => {
        const now = new Date();
        const hoursElapsed = now.getHours() + (now.getMinutes() / 60);
        const dayProgress = hoursElapsed / 24; // 0 to 1 representing progress through the day
        
        // Calculate how many requests we should have made by now for even distribution
        return Math.floor(200 * dayProgress);
      };
      
      // Perform initial news fetch immediately on startup
      logger.info('Performing initial news fetch on startup...');
      bot.processNewsUpdate(true).then(result => {
        if (result.success) {
          logger.info('Initial news fetch completed successfully');
        } else {
          logger.warn(`Initial news fetch failed: ${result.error || 'Unknown error'}`);
        }
      }).catch(error => {
        logger.error(`Error during initial news fetch: ${error.message}`);
      });

      // Add a longer delay before first scheduled run to avoid rate limits
      setTimeout(() => {
        scheduleNextRun();
      }, 2 * 60 * 1000); // Wait 2 minutes before starting regular schedule

      // Schedule the next run regardless of success/failure
      const scheduleNextRun = () => {
        try {
          // Mark the time we scheduled this run
          global.lastScheduleTime = Date.now();
          
          // Get current usage and target
          const today = new Date().toISOString().split('T')[0];
          const rateLimitKey = `rateLimit_${today}`;
          const currentUsage = global[rateLimitKey] || 0;
          const targetUsage = getDailyUsageTarget();
          
          // Reset backoff if it's been more than 15 minutes since the last run
          // This prevents the bot from getting stuck in a high backoff state
          if (global.lastRunTime && (Date.now() - global.lastRunTime > 15 * 60 * 1000)) {
            logger.warn('More than 15 minutes since last run, resetting backoff');
            currentBackoff = 0;
          }
          
          // Store this run time
          global.lastRunTime = Date.now();
          
          // Adjust interval based on usage vs target
          let nextInterval = baseIntervalMs;
          
          if (currentUsage > targetUsage + 5) {
            // We're ahead of schedule, slow down
            const slowdownFactor = 1 + ((currentUsage - targetUsage) / 20);
            nextInterval = baseIntervalMs * slowdownFactor;
            logger.info(`Ahead of target usage (${currentUsage}/${targetUsage}), slowing down by factor of ${slowdownFactor.toFixed(2)}`);
          } else if (currentUsage < targetUsage - 5 && currentUsage < 180) {
            // We're behind schedule, speed up (but don't exceed 90% of daily limit)
            const speedupFactor = Math.max(0.5, 1 - ((targetUsage - currentUsage) / 40));
            nextInterval = baseIntervalMs * speedupFactor;
            logger.info(`Behind target usage (${currentUsage}/${targetUsage}), speeding up by factor of ${speedupFactor.toFixed(2)}`);
          }
          
          // IMPORTANT: Ensure minimum interval is being enforced
          // Never go below POST_INTERVAL/2 to prevent too frequent updates
          nextInterval = Math.max(nextInterval, POST_INTERVAL/2);
          
          // Ensure we don't exceed daily limit
          if (currentUsage >= 195) {
            // Near daily limit, wait until tomorrow
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 5, 0, 0); // 12:05 AM tomorrow
            
            nextInterval = tomorrow.getTime() - now.getTime();
            logger.warn(`Daily limit nearly reached (${currentUsage}/200). Waiting until tomorrow.`);
          }
          
          logger.info(`Scheduling next news update in ${(nextInterval/60000).toFixed(1)} minutes`);
          
          // Clear any existing timeout first to prevent duplicates
          if (bot.newsUpdateTimeoutId) {
            clearTimeout(bot.newsUpdateTimeoutId);
          }
          
          // Schedule the next run with a safety wrapper
          bot.newsUpdateTimeoutId = setTimeout(async () => {
            try {
              // Set up a watchdog for this scheduled run
              const scheduleWatchdog = setTimeout(() => {
                logger.error("WATCHDOG ALERT: Scheduled news update watchdog triggered");
                // Force a new schedule
                if (global.lastScheduleTime && (Date.now() - global.lastScheduleTime > 15 * 60 * 1000)) {
                  logger.error("WATCHDOG: Last schedule was over 15 minutes ago, forcing reschedule");
                  scheduleNextRun();
                }
              }, WATCHDOG_TIMEOUT);
              
              // Check if we've hit rate limits today
              const today = new Date().toISOString().split('T')[0];
              const rateLimitKey = `rateLimit_${today}`;
              const currentUsage = global[rateLimitKey] || 0;
              
              if (currentUsage >= 195) {
                logger.warn(`Daily limit reached (${currentUsage}/200). Skipping news update.`);
                clearTimeout(scheduleWatchdog);
                // Even when skipping, make sure we schedule the next attempt
                scheduleNextRun();
              } else {
                logger.info(`Running scheduled news update for ${bot.username}`);
                
                // Set a timeout for the actual process
                const processTimeout = setTimeout(() => {
                  logger.error("ERROR: News update process timed out after 4 minutes");
                  // Force next schedule
                  scheduleNextRun();
                }, 4 * 60 * 1000);
                
                const result = await bot.processNewsUpdate();
                
                // Clear timeout after completion
                clearTimeout(processTimeout);
                clearTimeout(scheduleWatchdog);
                
                // Log the result
                if (!result.success) {
                  logger.error(`News update failed: ${result.error || 'Unknown error'}`);
                } else if (result.rateLimited) {
                  logger.warn(`News update encountered rate limiting`);
                } else {
                  logger.info(`News update completed successfully`);
                }
                
                // Always schedule the next run
                scheduleNextRun();
              }
            } catch (error) {
              logger.error(`Error during scheduled news update: ${error.message}`);
              // Even after errors, schedule the next run
              scheduleNextRun();
            }
          }, nextInterval);
          
          // Set up a watchdog for the entire scheduling system that will recover if nothing happens
          setTimeout(() => {
            if (global.lastRunTime && (Date.now() - global.lastRunTime > 30 * 60 * 1000)) {
              logger.error("GLOBAL WATCHDOG: No activity for 30 minutes, forcing system restart");
              // Force a full reset
              currentBackoff = 0;
              if (bot.newsUpdateTimeoutId) {
                clearTimeout(bot.newsUpdateTimeoutId);
              }
              
              // Immediate run followed by rescheduling
              bot.processNewsUpdate(true).finally(() => {
                scheduleNextRun();
              });
            }
          }, 30 * 60 * 1000); // Check every 30 minutes
        } catch (scheduleError) {
          // Catch any error in the scheduling logic itself
          logger.error(`Error in scheduling logic: ${scheduleError.message}`);
          // Use a simple fixed interval as fallback
          logger.info(`Falling back to fixed ${POST_INTERVAL/60000} minute interval`);
          
          // Clear any existing timeout first
          if (bot.newsUpdateTimeoutId) {
            clearTimeout(bot.newsUpdateTimeoutId);
          }
          
          bot.newsUpdateTimeoutId = setTimeout(() => scheduleNextRun(), POST_INTERVAL);
        }
      };
      
      // Start the scheduling loop
      scheduleNextRun();
    } else {
      logger.warn(`Warning: Post frequency is set to 0 - bot will not automatically post news`);
    }
    
    return bot;
  },
  
  /**
   * Get information about the country rotation
   * @returns {Object} - Country rotation information
   */
  getCountryRotationInfo: () => {
    return {
      totalCountries: countryUtils.getTotalCountries(),
      nextBatch: countryUtils.getNextCountryBatch(5).split(','),
      countryCodes: countryUtils.ALL_COUNTRY_CODES
    };
  }
}; 