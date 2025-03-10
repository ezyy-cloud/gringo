/**
 * Weather Bot - Mock Database Adapter
 * Provides in-memory database functionality for testing
 */

// In-memory storage
const db = {
  alerts: new Map(),
  botConfig: new Map(),
  userPreferences: new Map()
};

/**
 * Save an alert to the database
 * @param {Object} alertData - The alert data to save
 * @returns {Promise<Object>} - The saved alert
 */
async function saveAlert(alertData) {
  try {
    // Create alertId from the alert.id if exists, otherwise generate one
    const alertId = alertData.alert?.id || `generated_${Date.now()}`;
    
    // Check if alert already exists
    const existingAlert = db.alerts.get(alertId);
    
    if (existingAlert) {
      // Update existing alert
      const updatedAlert = {
        ...existingAlert,
        rawData: alertData,
        alert: alertData.alert,
        msg_type: alertData.msg_type,
        categories: alertData.categories,
        urgency: alertData.urgency,
        severity: alertData.severity,
        certainty: alertData.certainty,
        start: alertData.start,
        end: alertData.end,
        sender: alertData.sender,
        description: alertData.description
      };
      
      db.alerts.set(alertId, updatedAlert);
      console.log(`Updated existing alert: ${alertId}`);
      return updatedAlert;
    } else {
      // Create new alert
      const newAlert = {
        alertId,
        rawData: alertData,
        alert: alertData.alert,
        msg_type: alertData.msg_type,
        categories: alertData.categories,
        urgency: alertData.urgency,
        severity: alertData.severity,
        certainty: alertData.certainty,
        start: alertData.start,
        end: alertData.end,
        sender: alertData.sender,
        description: alertData.description,
        processed: false,
        createdAt: new Date()
      };
      
      db.alerts.set(alertId, newAlert);
      console.log(`Saved new alert: ${alertId}`);
      return newAlert;
    }
  } catch (error) {
    console.error(`Error saving alert to mock database: ${error.message}`);
    throw error;
  }
}

/**
 * Get an alert by its ID
 * @param {string} alertId - The alert ID
 * @returns {Promise<Object|null>} - The alert or null if not found
 */
async function getAlertById(alertId) {
  try {
    return db.alerts.get(alertId) || null;
  } catch (error) {
    console.error(`Error getting alert ${alertId}: ${error.message}`);
    throw error;
  }
}

/**
 * Mark an alert as processed
 * @param {string} alertId - The alert ID
 * @param {string} status - Processing status
 * @returns {Promise<Object>} - The updated alert
 */
async function markAlertAsProcessed(alertId, status = 'processed') {
  try {
    const alert = db.alerts.get(alertId);
    
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    
    const updatedAlert = {
      ...alert,
      processed: true,
      processedAt: new Date(),
      processStatus: status
    };
    
    db.alerts.set(alertId, updatedAlert);
    console.log(`Marked alert ${alertId} as processed with status: ${status}`);
    return updatedAlert;
  } catch (error) {
    console.error(`Error marking alert ${alertId} as processed: ${error.message}`);
    throw error;
  }
}

/**
 * Get all active alerts (not expired)
 * @returns {Promise<Array>} - Array of active alerts
 */
async function getActiveAlerts() {
  try {
    const now = Math.floor(Date.now() / 1000); // Current time in Unix timestamp
    const activeAlerts = [];
    
    for (const alert of db.alerts.values()) {
      if (alert.end > now) {
        activeAlerts.push(alert);
      }
    }
    
    return activeAlerts.sort((a, b) => a.start - b.start);
  } catch (error) {
    console.error(`Error getting active alerts: ${error.message}`);
    throw error;
  }
}

/**
 * Get the bot configuration
 * @param {string} botId - The bot ID
 * @returns {Promise<Object|null>} - The bot configuration or null
 */
async function getBotConfiguration(botId = 'weatherBot') {
  try {
    let config = db.botConfig.get(botId);
    
    if (!config) {
      // Create default configuration
      config = {
        botId,
        minSeverity: 'Moderate',
        useCommonChannel: true,
        globalAlertDelivery: true,
        updatedAt: new Date()
      };
      db.botConfig.set(botId, config);
      console.log(`Created default configuration for bot: ${botId}`);
    }
    
    return config;
  } catch (error) {
    console.error(`Error getting bot configuration: ${error.message}`);
    throw error;
  }
}

/**
 * Update the bot configuration
 * @param {string} botId - The bot ID
 * @param {Object} config - The new configuration
 * @returns {Promise<Object>} - The updated configuration
 */
async function updateBotConfiguration(botId, config) {
  try {
    const updatedConfig = {
      ...config,
      botId,
      updatedAt: new Date()
    };
    
    db.botConfig.set(botId, updatedConfig);
    console.log(`Updated configuration for bot: ${botId}`);
    return updatedConfig;
  } catch (error) {
    console.error(`Error updating bot configuration: ${error.message}`);
    throw error;
  }
}

/**
 * Get users who have global alerts enabled
 * @returns {Promise<Array>} - Array of users
 */
async function getUsersWithGlobalAlerts() {
  try {
    const users = [];
    
    for (const user of db.userPreferences.values()) {
      if (user.receiveGlobalAlerts) {
        users.push(user);
      }
    }
    
    return users;
  } catch (error) {
    console.error(`Error getting users with global alerts: ${error.message}`);
    throw error;
  }
}

/**
 * Get all user locations for checking against alert geometries
 * @returns {Promise<Array>} - Array of user location objects
 */
async function getAllUserLocations() {
  try {
    const users = [];
    
    for (const user of db.userPreferences.values()) {
      if (user.location && user.location.latitude && user.location.longitude) {
        users.push({
          userId: user.userId,
          location: user.location,
          preferences: {
            minSeverity: user.minSeverity,
            alertTypes: user.alertTypes,
            mutedSenders: user.mutedSenders
          }
        });
      }
    }
    
    // Add a few sample users for testing
    if (users.length === 0) {
      // New York
      users.push({
        userId: 'test-user-1',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          name: 'New York'
        },
        preferences: {
          minSeverity: 'Moderate',
          alertTypes: [],
          mutedSenders: []
        }
      });
      
      // Los Angeles
      users.push({
        userId: 'test-user-2',
        location: {
          latitude: 34.0522,
          longitude: -118.2437,
          name: 'Los Angeles'
        },
        preferences: {
          minSeverity: 'Minor',
          alertTypes: [],
          mutedSenders: []
        }
      });
    }
    
    return users;
  } catch (error) {
    console.error(`Error getting all user locations: ${error.message}`);
    throw error;
  }
}

/**
 * Update or create user preferences
 * @param {string} userId - The user ID
 * @param {Object} preferences - The user preferences
 * @returns {Promise<Object>} - The updated preferences
 */
async function updateUserPreferences(userId, preferences) {
  try {
    const updatedPreferences = {
      ...preferences,
      userId,
      updatedAt: new Date()
    };
    
    db.userPreferences.set(userId, updatedPreferences);
    console.log(`Updated preferences for user: ${userId}`);
    return updatedPreferences;
  } catch (error) {
    console.error(`Error updating user preferences: ${error.message}`);
    throw error;
  }
}

module.exports = {
  saveAlert,
  getAlertById,
  markAlertAsProcessed,
  getActiveAlerts,
  getBotConfiguration,
  updateBotConfiguration,
  getUsersWithGlobalAlerts,
  getAllUserLocations,
  updateUserPreferences
}; 