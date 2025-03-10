/**
 * Weather Bot - Test Bot Run
 * Test script to initialize the weather bot and test webhook functionality
 */
const weatherBot = require('./index');
const { logger } = require('../../utils');

async function runBotTest() {
  try {
    console.log('Initializing weather bot in webhook-only mode for testing...');
    
    // Mock bot data
    const mockBotData = {
      _id: 'test-weather-bot',
      username: 'WeatherBot',
      config: {
        debugMode: true,
        minSeverity: 'Minor', // Lower threshold to see more alerts
        maxAlertsPerRun: 2,   // Limit to 2 alerts per run for testing
      }
    };
    
    // Initialize the bot
    const bot = await weatherBot.initialize(mockBotData);
    console.log('Bot initialized.');
    
    // Run a webhook test (this just simulates a webhook call)
    console.log('\nRunning webhook test...');
    const result = await bot.run(true);
    console.log('\nWebhook test result:');
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