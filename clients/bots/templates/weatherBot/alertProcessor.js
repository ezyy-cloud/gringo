/**
 * Weather Bot - Alert Processor
 * Processes incoming weather alerts
 */
const alertFormatter = require('./alertFormatter');
const alertPublisher = require('./alertPublisher');
const geoUtils = require('./geoUtils');
const { logger } = require('../../utils');

// In-memory storage of processed alert IDs to prevent duplicates
const processedAlerts = new Set();

// Default minimum severity threshold
const DEFAULT_MIN_SEVERITY = 'Moderate';

// Severity levels for comparison
const SEVERITY_LEVELS = {
  'Extreme': 4,
  'Severe': 3,
  'Moderate': 2,
  'Minor': 1,
  'Unknown': 0
};

/**
 * Process an incoming weather alert from webhook
 * @param {Object} alertData - The alert data from webhook
 * @param {Object} bot - The bot instance
 * @returns {Promise<Object>} - Result of processing
 */
async function processAlert(alertData, bot = null) {
  try {
    // Validate alert data
    if (!alertData || !alertData.alert || !alertData.alert.id) {
      throw new Error('Invalid alert data: missing required fields');
    }
    
    const alertId = alertData.alert.id;
    logger.info(`Processing alert: ${alertId}`);
    logger.info(`With bot: ${bot ? bot.username : 'No bot instance provided'}`);
    
    // Check if we have a valid bot instance
    if (!bot) {
      logger.error('No bot instance provided for processing alert. This is required for publishing.');
      return { 
        success: false, 
        status: 'failed',
        error: 'No bot instance provided for processing alert'
      };
    }
    
    // Check if this alert has already been processed
    if (processedAlerts.has(alertId)) {
      logger.info(`Alert ${alertId} already processed, skipping`);
      return { success: true, status: 'already_processed' };
    }
    
    // Extract alert metadata
    const { 
      severity
    } = alertData;
    
    // Check severity threshold
    if (!meetsSeverityThreshold(severity, DEFAULT_MIN_SEVERITY)) {
      logger.info(`Alert ${alertId} below severity threshold (${severity}), skipping`);
      return { success: true, status: 'skipped_severity' };
    }
    
    // Format alert for publishing
    const formattedAlert = alertFormatter.formatAlertForPosting(alertData);
    
    // Publish the alert
    try {
      // In a real implementation, you'd target users by location
      // For this example, we'll just publish to a common channel
      logger.info(`Publishing alert with bot: ${bot.username}`);
      
      // Ensure the bot is authenticated
      if (!bot.authToken && typeof bot.authenticate === 'function') {
        logger.info('Bot not authenticated, authenticating before publishing...');
        await bot.authenticate();
      }
      
      const publishResult = await alertPublisher.publishAlertToChannel(formattedAlert, bot);
      
      // Check if publishing was successful
      if (!publishResult.success) {
        logger.error(`Failed to publish alert: ${publishResult.error}`);
        return {
          success: false,
          status: 'publish_failed',
          error: publishResult.error
        };
      }
      
      // Mark as processed in memory
      processedAlerts.add(alertId);
      
      return {
        success: true,
        status: 'published',
        alertId,
        message: 'Alert published successfully'
      };
    } catch (error) {
      logger.error(`Error publishing alert ${alertId}:`, error);
      throw error;
    }
  } catch (error) {
    logger.error(`Error processing alert: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Check if alert severity meets threshold
 * @param {string} alertSeverity - The severity of the alert
 * @param {string} minSeverity - Minimum severity threshold
 * @returns {boolean} - Whether the alert meets the threshold
 */
function meetsSeverityThreshold(alertSeverity, minSeverity) {
  const alertLevel = SEVERITY_LEVELS[alertSeverity] || 0;
  const thresholdLevel = SEVERITY_LEVELS[minSeverity] || 0;
  
  return alertLevel >= thresholdLevel;
}

/**
 * Process a batch of alerts (for scheduled runs)
 * @param {Array} alerts - Array of alert data objects
 * @returns {Promise<Object>} - Processing results
 */
async function processBatchAlerts(alerts) {
  if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
    return { success: true, processed: 0, total: 0 };
  }
  
  let processed = 0;
  let failed = 0;
  
  for (const alertData of alerts) {
    try {
      const result = await processAlert(alertData);
      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    } catch (error) {
      logger.error(`Error processing alert in batch: ${error.message}`);
      failed++;
    }
  }
  
  return {
    success: true,
    processed,
    failed,
    total: alerts.length
  };
}

module.exports = {
  processAlert,
  processBatchAlerts,
  meetsSeverityThreshold
}; 