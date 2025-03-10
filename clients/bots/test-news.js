/**
 * Test script for the news bot
 */
const { logger } = require('./utils');

logger.info('Starting news bot test...');

try {
  // Use API key from environment file
  logger.info('Using NewsData.io API key from environment');
  
  // Import the news service
  const newsService = require('./templates/newsBot/newsService');
  
  // Import location service
  const locationService = require('./templates/newsBot/locationService');
  
  // Import news formatter
  const newsFormatter = require('./templates/newsBot/newsFormatter');
  
  // Configure bot settings
  const config = {
    newsApiKey: process.env.NEWSDATA_API_KEY,
    countries: 'us,gb,au,ca,fr,de,jp',
    language: 'en',
    categories: 'top',
    debugMode: false
  };
  
  // Select a random country to test
  const countries = config.countries.split(',');
  const randomCountry = countries[Math.floor(Math.random() * countries.length)];
  
  logger.info(`Testing with country: ${randomCountry}`);
  
  // Test getting news
  newsService.getNewsForCountry(randomCountry, config)
    .then(async newsItems => {
      logger.info(`Retrieved ${newsItems.length} news items`);
      
      if (newsItems.length === 0) {
        logger.info('No news items found to process');
        return;
      }
      
      logger.info('Processing first 3 news items:');
      
      // Process up to 3 news items
      const processLimit = Math.min(newsItems.length, 3);
      
      for (let i = 0; i < processLimit; i++) {
        const item = newsItems[i];
        
        logger.info(`${i+1}. ${item.title}`);
        logger.info(`   Source: ${item.source_name || 'Unknown'}`);
        
        // Format content
        const formattedContent = newsFormatter.formatNewsContent(item, {
          contentMaxLength: 120
        });
        
        // Extract location
        const location = await locationService.getNewsLocation(item);
        if (location) {
          logger.info(`   Location: ${location.locationName} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`);
        } else {
          logger.info('   Location: None found');
        }
        
        logger.info(`   Link: ${item.link}`);
      }
    })
    .catch(error => {
      logger.error('Error fetching news:', error.message);
    });
    
} catch (error) {
  logger.error('Error in test script:', error);
} 