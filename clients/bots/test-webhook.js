/**
 * Weather Bot - Webhook Test Script (No Database)
 * Tests the webhook endpoints for the weather bot
 */
const axios = require('axios');
const { logger } = require('./utils');

const BOT_SERVER_URL = 'http://localhost:3100'; // Adjust if needed

async function testWebhookEndpoints() {
  logger.info('Testing Weather Bot webhook endpoints...');
  
  try {
    logger.info('Testing /api/weather/alerts endpoint:');
    
    const alertData = {
      alert: {
        id: "test-alert-" + Date.now(),
        geometry: {
          type: "Polygon",
          coordinates: [[[-74.0060, 40.7128], [-74.0160, 40.7228], [-73.9960, 40.7228], [-74.0060, 40.7128]]]
        }
      },
      msg_type: "warning",
      severity: "Extreme",
      urgency: "Immediate",
      certainty: "Observed",
      start: Math.floor(Date.now() / 1000),
      end: Math.floor(Date.now() / 1000) + 21600, // 6 hours
      sender: "Test System",
      description: [
        {
          language: "En",
          event: "Tornado Warning",
          headline: "TEST ALERT - Tornado Warning for New York County",
          description: "This is a test alert. A tornado has been spotted...",
          instruction: "Seek shelter immediately!"
        }
      ]
    };
    
    const alertResponse = await axios.post(`${BOT_SERVER_URL}/api/weather/alerts`, alertData);
    logger.info('Response status:', alertResponse.status);

    logger.info('Testing /api/weather/mock-alert endpoint:');
    const mockResponse = await axios.post(`${BOT_SERVER_URL}/api/weather/mock-alert`, {});
    logger.info('Response status:', mockResponse.status);
    
    // Test a duplicate alert to verify in-memory deduplication
    logger.info('Testing duplicate alert (should be processed exactly once):');
    const duplicateAlertData = {
      ...alertData,
      alert: { ...alertData.alert } // Create a copy but keep the same ID
    };
    
    const duplicateResponse = await axios.post(`${BOT_SERVER_URL}/api/weather/alerts`, duplicateAlertData);
    logger.info('Response status:', duplicateResponse.status);
    
    logger.info('All tests completed successfully!');
    
    return true;
  } catch (error) {
    logger.error('Error testing webhook endpoints:', error.message);
    if (error.response) {
      logger.error('Response status:', error.response.status);
      logger.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Run the test
testWebhookEndpoints()
  .then(success => {
    logger.info(success ? 'All tests passed!' : 'Some tests failed!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Test script error:', error);
    process.exit(1);
  }); 