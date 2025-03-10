/**
 * Weather Bot - Test Bot Run
 * Test script to initialize and run the weather bot
 */
const weatherBot = require('./index');
const { logger } = require('../../utils');

async function runBotTest() {
  try {
    console.log('Initializing weather bot for testing...');
    
    // Mock bot data
    const mockBotData = {
      _id: 'test-weather-bot',
      username: 'WeatherBot',
      performInitialRun: true, // Perform initial run on startup
      config: {
        debugMode: true,
        minSeverity: 'Minor', // Lower threshold to see more alerts
        maxAlertsPerRun: 2,   // Limit to 2 alerts per run for testing
        alertCheckFrequency: 5 // 5 minutes between checks
      }
    };
    
    // Initialize the bot
    const bot = await weatherBot.initialize(mockBotData);
    console.log('Bot initialized.');
    
    // Run the bot
    console.log('\nRunning the bot...');
    const result = await bot.run(true);
    console.log('\nBot run result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Shutdown the bot
    await bot.shutdown();
    console.log('Bot shutdown successfully.');
    
    return result;
  } catch (error) {
    console.error('Error in bot test:', error);
    throw error;
  }
}

// Run the test
runBotTest()
  .then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nTest failed:', error);
    process.exit(1);
  });
