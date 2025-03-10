/**
 * Weather Bot - Test Mock Alert via Webhook
 * Test script to simulate a webhook request with a mock weather alert
 */
const mockData = require('./mockData');
const alertProcessor = require('./alertProcessor');
const { logger } = require('../../utils');

/**
 * Simulate a webhook request with a mock alert
 */
async function testMockAlert() {
  try {
    console.log('Simulating webhook request with mock weather alert...');
    
    // Generate a more severe mock alert
    const mockAlert = mockData.generateMockAlert({
      alertType: {
        event: 'Tornado Warning',
        severity: 'Extreme',
        urgency: 'Immediate'
      },
      // Generate alert near New York to match test users
      latitude: 40.7128,
      longitude: -74.0060
    });
    
    console.log(`Generated mock webhook alert: ${mockAlert.alert.id}`);
    console.log(`Event type: ${mockAlert.description[0].event}`);
    console.log(`Severity: ${mockAlert.severity}`);
    console.log(`Location: ${mockAlert.alert.geometry.coordinates[0][0][0]}, ${mockAlert.alert.geometry.coordinates[0][0][1]}`);
    
    // Process the mock alert as if it came from a webhook
    console.log('\nProcessing webhook alert...');
    const result = await alertProcessor.processAlert(mockAlert);
    
    console.log('\nWebhook alert processing result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Error in webhook test:', error);
    throw error;
  }
}

// Run the test
testMockAlert()
  .then(() => {
    console.log('\nWebhook test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nWebhook test failed:', error);
    process.exit(1);
  }); 