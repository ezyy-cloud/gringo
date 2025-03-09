/**
 * Test script for the news bot
 */
console.log('Starting news bot test...');

try {
  // Use API key from environment file
  console.log('Using NewsData.io API key from environment');
  
  // Import the news service
  console.log('Loading news service...');
  const newsService = require('./templates/newsBot/newsService');
  
  // Import location service
  console.log('Loading location service...');
  const locationService = require('./templates/newsBot/locationService');
  
  // Import news formatter
  console.log('Loading news formatter...');
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
  
  console.log(`\nTesting with country: ${randomCountry}`);
  
  // Test getting news
  newsService.getNewsForCountry(randomCountry, config)
    .then(async newsItems => {
      console.log(`Retrieved ${newsItems.length} news items`);
      
      if (newsItems.length === 0) {
        console.log('No news items found to process');
        return;
      }
      
      console.log('\nProcessing first 3 news items:');
      
      // Process up to 3 news items
      const processLimit = Math.min(newsItems.length, 3);
      
      for (let i = 0; i < processLimit; i++) {
        const item = newsItems[i];
        
        console.log(`\n${i+1}. ${item.title}`);
        console.log(`   Source: ${item.source_name || 'Unknown'}`);
        
        // Format content
        const formattedContent = newsFormatter.formatNewsContent(item, {
          contentMaxLength: 120
        });
        console.log(`   Content: ${formattedContent.substring(0, 100)}...`);
        
        // Extract location
        const location = await locationService.getNewsLocation(item);
        if (location) {
          console.log(`   Location: ${location.locationName} (${location.latitude}, ${location.longitude})`);
        } else {
          console.log('   Location: None found');
        }
        
        console.log(`   Link: ${item.link}`);
      }
    })
    .catch(error => {
      console.error('Error fetching news:', error.message);
    });
    
} catch (error) {
  console.error('Error in test script:', error);
} 