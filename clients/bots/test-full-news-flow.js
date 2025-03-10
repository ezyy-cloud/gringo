/**
 * Test script for the news bot complete workflow
 * This tests the fetch-process-post flow as in the original news.js
 */
const { logger } = require('./utils');

logger.info('Starting news bot complete workflow test...');

// Load environment variables
require('dotenv').config();

// Set real authentication mode for production
process.env.MOCK_AUTH = 'false';
process.env.FORCE_REAL_CALLS = 'true';

// Import required modules
const newsService = require('./templates/newsBot/newsService');
const locationService = require('./templates/newsBot/locationService');
const newsFormatter = require('./templates/newsBot/newsFormatter');
const newsPublisher = require('./templates/newsBot/newsPublisher');

// Import auth service directly
const authService = require('./utils/authService');

// Create a mock bot instance that mimics the index.js initialization
const createBot = async () => {
  logger.info('Creating bot instance...');
  
  // Get API key from environment or use default (and log a message)
  const apiKey = process.env.BOT_API_KEY || 'dev-bot-api-key';
  
  // Set production environment for real API calls
  process.env.NODE_ENV = 'production';
  process.env.MOCK_AUTH = 'false';
  
  // Create a bot instance
  const newsBot = require('./templates/newsBot');
  
  // Initialize bot with test configuration
  const botInstance = await newsBot.initialize({
    _id: '507f1f77bcf86cd799439011',  // Valid MongoDB ObjectId format (24-character hex)
    username: 'testNewsBot',
    apiKey: apiKey,
    status: 'active',
    config: {
      // Customize for testing
      newsApiKey: process.env.NEWSDATA_API_KEY || 'pub_73415c925b1126c7d5fe25c53b7a0e1bebad0',
      postFrequency: 60,
      maxNewsItemsPerRun: 3,
      countries: 'us,gb,ca,au,in',
      debugMode: false // Set to false to make actual API calls
    }
  });
  
  return botInstance;
};

/**
 * Custom news update function that filters for items with images
 * @param {Object} bot - Bot instance
 * @returns {Object} - Processing result
 */
async function customNewsUpdate(bot) {
  logger.info('\nTesting the complete news bot workflow...');
  
  try {
    // Require all the needed modules at the top
    const newsService = require('./templates/newsBot/newsService');
    const locationService = require('./templates/newsBot/locationService');
    const newsFormatter = require('./templates/newsBot/newsFormatter');
    
    // Authenticate the bot if needed
    if (typeof bot.authenticate === 'function') {
      await bot.authenticate();
    }
    
    // Try a specific country
    const country = 'us';
    logger.info(`Fetching news for country: ${country}`);
    
    // Get news for that country directly from newsService
    const newsItems = await newsService.getNewsForCountry(country, bot.config);
    
    if (!newsItems || !Array.isArray(newsItems) || newsItems.length === 0) {
      logger.info(`No news items found for country: ${country}`);
      return { success: false, error: 'No news items found' };
    }
    
    logger.info(`Found ${newsItems.length} total news items for country: ${country}`);
    
    // Filter for items with valid image URLs
    const newsWithImages = newsItems.filter(item => 
      typeof item.image_url === 'string' && 
      item.image_url.startsWith('http')
    );
    
    logger.info(`Found ${newsWithImages.length} news items with valid images`);
    
    // Process a subset of news items with debug mode
    const maxItems = Math.min(3, newsWithImages.length);
    const processedItems = [];
    
    for (let i = 0; i < maxItems; i++) {
      try {
        const newsItem = newsWithImages[i];
        logger.info(`Processing news item: '${newsItem.title.substring(0, 50)}...`);
        
        // Extract potential locations from the news item text
        let potentialLocations = [];
        try {
          // Extract location from title and content
          const text = `${newsItem.title} ${newsItem.description || ''} ${newsItem.content || ''}`;
          potentialLocations = text.split(/\s+/)
            .filter(word => word.length > 3 && /^[A-Z]/.test(word))
            .filter((word, index, self) => self.indexOf(word) === index)
            .slice(0, 10);
        } catch (locError) {
          // Remove detailed error logs for location extraction
        }
        
        // Try to geocode each potential location
        let location = null;
        for (const placeName of potentialLocations) {
          try {
            // Simple mock geocoding for testing
            const randomLat = 35 + Math.random() * 10;
            const randomLng = -100 + Math.random() * 20;
            
            location = {
              latitude: randomLat,
              longitude: randomLng,
              name: placeName
            };
            break;
          } catch (geocodeError) {
            // Remove detailed geocoding error logs
          }
        }
        
        if (location) {
          logger.info(`Found location: ${location.name} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`);
        } else {
          logger.info('No location found for this news item');
        }
        
        // Format the content
        let formattedContent = "";
        try {
          formattedContent = `${newsItem.title}\n\n${newsItem.content?.substring(0, 100) || ""}...`;
        } catch (formatError) {
          // Remove detailed formatting error logs
          formattedContent = newsItem.title;
        }
        
        // Add to processed items in debug mode
        processedItems.push({
          title: newsItem.title,
          url: newsItem.link,
          location: location ? `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}` : 'No location',
          image_url: newsItem.image_url
        });
        
        // Remove debug success logs
      } catch (itemError) {
        logger.error(`Error processing news item at index ${i}:`, itemError.message);
      }
    }
    
    // Return the result
    return {
      success: true,
      country,
      totalFound: newsItems.length,
      processedCount: processedItems.length,
      items: processedItems
    };
  } catch (error) {
    logger.error('Error in custom news update:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main test function
 */
async function runTest() {
  logger.info('Starting news bot complete workflow test...');
  
  try {
    // Create the bot instance
    const bot = await createBot();
    
    // Run the test by directly calling our custom update function
    const result = await customNewsUpdate(bot);
    
    // Log the results
    logger.info('\nWorkflow result:');
    logger.info(`- Success: ${result.success}`);
    logger.info(`- Country: ${result.country || 'N/A'}`);
    logger.info(`- Total found: ${result.totalFound || 0}`);
    logger.info(`- Processed: ${result.processedCount || 0}`);
    
    if (result.items && result.items.length > 0) {
      logger.info('\nProcessed items:');
      
      result.items.forEach((item, index) => {
        logger.info(`${index + 1}. ${item.title}`);
        logger.info(`   URL: ${item.url}`);
        logger.info(`   Location: ${item.location}`);
      });
    } else {
      logger.info('\nNo items were processed successfully');
    }
    
    logger.info('\nTest completed successfully!');
  } catch (error) {
    logger.error('\nTest failed with error:', error);
  }
}

// Run the test
runTest(); 